import re
from typing import List, Dict, Any

from models.paper import Paper


class DocumentChunker:
    def chunk_text(
        self,
        text: str,
        chunk_size: int = 512,
        overlap: int = 50,
    ) -> List[str]:
        if not text or not text.strip():
            return []

        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        sentences = [s.strip() for s in sentences if s.strip()]

        chunks: List[str] = []
        current_chunk = ""

        for sentence in sentences:
            if len(sentence) > chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""
                start = 0
                while start < len(sentence):
                    end = start + chunk_size
                    part = sentence[start:end]
                    if chunks and overlap > 0:
                        prev = chunks[-1]
                        tail = prev[-overlap:] if len(prev) >= overlap else prev
                        part = tail + " " + part
                    chunks.append(part.strip())
                    start += chunk_size - overlap
                continue

            candidate = (current_chunk + " " + sentence).strip() if current_chunk else sentence
            if len(candidate) <= chunk_size:
                current_chunk = candidate
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                if chunks and overlap > 0:
                    prev = chunks[-1]
                    tail = prev[-overlap:] if len(prev) >= overlap else prev
                    current_chunk = (tail + " " + sentence).strip()
                else:
                    current_chunk = sentence

        if current_chunk:
            chunks.append(current_chunk.strip())

        return chunks

    def chunk_paper(self, paper: Paper) -> List[Dict[str, Any]]:
        title = paper.title or ""
        abstract = paper.abstract or ""

        if abstract:
            combined = f"{title}. {abstract}".strip() if title else abstract.strip()
        else:
            combined = title.strip()

        text_chunks = self.chunk_text(combined)

        authors: List[str] = []
        if paper.authors:
            for author in paper.authors:
                if isinstance(author, dict):
                    name = author.get("name", "")
                elif hasattr(author, "name"):
                    name = author.name
                else:
                    name = str(author)
                if name:
                    authors.append(name)

        year = None
        if hasattr(paper, "year"):
            year = paper.year

        result: List[Dict[str, Any]] = []
        for i, chunk_text in enumerate(text_chunks):
            result.append(
                {
                    "id": f"{paper.paperId}_chunk_{i}",
                    "text": chunk_text,
                    "metadata": {
                        "paperId": paper.paperId,
                        "title": title,
                        "authors": authors,
                        "year": year,
                        "chunk_index": i,
                    },
                }
            )

        return result
