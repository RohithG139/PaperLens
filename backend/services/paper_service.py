import logging
from datetime import datetime, timezone
from typing import Optional

from database.mongodb import get_db
from database.pinecone_client import upsert_vectors
from models.paper import Paper
from rag.chunker import DocumentChunker
from rag.embeddings import get_embedding_service

logger = logging.getLogger(__name__)


class PaperService:
    def __init__(self):
        self._chunker = DocumentChunker()

    async def save_paper(self, paper: Paper) -> str:
        db = await get_db()
        await db.papers.update_one(
            {"paperId": paper.paperId},
            {
                "$set": paper.dict(),
                "$setOnInsert": {"createdAt": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
        return paper.paperId

    async def get_paper(self, paper_id: str) -> Optional[Paper]:
        db = await get_db()
        doc = await db.papers.find_one({"paperId": paper_id})
        if doc is None:
            return None
        doc.pop("_id", None)
        return Paper(**doc)

    async def save_search(self, user_id: str, query: str, papers: list[Paper]) -> str:
        db = await get_db()
        result = await db.searches.insert_one(
            {
                "userId": user_id,
                "query": query,
                "papers": [p.dict() for p in papers],
                "resultCount": len(papers),
                "searchedAt": datetime.now(timezone.utc),
            }
        )
        return str(result.inserted_id)

    async def get_user_searches(self, user_id: str, limit: int = 20) -> list[dict]:
        db = await get_db()
        cursor = db.searches.find({"userId": user_id}).sort("searchedAt", -1).limit(limit)
        results = []
        async for doc in cursor:
            results.append(
                {
                    "id": str(doc["_id"]),
                    "query": doc.get("query"),
                    "resultCount": doc.get("resultCount"),
                    "searchedAt": doc.get("searchedAt"),
                    "papers": doc.get("papers", []),
                }
            )
        return results

    async def save_papers_to_rag(self, papers: list[Paper]) -> None:
        embedding_service = get_embedding_service()

        all_chunks = []
        for paper in papers:
            chunks = self._chunker.chunk_paper(paper)
            all_chunks.extend(chunks)

        if not all_chunks:
            logger.info("No chunks to embed.")
            return

        texts = [chunk["text"] for chunk in all_chunks]
        embeddings = await embedding_service.get_embeddings_batch(texts)

        vectors = []
        for chunk, embedding in zip(all_chunks, embeddings):
            vectors.append(
                {
                    "id": chunk["id"],
                    "values": embedding,
                    "metadata": chunk.get("metadata", {}),
                }
            )

        await upsert_vectors(vectors)
        logger.info("Stored %d vectors in Pinecone.", len(vectors))
