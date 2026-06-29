from langchain_core.tools import tool
from database.mongodb import get_db
from datetime import datetime, timezone


@tool
async def get_search_history(user_id: str, limit: int = 10) -> str:
    """Retrieve recent search history for a user."""
    try:
        db = await get_db()
        searches_collection = db["searches"]

        cursor = searches_collection.find(
            {"userId": user_id}
        ).sort("searchedAt", -1).limit(limit)

        searches = await cursor.to_list(length=limit)

        if not searches:
            return f"No search history found for user '{user_id}'."

        lines = [f"=== Recent Searches for {user_id} ===\n"]
        for i, search in enumerate(searches, start=1):
            query = search.get("query", "N/A")
            paper_ids = search.get("paperIds", [])
            searched_at = search.get("searchedAt", "N/A")
            if isinstance(searched_at, datetime):
                searched_at = searched_at.strftime("%Y-%m-%d %H:%M:%S UTC")
            paper_ids_str = ", ".join(paper_ids) if paper_ids else "None"

            lines.append(
                f"{i}. Query: {query}\n"
                f"   Papers: {paper_ids_str}\n"
                f"   Searched At: {searched_at}"
            )

        return "\n\n".join(lines)

    except Exception as e:
        return f"Error retrieving search history: {str(e)}"


@tool
async def save_to_history(user_id: str, query: str, paper_ids: list[str]) -> str:
    """Save a search query and results to the user's search history."""
    try:
        db = await get_db()
        searches_collection = db["searches"]

        document = {
            "userId": user_id,
            "query": query,
            "paperIds": paper_ids,
            "searchedAt": datetime.now(tz=timezone.utc),
        }

        await searches_collection.insert_one(document)
        return "Saved"

    except Exception as e:
        return f"Error saving to history: {str(e)}"
