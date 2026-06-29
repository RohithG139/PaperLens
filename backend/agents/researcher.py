from __future__ import annotations

import asyncio
import logging
import math
import time
from typing import Optional

import httpx

from config import settings
from models.paper import Author, Paper

logger = logging.getLogger(__name__)

SEMANTIC_SCHOLAR_BASE_URL = "https://api.semanticscholar.org/graph/v1"
PAPER_FIELDS = (
    "paperId,title,abstract,authors,year,citationCount,referenceCount,"
    "fieldsOfStudy,url"
)
_RETRY_DELAYS = (1.0, 2.0, 4.0)  # seconds between retries on 429

_REQUEST_LOCK = asyncio.Lock()
_last_request_time: float = 0.0
_MIN_REQUEST_INTERVAL = 1.2  # seconds; stays under public 1 req/sec limit


async def _rate_limit() -> None:
    global _last_request_time
    async with _REQUEST_LOCK:
        now = time.monotonic()
        wait = _MIN_REQUEST_INTERVAL - (now - _last_request_time)
        if wait > 0:
            await asyncio.sleep(wait)
        _last_request_time = time.monotonic()


async def _get_with_retry(
    client: httpx.AsyncClient,
    url: str,
    params: dict,
    headers: dict,
) -> httpx.Response:
    await _rate_limit()
    for attempt, wait in enumerate((*_RETRY_DELAYS, None)):
        response = await client.get(url, params=params, headers=headers)
        if response.status_code != 429:
            response.raise_for_status()
            return response
        if wait is None:
            response.raise_for_status()
        logger.warning(
            "Semantic Scholar rate-limited (429). Retrying in %.0fs (attempt %d/%d).",
            wait,
            attempt + 1,
            len(_RETRY_DELAYS),
        )
        await asyncio.sleep(wait)
    response.raise_for_status()  # unreachable but satisfies type checkers
    return response


def _build_headers() -> dict[str, str]:
    headers: dict[str, str] = {"Accept": "application/json"}
    if settings.SEMANTIC_SCHOLAR_API_KEY:
        headers["x-api-key"] = settings.SEMANTIC_SCHOLAR_API_KEY
    return headers


def _map_paper(data: dict, relevance_score: float = 0.0) -> Paper:
    authors = [
        Author(name=a.get("name", ""), authorId=a.get("authorId"))
        for a in data.get("authors", [])
    ]
    fields_of_study: list[str] = []
    raw_fields = data.get("fieldsOfStudy")
    if isinstance(raw_fields, list):
        for item in raw_fields:
            if isinstance(item, str):
                fields_of_study.append(item)
            elif isinstance(item, dict):
                category = item.get("category") or item.get("name") or ""
                if category:
                    fields_of_study.append(category)

    return Paper(
        paperId=data.get("paperId", ""),
        title=data.get("title") or "",
        abstract=data.get("abstract"),
        authors=authors,
        year=data.get("year"),
        citationCount=data.get("citationCount") or 0,
        referenceCount=data.get("referenceCount") or 0,
        fieldsOfStudy=fields_of_study,
        url=data.get("url"),
        relevanceScore=relevance_score,
    )


def _compute_relevance(citation_count: int, position: int, max_citation: int) -> float:
    """
    Combine a normalized citation score (0-1) with a position-based decay.
    Position weight: earlier results rank higher (inverse log scale).
    Final score is a weighted average: 60% citation, 40% position.
    """
    if max_citation > 0:
        citation_score = math.log1p(citation_count) / math.log1p(max_citation)
    else:
        citation_score = 0.0

    # position starts at 0; use inverse decay so position 0 = 1.0
    position_score = 1.0 / (1.0 + position)

    return round(0.6 * citation_score + 0.4 * position_score, 6)


class ResearcherAgent:
    """Wraps the Semantic Scholar API for paper search and retrieval."""

    def __init__(self, timeout: float = 30.0) -> None:
        self._timeout = timeout
        self._headers = _build_headers()

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def search_papers(
        self, query: str, max_results: int = 10
    ) -> list[Paper]:
        """
        Search Semantic Scholar for papers matching *query*.

        Returns up to *max_results* Paper objects sorted by relevance score
        (descending).  Relevance is a weighted mix of normalised citation count
        and result-list position returned by the API.
        """
        logger.info("Searching Semantic Scholar: query=%r max_results=%d", query, max_results)

        # Request extra results for re-ranking, but stay conservative to avoid rate limits.
        fetch_limit = min(max(max_results * 2, 15), 50)

        params = {
            "query": query,
            "fields": PAPER_FIELDS,
            "limit": fetch_limit,
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await _get_with_retry(
                    client,
                    f"{SEMANTIC_SCHOLAR_BASE_URL}/paper/search",
                    params=params,
                    headers=self._headers,
                )
        except httpx.TimeoutException:
            logger.error("Semantic Scholar request timed out for query=%r", query)
            raise
        except httpx.HTTPStatusError as exc:
            logger.error(
                "Semantic Scholar returned HTTP %d for query=%r: %s",
                exc.response.status_code,
                query,
                exc.response.text[:500],
            )
            raise
        except httpx.RequestError as exc:
            logger.error("Network error contacting Semantic Scholar: %s", exc)
            raise

        payload = response.json()
        raw_papers: list[dict] = payload.get("data", [])

        if not raw_papers:
            logger.warning("No papers returned for query=%r", query)
            return []

        # Determine max citation count for normalisation across the batch.
        max_citation = max((p.get("citationCount") or 0 for p in raw_papers), default=0)

        papers: list[Paper] = []
        for position, raw in enumerate(raw_papers):
            score = _compute_relevance(
                citation_count=raw.get("citationCount") or 0,
                position=position,
                max_citation=max_citation,
            )
            paper = _map_paper(raw, relevance_score=score)
            papers.append(paper)

        papers.sort(key=lambda p: p.relevanceScore, reverse=True)
        result = papers[:max_results]

        logger.info(
            "search_papers returning %d papers (fetched %d) for query=%r",
            len(result),
            len(raw_papers),
            query,
        )
        return result

    async def get_paper_details(self, paper_id: str) -> Paper:
        """
        Fetch full details for a single paper by its Semantic Scholar *paper_id*.

        Raises httpx.HTTPStatusError for 4xx/5xx responses (e.g. 404 not found).
        """
        logger.info("Fetching paper details: paper_id=%r", paper_id)

        params = {"fields": PAPER_FIELDS}

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await _get_with_retry(
                    client,
                    f"{SEMANTIC_SCHOLAR_BASE_URL}/paper/{paper_id}",
                    params=params,
                    headers=self._headers,
                )
        except httpx.TimeoutException:
            logger.error("Semantic Scholar request timed out for paper_id=%r", paper_id)
            raise
        except httpx.HTTPStatusError as exc:
            logger.error(
                "Semantic Scholar returned HTTP %d for paper_id=%r: %s",
                exc.response.status_code,
                paper_id,
                exc.response.text[:500],
            )
            raise
        except httpx.RequestError as exc:
            logger.error(
                "Network error fetching paper_id=%r: %s", paper_id, exc
            )
            raise

        raw = response.json()
        paper = _map_paper(raw, relevance_score=1.0)
        logger.info("Retrieved paper: paperId=%r title=%r", paper.paperId, paper.title)
        return paper
