from langchain_core.tools import tool
from database.mongodb import get_db


@tool
async def compare_papers_tool(paper_ids: list[str]) -> str:
    """Compare multiple papers by fetching their details from MongoDB."""
    try:
        db = await get_db()
        papers_collection = db["papers"]

        results = []
        not_found = []

        for paper_id in paper_ids:
            paper = await papers_collection.find_one({"paperId": paper_id})
            if not paper:
                not_found.append(paper_id)
                continue

            title = paper.get("title", "N/A")
            authors = paper.get("authors", [])
            if isinstance(authors, list):
                authors_str = ", ".join(
                    a.get("name", a) if isinstance(a, dict) else str(a)
                    for a in authors
                )
            else:
                authors_str = str(authors)
            year = paper.get("year", "N/A")
            abstract = paper.get("abstract", "")
            abstract_snippet = (abstract[:200] + "...") if len(abstract) > 200 else abstract

            results.append(
                f"Paper ID: {paper_id}\n"
                f"  Title: {title}\n"
                f"  Authors: {authors_str}\n"
                f"  Year: {year}\n"
                f"  Abstract: {abstract_snippet}"
            )

        output = ""
        if results:
            output += "=== Paper Comparison ===\n\n" + "\n\n".join(results)
        if not_found:
            if output:
                output += "\n\n"
            output += f"Papers not found: {', '.join(not_found)}"

        if not output:
            return "No papers found for the provided IDs."

        return output

    except Exception as e:
        return f"Error comparing papers: {str(e)}"
