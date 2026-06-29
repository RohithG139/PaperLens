"""
Paper routes for PaperLens AI.

  POST /papers/search      -> run ResearcherAgent, persist result, return papers
  GET  /papers/{paper_id}  -> fetch single paper details from Semantic Scholar
  POST /papers/index       -> background-task: embed and upsert papers into Pinecone
  GET  /papers/trending    -> return trending research topics
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from agents.researcher import ResearcherAgent
from agents.summarizer import SummarizerAgent
from database.mongodb import get_db
from database.pinecone_client import upsert_vectors
from models.paper import Paper, SearchQuery, SearchResult
from rag.chunker import DocumentChunker
from rag.embeddings import get_embedding_service
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["papers"])

_researcher = ResearcherAgent()
_summarizer = SummarizerAgent()
_chunker = DocumentChunker()


# ---------------------------------------------------------------------------
# Trending topics — sourced from a curated list; can be swapped for DB
# aggregation of recent queries once volume grows.
# ---------------------------------------------------------------------------

TRENDING_TOPICS: list[dict[str, Any]] = [
    {"topic": "Large language model reasoning", "tag": "LLMs", "growth": "high"},
    {"topic": "Diffusion models for image synthesis", "tag": "Generative AI", "growth": "high"},
    {"topic": "Retrieval-augmented generation", "tag": "RAG", "growth": "high"},
    {"topic": "Graph neural networks for drug discovery", "tag": "BioML", "growth": "medium"},
    {"topic": "Mechanistic interpretability of transformers", "tag": "Interpretability", "growth": "medium"},
    {"topic": "Reinforcement learning from human feedback", "tag": "RLHF", "growth": "medium"},
    {"topic": "Protein structure prediction", "tag": "Bioinformatics", "growth": "medium"},
    {"topic": "Federated learning privacy", "tag": "Privacy", "growth": "low"},
    {"topic": "Quantum machine learning", "tag": "Quantum", "growth": "low"},
    {"topic": "Multimodal vision-language models", "tag": "Multimodal", "growth": "high"},
]


# ---------------------------------------------------------------------------
# Background task: embed and index papers into Pinecone
# ---------------------------------------------------------------------------

async def _index_papers_task(paper_ids: list[str]) -> None:
    """
    For each paper ID:
      1. Fetch details from Semantic Scholar.
      2. Chunk the abstract + title via DocumentChunker.
      3. Embed each chunk with EmbeddingService.
      4. Upsert vectors into Pinecone.
    Papers that fail individually are logged and skipped so one bad ID does
    not abort the whole batch.
    """
    embedding_service = get_embedding_service()

    for paper_id in paper_ids:
        try:
            paper: Paper = await _researcher.get_paper_details(paper_id)
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            logger.warning("Could not fetch paper %s for indexing: %s", paper_id, exc)
            continue

        chunks = _chunker.chunk_paper(paper)
        if not chunks:
            logger.warning("No chunks produced for paper %s — skipping.", paper_id)
            continue

        texts = [c["text"] for c in chunks]
        try:
            embeddings = embedding_service.get_embeddings(texts)
        except (RuntimeError, ValueError) as exc:
            logger.warning("Embedding failed for paper %s: %s", paper_id, exc)
            continue

        vectors = [
            {
                "id": chunk["id"],
                "values": embedding,
                "metadata": chunk["metadata"],
            }
            for chunk, embedding in zip(chunks, embeddings)
        ]

        try:
            await upsert_vectors(vectors)
            logger.info("Indexed %d chunks for paper %s.", len(vectors), paper_id)
        except Exception as exc:  # noqa: BLE001
            logger.error("Pinecone upsert failed for paper %s: %s", paper_id, exc)


# ---------------------------------------------------------------------------
# Request / response schemas for this router
# ---------------------------------------------------------------------------

from pydantic import BaseModel, Field  # noqa: E402  (after stdlib imports for clarity)


class IndexRequest(BaseModel):
    paper_ids: list[str] = Field(..., min_length=1, max_length=100)


class IndexResponse(BaseModel):
    message: str
    queued: int


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post(
    "/search",
    response_model=SearchResult,
    summary="Search academic papers and persist results",
)
async def search_papers(
    body: SearchQuery,
    current_user: dict = Depends(get_current_user),
) -> SearchResult:
    """
    Run a paper search via ResearcherAgent (Semantic Scholar), persist the
    search event to MongoDB for history tracking, and return the results.
    """
    logger.info("User %s searching: %r", current_user["userId"], body.query)

    try:
        papers = await _researcher.search_papers(
            query=body.query,
            max_results=body.max_results,
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The search request timed out. Please try again.",
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream API error: {exc.response.status_code}",
        )

    now = datetime.now(timezone.utc)
    result = SearchResult(
        query=body.query,
        papers=papers,
        total=len(papers),
        searchedAt=now,
    )

    # Persist search history entry
    db = await get_db()
    history_doc = {
        "userId": current_user["userId"],
        "query": body.query,
        "total": result.total,
        "paperIds": [p.paperId for p in papers],
        "searchedAt": now,
    }
    await db["search_history"].insert_one(history_doc)

    # Append a lightweight reference to the user's searchHistory array
    await db["users"].update_one(
        {"userId": current_user["userId"]},
        {
            "$push": {
                "searchHistory": {
                    "$each": [{"query": body.query, "searchedAt": now}],
                    "$slice": -100,  # keep last 100 searches
                }
            }
        },
    )

    logger.info(
        "Search complete: %d papers returned for %r", result.total, body.query
    )
    return result


@router.get(
    "/trending",
    summary="Return trending research topics",
)
async def get_trending() -> list[dict[str, Any]]:
    """
    Return a curated list of trending research topics.  In a production
    deployment this can be replaced with a MongoDB aggregation over recent
    search_history documents.
    """
    return TRENDING_TOPICS


@router.post(
    "/index",
    response_model=IndexResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Index papers into Pinecone RAG (background task)",
)
async def index_papers(
    body: IndexRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
) -> IndexResponse:
    """
    Accepts a list of Semantic Scholar paper IDs and queues them for
    background embedding + Pinecone upsert.  Returns immediately with 202.
    """
    logger.info(
        "User %s queued %d papers for indexing.",
        current_user["userId"],
        len(body.paper_ids),
    )
    background_tasks.add_task(_index_papers_task, body.paper_ids)
    return IndexResponse(
        message="Indexing started in the background.",
        queued=len(body.paper_ids),
    )


@router.get(
    "/{paper_id}/summary",
    summary="Generate AI summary for a paper",
)
async def get_paper_summary(paper_id: str) -> dict:
    """
    Fetch paper details then use SummarizerAgent (Gemini) to produce a
    structured five-section summary.  Returns keys: problem, methodology,
    results, advantages, limitations.
    """
    try:
        paper = await _researcher.get_paper_details(paper_id)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Paper '{paper_id}' not found.",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream error: {exc.response.status_code}",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Request to Semantic Scholar timed out.",
        )

    summary = await _summarizer.summarize_paper(paper)
    return {
        "problem": summary.problemStatement,
        "methodology": summary.methodology,
        "results": summary.results,
        "advantages": summary.advantages,
        "limitations": summary.limitations,
    }


@router.get(
    "/{paper_id}",
    response_model=Paper,
    summary="Get paper details by Semantic Scholar ID",
)
async def get_paper(paper_id: str) -> Paper:
    """
    Fetch full paper details from Semantic Scholar for a given *paper_id*.
    No authentication required — paper lookups are public.
    """
    try:
        paper = await _researcher.get_paper_details(paper_id)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Paper '{paper_id}' not found.",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream API error: {exc.response.status_code}",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Request to Semantic Scholar timed out.",
        )

    return paper
