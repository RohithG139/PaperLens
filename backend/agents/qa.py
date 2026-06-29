import logging
import textwrap
import asyncio

import google.generativeai as genai

from config import settings
from models.paper import Paper
from models.conversation import Message

logger = logging.getLogger(__name__)


class QAAgent:
    SYSTEM_PROMPT = (
        "You are a research assistant for PaperLens AI. "
        "Answer ONLY based on the paper excerpts in context. "
        "If excerpts lack info, say so. Never fabricate facts."
    )

    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)

    async def answer_question(
        self,
        question: str,
        paper_ids: list[str],
        conversation_history: list[Message] = None,
    ) -> str:
        try:
            from database.pinecone_client import get_index
            from rag.embeddings import get_embedding_service

            embedding_service = get_embedding_service()
            embedding = await embedding_service.get_embedding(question)

            index = get_index()

            filter_dict = {"paper_id": {"$in": paper_ids}} if paper_ids else None

            query_kwargs = {
                "vector": embedding,
                "top_k": 6,
                "include_metadata": True,
            }
            if filter_dict is not None:
                query_kwargs["filter"] = filter_dict

            results = index.query(**query_kwargs)

            context_parts = []
            for match in results.matches:
                text = match.metadata.get("text", "")
                if text:
                    context_parts.append(text)

            context = "\n\n---\n\n".join(context_parts)

            history_text = ""
            if conversation_history:
                history_lines = []
                for msg in conversation_history:
                    role = getattr(msg, "role", "user")
                    content = getattr(msg, "content", "")
                    history_lines.append(f"{role.capitalize()}: {content}")
                history_text = "\n".join(history_lines) + "\n\n"

            prompt = (
                f"{self.SYSTEM_PROMPT}\n\n"
                f"{history_text}"
                f"Context excerpts:\n{context}\n\n"
                f"Question: {question}"
            )

            response = await self.model.generate_content_async(prompt)
            return response.text.strip()

        except Exception:
            logger.exception("Error answering question")
            return "Unable to answer question at this time."

    async def index_papers(self, papers: list[Paper]) -> None:
        from database.pinecone_client import upsert_vectors
        from rag.embeddings import get_embedding_service

        embedding_service = get_embedding_service()

        for paper in papers:
            abstract = getattr(paper, "abstract", None)
            if not abstract:
                continue

            chunks = self._chunk_text(abstract, chunk_size=500, overlap=50)

            vectors = []
            for chunk_index, chunk in enumerate(chunks):
                embedding = await embedding_service.get_embedding(chunk)
                vector_id = f"{paper.id}_chunk_{chunk_index}"
                vectors.append(
                    {
                        "id": vector_id,
                        "values": embedding,
                        "metadata": {
                            "paper_id": str(paper.id),
                            "title": getattr(paper, "title", ""),
                            "text": chunk,
                            "chunk_index": chunk_index,
                        },
                    }
                )

            if vectors:
                await upsert_vectors(vectors)

        logger.info("Completed indexing %d papers", len(papers))

    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
        words = text.split()
        if not words:
            return []

        chunks = []
        start = 0
        while start < len(words):
            end = start + chunk_size
            chunk = " ".join(words[start:end])
            chunks.append(chunk)
            if end >= len(words):
                break
            start = end - overlap

        return chunks
