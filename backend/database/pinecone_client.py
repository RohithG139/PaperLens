import logging
import os
from typing import Optional

from pinecone import Pinecone, ServerlessSpec

logger = logging.getLogger(__name__)

_pinecone_instance: Optional[Pinecone] = None
_index = None


async def init_pinecone() -> None:
    global _pinecone_instance, _index

    api_key = os.environ.get("PINECONE_API_KEY")
    if not api_key:
        raise ValueError("PINECONE_API_KEY environment variable is not set")

    index_name = os.environ.get("PINECONE_INDEX_NAME", "paperlens")
    environment = os.environ.get("PINECONE_ENVIRONMENT", "us-east-1")

    _pinecone_instance = Pinecone(api_key=api_key)

    existing_indexes = [idx.name for idx in _pinecone_instance.list_indexes()]

    if index_name not in existing_indexes:
        logger.info("Creating Pinecone index '%s'...", index_name)
        _pinecone_instance.create_index(
            name=index_name,
            dimension=384,
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1",
            ),
        )
        logger.info("Pinecone index '%s' created successfully.", index_name)
    else:
        logger.info("Pinecone index '%s' already exists.", index_name)

    _index = _pinecone_instance.Index(index_name)
    logger.info(
        "Pinecone initialized successfully. Index: '%s', Environment: '%s'",
        index_name,
        environment,
    )


def get_index():
    if _index is None:
        raise RuntimeError(
            "Pinecone has not been initialized. Call init_pinecone() first."
        )
    return _index


async def upsert_vectors(vectors: list[dict]) -> None:
    index = get_index()
    pinecone_vectors = [
        {
            "id": v["id"],
            "values": v["values"],
            "metadata": v.get("metadata", {}),
        }
        for v in vectors
    ]
    index.upsert(vectors=pinecone_vectors)
    logger.debug("Upserted %d vectors to Pinecone.", len(pinecone_vectors))


async def query_vectors(
    vector: list[float],
    top_k: int = 5,
    filter: Optional[dict] = None,
) -> list[dict]:
    index = get_index()
    query_kwargs = {
        "vector": vector,
        "top_k": top_k,
        "include_metadata": True,
    }
    if filter is not None:
        query_kwargs["filter"] = filter

    response = index.query(**query_kwargs)
    matches = response.get("matches", [])
    logger.debug("Pinecone query returned %d matches.", len(matches))
    return matches
