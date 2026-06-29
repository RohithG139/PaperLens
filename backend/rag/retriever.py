import logging
import asyncio

from database.pinecone_client import get_index, upsert_vectors
from rag.embeddings import get_embedding_service

logger = logging.getLogger(__name__)


class RAGRetriever:
    async def retrieve(self, query: str, paper_ids: list[str] = None, top_k: int = 5) -> list[dict]:
        try:
            embedding = await get_embedding_service().get_embedding(query)
            filter_dict = {"paper_id": {"$in": paper_ids}} if paper_ids else None
            response = get_index().query(
                vector=embedding,
                top_k=top_k,
                include_metadata=True,
                filter=filter_dict,
            )
            matches = response.matches
            return [
                {
                    "text": match.metadata.get("text", ""),
                    "score": match.score,
                    "metadata": match.metadata,
                }
                for match in matches
            ]
        except Exception as e:
            logger.error("Error during retrieval: %s", e)
            return []

    async def index_document(self, chunk: dict) -> None:
        embedding = await get_embedding_service().get_embedding(chunk["text"])
        await upsert_vectors([
            {
                "id": chunk["id"],
                "values": embedding,
                "metadata": {**chunk["metadata"], "text": chunk["text"]},
            }
        ])

    async def index_documents(self, chunks: list[dict]) -> None:
        semaphore = asyncio.Semaphore(5)

        async def _index_with_semaphore(chunk: dict) -> None:
            async with semaphore:
                await self.index_document(chunk)

        await asyncio.gather(*[_index_with_semaphore(chunk) for chunk in chunks])
        logger.info("Indexed %d chunks", len(chunks))
