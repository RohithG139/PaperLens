"""
User management routes for PaperLens AI.

  GET    /users/{user_id}/history                          -> search history
  GET    /users/{user_id}/saved-papers                     -> saved papers
  POST   /users/{user_id}/save-paper                       -> save a paper
  DELETE /users/{user_id}/saved-papers/{paper_id}          -> remove saved paper
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from agents.researcher import ResearcherAgent
from database.mongodb import get_db
from models.paper import Paper
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["users"])

_researcher = ResearcherAgent()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _assert_own_resource(current_user: dict, user_id: str) -> None:
    """
    Raise 403 if the authenticated user is trying to access another user's data.
    """
    if current_user["userId"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own data.",
        )


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class HistoryEntry(BaseModel):
    id: str
    query: str
    searchedAt: datetime


class HistoryResponse(BaseModel):
    userId: str
    total: int
    entries: list[HistoryEntry]


class StatsResponse(BaseModel):
    totalSearches: int
    savedPapers: int
    comparisons: int


class SavePaperRequest(BaseModel):
    paperId: str = Field(..., min_length=1)


class SavedPaperEntry(BaseModel):
    paperId: str
    title: str
    year: Optional[int] = None
    savedAt: datetime


class SavedPapersResponse(BaseModel):
    userId: str
    total: int
    papers: list[SavedPaperEntry]


class SavePaperResponse(BaseModel):
    message: str
    paperId: str
    savedAt: datetime


class RemovePaperResponse(BaseModel):
    message: str
    paperId: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get(
    "/{user_id}/history",
    response_model=HistoryResponse,
    summary="Get user search history",
)
async def get_search_history(
    user_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
) -> HistoryResponse:
    """
    Return the paginated search history for *user_id*.

    History is stored on the user document (last 100 entries) and also in a
    dedicated search_history collection for richer query support.  This route
    reads from the dedicated collection so pagination works correctly.
    """
    _assert_own_resource(current_user, user_id)

    db = await get_db()

    total = await db["search_history"].count_documents({"userId": user_id})

    cursor = (
        db["search_history"]
        .find({"userId": user_id}, {"query": 1, "searchedAt": 1})
        .sort("searchedAt", -1)
        .skip(offset)
        .limit(limit)
    )

    raw_entries = await cursor.to_list(length=limit)

    entries = [
        HistoryEntry(
            id=str(e["_id"]),
            query=e["query"],
            searchedAt=e["searchedAt"],
        )
        for e in raw_entries
    ]

    return HistoryResponse(
        userId=user_id,
        total=total,
        entries=entries,
    )


@router.get(
    "/{user_id}/saved-papers",
    response_model=SavedPapersResponse,
    summary="Get saved papers for a user",
)
async def get_saved_papers(
    user_id: str,
    current_user: dict = Depends(get_current_user),
) -> SavedPapersResponse:
    """
    Return all papers saved by *user_id*, sorted newest-first.
    Saved paper records are embedded inside the user document for fast access.
    """
    _assert_own_resource(current_user, user_id)

    db = await get_db()
    user = await db["users"].find_one({"userId": user_id}, {"savedPapers": 1})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{user_id}' not found.",
        )

    raw_saved: list[dict[str, Any]] = user.get("savedPapers", [])
    # Sort newest first
    raw_saved.sort(key=lambda x: x.get("savedAt", datetime.min), reverse=True)

    papers = [
        SavedPaperEntry(
            paperId=entry["paperId"],
            title=entry.get("title", "Unknown title"),
            year=entry.get("year"),
            savedAt=entry["savedAt"],
        )
        for entry in raw_saved
    ]

    return SavedPapersResponse(
        userId=user_id,
        total=len(papers),
        papers=papers,
    )


@router.post(
    "/{user_id}/save-paper",
    response_model=SavePaperResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a paper to user's collection",
)
async def save_paper(
    user_id: str,
    body: SavePaperRequest,
    current_user: dict = Depends(get_current_user),
) -> SavePaperResponse:
    """
    Add a paper to the user's saved-papers list.

    - Verifies the paper exists on Semantic Scholar before saving.
    - Silently ignores duplicate saves (idempotent).
    - Stores minimal metadata (title, year) alongside the ID so the list
      can be rendered without additional API calls.
    """
    _assert_own_resource(current_user, user_id)

    db = await get_db()

    # Check the user exists
    user = await db["users"].find_one({"userId": user_id}, {"savedPapers": 1})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{user_id}' not found.",
        )

    # Guard against duplicates
    already_saved = any(
        entry["paperId"] == body.paperId
        for entry in user.get("savedPapers", [])
    )
    if already_saved:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Paper '{body.paperId}' is already in your saved list.",
        )

    # Verify paper exists upstream
    try:
        paper: Paper = await _researcher.get_paper_details(body.paperId)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Paper '{body.paperId}' was not found on Semantic Scholar.",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream API error while verifying paper: {exc.response.status_code}",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Timed out while verifying paper with Semantic Scholar.",
        )

    saved_at = datetime.now(timezone.utc)
    saved_entry: dict[str, Any] = {
        "paperId": paper.paperId,
        "title": paper.title,
        "year": paper.year,
        "savedAt": saved_at,
    }

    await db["users"].update_one(
        {"userId": user_id},
        {"$push": {"savedPapers": saved_entry}},
    )

    logger.info("User %s saved paper %s.", user_id, body.paperId)

    return SavePaperResponse(
        message="Paper saved successfully.",
        paperId=paper.paperId,
        savedAt=saved_at,
    )


@router.delete(
    "/{user_id}/saved-papers/{paper_id}",
    response_model=RemovePaperResponse,
    summary="Remove a saved paper from user's collection",
)
async def remove_saved_paper(
    user_id: str,
    paper_id: str,
    current_user: dict = Depends(get_current_user),
) -> RemovePaperResponse:
    """
    Remove a paper from the user's saved-papers list by its *paper_id*.
    Returns 404 if the paper was not in the list.
    """
    _assert_own_resource(current_user, user_id)

    db = await get_db()

    user = await db["users"].find_one({"userId": user_id}, {"savedPapers": 1})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{user_id}' not found.",
        )

    saved_ids = [entry["paperId"] for entry in user.get("savedPapers", [])]
    if paper_id not in saved_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper '{paper_id}' is not in your saved list.",
        )

    result = await db["users"].update_one(
        {"userId": user_id},
        {"$pull": {"savedPapers": {"paperId": paper_id}}},
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove paper. Please try again.",
        )

    logger.info("User %s removed saved paper %s.", user_id, paper_id)

    return RemovePaperResponse(
        message="Paper removed from your saved list.",
        paperId=paper_id,
    )


@router.get(
    "/{user_id}/stats",
    response_model=StatsResponse,
    summary="Get user activity stats",
)
async def get_user_stats(
    user_id: str,
    current_user: dict = Depends(get_current_user),
) -> StatsResponse:
    _assert_own_resource(current_user, user_id)

    db = await get_db()

    total_searches = await db["search_history"].count_documents({"userId": user_id})

    user = await db["users"].find_one({"userId": user_id}, {"savedPapers": 1})
    saved_count = len(user.get("savedPapers", [])) if user else 0

    comparisons = await db["executions"].count_documents(
        {"userId": user_id, "type": "compare"}
    )

    return StatsResponse(
        totalSearches=total_searches,
        savedPapers=saved_count,
        comparisons=comparisons,
    )


@router.delete(
    "/{user_id}/history/{entry_id}",
    summary="Delete a search history entry",
)
async def delete_history_entry(
    user_id: str,
    entry_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    _assert_own_resource(current_user, user_id)

    try:
        oid = ObjectId(entry_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid entry ID format.",
        )

    db = await get_db()
    result = await db["search_history"].delete_one({"_id": oid, "userId": user_id})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History entry not found.",
        )

    logger.info("User %s deleted history entry %s.", user_id, entry_id)
    return {"message": "History entry deleted.", "entryId": entry_id}
