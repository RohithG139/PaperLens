"""
Semantic Scholar API tools for PaperLens AI.
"""

from __future__ import annotations

import httpx
from langchain_core.tools import tool


SEMANTIC_SCHOLAR_BASE_URL = "https://api.semanticscholar.org/graph/v1"

PAPER_FIELDS = (
    "paperId,title,authors,year,citationCount,abstract,externalIds,url"
)

CITATION_FIELDS = (
    "paperId,title,authors,year,citationCount,abstract"
)


@tool
def semantic_scholar_search(query: str, max_results: int = 10) -> str:
    """Search for academic papers on Semantic Scholar.

    Args:
        query: The search query string.
        max_results: Maximum number of results to return (default 10).

    Returns:
        Formatted string listing papers with title, authors, year,
        citation count, and abstract snippet.
    """
    url = f"{SEMANTIC_SCHOLAR_BASE_URL}/paper/search"
    params = {
        "query": query,
        "limit": max(1, min(max_results, 100)),
        "fields": PAPER_FIELDS,
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        return "Error: Request to Semantic Scholar timed out. Please try again."
    except httpx.HTTPStatusError as exc:
        return (
            f"Error: Semantic Scholar API returned status {exc.response.status_code}. "
            f"Details: {exc.response.text[:200]}"
        )
    except httpx.RequestError as exc:
        return f"Error: Failed to connect to Semantic Scholar API. Details: {exc}"
    except Exception as exc:
        return f"Error: Unexpected error while searching Semantic Scholar. Details: {exc}"

    papers = data.get("data", [])
    if not papers:
        return f"No papers found for query: '{query}'"

    lines: list[str] = [f"Search results for '{query}' ({len(papers)} papers found):\n"]

    for idx, paper in enumerate(papers, start=1):
        title = paper.get("title") or "Untitled"
        year = paper.get("year") or "Unknown year"
        citation_count = paper.get("citationCount")
        citation_str = str(citation_count) if citation_count is not None else "N/A"
        paper_id = paper.get("paperId") or "N/A"

        authors_raw = paper.get("authors") or []
        if authors_raw:
            author_names = [a.get("name", "") for a in authors_raw if a.get("name")]
            if len(author_names) > 3:
                authors_str = ", ".join(author_names[:3]) + " et al."
            else:
                authors_str = ", ".join(author_names) if author_names else "Unknown authors"
        else:
            authors_str = "Unknown authors"

        abstract = paper.get("abstract") or ""
        if abstract:
            snippet = abstract[:300].rstrip()
            if len(abstract) > 300:
                snippet += "..."
        else:
            snippet = "No abstract available."

        paper_url = paper.get("url") or f"https://www.semanticscholar.org/paper/{paper_id}"

        lines.append(
            f"{idx}. {title}\n"
            f"   Authors: {authors_str}\n"
            f"   Year: {year} | Citations: {citation_str}\n"
            f"   Paper ID: {paper_id}\n"
            f"   URL: {paper_url}\n"
            f"   Abstract: {snippet}\n"
        )

    return "\n".join(lines)


@tool
def semantic_scholar_get_citations(paper_id: str) -> str:
    """Fetch the list of papers that cite a given Semantic Scholar paper.

    Args:
        paper_id: The Semantic Scholar paper ID (e.g. '649def34f8be52c8b66281af98ae884c09aef38d').

    Returns:
        Formatted string listing citing papers with title, authors, year,
        citation count, and abstract snippet.
    """
    paper_id = paper_id.strip()
    if not paper_id:
        return "Error: paper_id must not be empty."

    url = f"{SEMANTIC_SCHOLAR_BASE_URL}/paper/{paper_id}/citations"
    params = {
        "fields": CITATION_FIELDS,
        "limit": 100,
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        return "Error: Request to Semantic Scholar timed out. Please try again."
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            return f"Error: Paper with ID '{paper_id}' was not found on Semantic Scholar."
        return (
            f"Error: Semantic Scholar API returned status {exc.response.status_code}. "
            f"Details: {exc.response.text[:200]}"
        )
    except httpx.RequestError as exc:
        return f"Error: Failed to connect to Semantic Scholar API. Details: {exc}"
    except Exception as exc:
        return f"Error: Unexpected error while fetching citations. Details: {exc}"

    citation_entries = data.get("data", [])
    if not citation_entries:
        return f"No citations found for paper ID: '{paper_id}'"

    lines: list[str] = [
        f"Citations for paper ID '{paper_id}' ({len(citation_entries)} citing papers):\n"
    ]

    for idx, entry in enumerate(citation_entries, start=1):
        citing_paper = entry.get("citingPaper") or {}

        title = citing_paper.get("title") or "Untitled"
        year = citing_paper.get("year") or "Unknown year"
        citation_count = citing_paper.get("citationCount")
        citation_str = str(citation_count) if citation_count is not None else "N/A"
        citing_id = citing_paper.get("paperId") or "N/A"

        authors_raw = citing_paper.get("authors") or []
        if authors_raw:
            author_names = [a.get("name", "") for a in authors_raw if a.get("name")]
            if len(author_names) > 3:
                authors_str = ", ".join(author_names[:3]) + " et al."
            else:
                authors_str = ", ".join(author_names) if author_names else "Unknown authors"
        else:
            authors_str = "Unknown authors"

        abstract = citing_paper.get("abstract") or ""
        if abstract:
            snippet = abstract[:200].rstrip()
            if len(abstract) > 200:
                snippet += "..."
        else:
            snippet = "No abstract available."

        lines.append(
            f"{idx}. {title}\n"
            f"   Authors: {authors_str}\n"
            f"   Year: {year} | Citations: {citation_str}\n"
            f"   Paper ID: {citing_id}\n"
            f"   Abstract: {snippet}\n"
        )

    return "\n".join(lines)
