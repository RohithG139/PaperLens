"""
Agent orchestration routes for PaperLens AI.

  POST /agents/run                     -> run LangGraph workflow, return result
  GET  /agents/execution/{exec_id}     -> poll execution status
  POST /agents/compare                 -> compare a set of papers
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, AsyncIterator, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agents.researcher import ResearcherAgent
from database.mongodb import get_db
from models.paper import ComparisonResult, Paper
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["agents"])

_researcher = ResearcherAgent()


# ---------------------------------------------------------------------------
# Execution status enum
# ---------------------------------------------------------------------------

class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class RunRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    userId: Optional[str] = None
    question: Optional[str] = None
    stream: bool = Field(
        default=False,
        description="If true, progress events are streamed as SSE; otherwise a single JSON result is returned.",
    )


class RunResponse(BaseModel):
    execution_id: str
    status: ExecutionStatus
    query: str
    papers: list[Paper] = []
    answer: Optional[str] = None
    completedAt: Optional[datetime] = None
    error: Optional[str] = None


class CompareRequest(BaseModel):
    paper_ids: list[str] = Field(..., min_length=2, max_length=10)


# ---------------------------------------------------------------------------
# Core workflow logic
# ---------------------------------------------------------------------------

async def _run_research_workflow(
    execution_id: str,
    query: str,
    question: Optional[str],
    user_id: Optional[str],
) -> dict[str, Any]:
    """
    Execute the main research workflow:
      1. Search papers via ResearcherAgent.
      2. If a follow-up question is provided, synthesize a brief answer from
         abstracts using a simple extractive approach (placeholder for a full
         LangGraph graph that wires in Gemini + RAG retrieval).
      3. Persist the execution record in MongoDB.
      4. Return the execution document.

    When a full LangGraph graph is wired in, replace the body of this function
    with graph.ainvoke(...) and stream intermediate events via the SSE route.
    """
    db = await get_db()
    now = datetime.now(timezone.utc)

    # Mark execution as running
    await db["executions"].update_one(
        {"executionId": execution_id},
        {"$set": {"status": ExecutionStatus.RUNNING, "startedAt": now}},
    )

    try:
        papers = await _researcher.search_papers(query=query, max_results=10)
    except (httpx.HTTPStatusError, httpx.TimeoutException, httpx.RequestError) as exc:
        error_msg = f"Paper search failed: {exc}"
        logger.error("Execution %s failed: %s", execution_id, error_msg)
        await db["executions"].update_one(
            {"executionId": execution_id},
            {
                "$set": {
                    "status": ExecutionStatus.FAILED,
                    "error": error_msg,
                    "completedAt": datetime.now(timezone.utc),
                }
            },
        )
        raise

    # Simple answer synthesis from top-3 abstracts when a question is given
    answer: Optional[str] = None
    if question and papers:
        top_papers = papers[:3]
        context_parts = [
            f"[{p.title} ({p.year})]: {p.abstract}"
            for p in top_papers
            if p.abstract
        ]
        if context_parts:
            # Placeholder: replace with Gemini call when LangGraph is wired in
            answer = (
                f"Based on the top results for '{query}': "
                + " | ".join(context_parts[:2])[:800]
                + " (Detailed synthesis coming — connect LangGraph + Gemini.)"
            )

    completed_at = datetime.now(timezone.utc)
    paper_dicts = [p.model_dump() for p in papers]

    update_doc: dict[str, Any] = {
        "status": ExecutionStatus.COMPLETED,
        "papers": paper_dicts,
        "answer": answer,
        "completedAt": completed_at,
    }

    await db["executions"].update_one(
        {"executionId": execution_id},
        {"$set": update_doc},
    )

    return {
        "executionId": execution_id,
        "status": ExecutionStatus.COMPLETED,
        "query": query,
        "papers": paper_dicts,
        "answer": answer,
        "completedAt": completed_at,
    }


async def _sse_stream(
    execution_id: str,
    query: str,
    question: Optional[str],
    user_id: Optional[str],
) -> AsyncIterator[str]:
    """
    Yield Server-Sent Events while the workflow runs.  Intermediate progress
    events are emitted; a final 'done' event carries the full result.
    """

    def _event(name: str, data: str) -> str:
        return f"event: {name}\ndata: {data}\n\n"

    import json

    yield _event("start", json.dumps({"executionId": execution_id, "query": query}))
    yield _event("progress", json.dumps({"step": "searching", "message": "Searching Semantic Scholar..."}))

    try:
        result = await _run_research_workflow(
            execution_id=execution_id,
            query=query,
            question=question,
            user_id=user_id,
        )
        yield _event("progress", json.dumps({"step": "done", "message": f"{result['papers'].__len__()} papers found."}))
        # Omit full paper payloads from SSE body to keep event sizes small;
        # client polls GET /execution/{id} for full data.
        yield _event(
            "done",
            json.dumps({
                "executionId": execution_id,
                "status": ExecutionStatus.COMPLETED,
                "total": len(result["papers"]),
                "answer": result.get("answer"),
            }),
        )
    except Exception as exc:  # noqa: BLE001
        import json as _json
        yield _event("error", _json.dumps({"executionId": execution_id, "error": str(exc)}))


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post(
    "/run",
    summary="Run the LangGraph research workflow",
)
async def run_agent(
    body: RunRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Kick off the research workflow for a *query*.  When body.stream is true,
    returns an SSE stream of progress events.  Otherwise returns a single
    JSON RunResponse once the workflow completes.

    The *userId* in the request body is informational; the authenticated user
    from the JWT always takes precedence for ownership.
    """
    execution_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    user_id = current_user["userId"]

    # Create the execution record before launching so polling works immediately
    db = await get_db()
    await db["executions"].insert_one({
        "executionId": execution_id,
        "userId": user_id,
        "query": body.query,
        "question": body.question,
        "status": ExecutionStatus.PENDING,
        "createdAt": now,
        "papers": [],
        "answer": None,
        "error": None,
    })

    if body.stream:
        return StreamingResponse(
            _sse_stream(
                execution_id=execution_id,
                query=body.query,
                question=body.question,
                user_id=user_id,
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    # Non-streaming: await the workflow and return the result synchronously
    try:
        result = await _run_research_workflow(
            execution_id=execution_id,
            query=body.query,
            question=body.question,
            user_id=user_id,
        )
    except (httpx.HTTPStatusError, httpx.TimeoutException, httpx.RequestError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Research workflow failed: {exc}",
        )

    return RunResponse(
        execution_id=execution_id,
        status=ExecutionStatus.COMPLETED,
        query=body.query,
        papers=[Paper(**p) for p in result["papers"]],
        answer=result.get("answer"),
        completedAt=result.get("completedAt"),
    )


@router.get(
    "/execution/{execution_id}",
    response_model=RunResponse,
    summary="Poll agent execution status",
)
async def get_execution(
    execution_id: str,
    current_user: dict = Depends(get_current_user),
) -> RunResponse:
    """
    Return the current status and results of an agent execution.
    Only the owning user can retrieve their execution.
    """
    db = await get_db()
    doc = await db["executions"].find_one({"executionId": execution_id})

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Execution '{execution_id}' not found.",
        )

    if doc["userId"] != current_user["userId"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this execution.",
        )

    papers = [Paper(**p) for p in doc.get("papers", [])]

    return RunResponse(
        execution_id=execution_id,
        status=doc["status"],
        query=doc["query"],
        papers=papers,
        answer=doc.get("answer"),
        completedAt=doc.get("completedAt"),
        error=doc.get("error"),
    )


@router.post(
    "/compare",
    response_model=ComparisonResult,
    summary="Compare a list of papers",
)
async def compare_papers(
    body: CompareRequest,
    current_user: dict = Depends(get_current_user),
) -> ComparisonResult:
    """
    Fetch each paper by ID, then produce a structured comparison:
    - A comparison table keyed by dimension (methodology, year, citations, field)
    - Shared themes (similarities)
    - Distinguishing characteristics (differences)
    - A brief recommendation

    The comparison logic here is deterministic and heuristic-based.
    Wire in a Gemini call for richer natural-language synthesis.
    """
    if len(body.paper_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least two paper IDs are required for comparison.",
        )

    # Fetch all papers concurrently
    async def _fetch(pid: str) -> Optional[Paper]:
        try:
            return await _researcher.get_paper_details(pid)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                logger.warning("Paper %s not found during comparison.", pid)
                return None
            raise

    tasks = [asyncio.create_task(_fetch(pid)) for pid in body.paper_ids]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    papers: list[Paper] = []
    for paper_id, result in zip(body.paper_ids, results):
        if isinstance(result, Exception):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to fetch paper '{paper_id}': {result}",
            )
        if result is not None:
            papers.append(result)

    if len(papers) < 2:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="At least two valid papers are required for comparison.",
        )

    # Build comparison table
    comparison_table: dict[str, Any] = {
        p.paperId: {
            "title": p.title,
            "year": p.year,
            "citations": p.citationCount,
            "fields": p.fieldsOfStudy,
            "authors": [a.name for a in p.authors[:3]],
            "relevanceScore": p.relevanceScore,
        }
        for p in papers
    }

    # Similarities: shared fields of study
    field_sets = [set(p.fieldsOfStudy) for p in papers]
    shared_fields = set.intersection(*field_sets) if field_sets else set()
    similarities: list[str] = (
        [f"All papers belong to the field(s): {', '.join(sorted(shared_fields))}"]
        if shared_fields
        else ["No overlapping fields of study detected across the selected papers."]
    )

    # Differences: year spread and citation variance
    years = [p.year for p in papers if p.year]
    citations = [p.citationCount for p in papers]

    differences: list[str] = []
    if years:
        differences.append(
            f"Publication years range from {min(years)} to {max(years)} "
            f"({max(years) - min(years)} year span)."
        )
    if citations:
        differences.append(
            f"Citation counts vary significantly: "
            f"min {min(citations)}, max {max(citations)}, "
            f"suggesting differing levels of community impact."
        )

    # Recommend the paper with the highest relevance score
    best = max(papers, key=lambda p: p.relevanceScore)
    recommendation = (
        f"'{best.title}' ({best.year}) ranks highest on the combined relevance "
        f"score ({best.relevanceScore:.3f}), driven by its citation count of "
        f"{best.citationCount}. Consider this as the primary reference."
    )

    return ComparisonResult(
        papers=papers,
        comparisonTable=comparison_table,
        similarities=similarities,
        differences=differences,
        recommendation=recommendation,
    )
