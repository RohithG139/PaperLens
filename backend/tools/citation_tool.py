import httpx
from langchain_core.tools import tool

SEMANTIC_SCHOLAR_BASE = "https://api.semanticscholar.org/graph/v1/paper"


@tool
async def get_citation_network(paper_id: str, depth: int = 1) -> str:
    """Fetch the citation network for a paper from Semantic Scholar."""
    try:
        url = f"{SEMANTIC_SCHOLAR_BASE}/{paper_id}/citations"
        params = {
            "fields": "paperId,title,authors,year,citationCount",
            "limit": 20,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params)

        if response.status_code == 404:
            return f"Paper '{paper_id}' not found on Semantic Scholar."
        if response.status_code != 200:
            return f"Semantic Scholar API error: HTTP {response.status_code}."

        data = response.json()
        citations = data.get("data", [])

        if not citations:
            return f"No citations found for paper '{paper_id}'."

        lines = [f"=== Citation Network for {paper_id} (depth={depth}) ===\n"]
        for i, entry in enumerate(citations, start=1):
            citing = entry.get("citingPaper", {})
            cid = citing.get("paperId", "N/A")
            title = citing.get("title", "N/A")
            authors = citing.get("authors", [])
            authors_str = ", ".join(
                a.get("name", "") for a in authors
            ) if authors else "N/A"
            year = citing.get("year", "N/A")
            citation_count = citing.get("citationCount", "N/A")

            lines.append(
                f"{i}. {title}\n"
                f"   ID: {cid}\n"
                f"   Authors: {authors_str}\n"
                f"   Year: {year} | Citations: {citation_count}"
            )

        return "\n\n".join(lines)

    except httpx.TimeoutException:
        return "Error: Request to Semantic Scholar timed out."
    except httpx.RequestError as e:
        return f"Error fetching citation network: {str(e)}"
    except Exception as e:
        return f"Unexpected error: {str(e)}"
