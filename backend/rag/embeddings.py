import logging
from typing import Optional

logger = logging.getLogger(__name__)

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSIONS = 384

_embedding_service_instance: Optional["EmbeddingService"] = None


class EmbeddingService:
    """Service for generating text embeddings using SentenceTransformers."""

    def __init__(self) -> None:
        self._model = None
        self._model_name = MODEL_NAME

    def _load_model(self) -> None:
        """Lazily load the SentenceTransformer model."""
        if self._model is not None:
            return

        try:
            from sentence_transformers import SentenceTransformer

            logger.info("Loading SentenceTransformer model: %s", self._model_name)
            self._model = SentenceTransformer(self._model_name)
            logger.info(
                "Model loaded successfully. Embedding dimensions: %d",
                EMBEDDING_DIMENSIONS,
            )
        except ImportError as e:
            logger.error(
                "sentence_transformers package is not installed: %s", e
            )
            raise RuntimeError(
                "sentence_transformers is required for embedding generation. "
                "Install it with: pip install sentence-transformers"
            ) from e
        except Exception as e:
            logger.error(
                "Failed to load SentenceTransformer model '%s': %s",
                self._model_name,
                e,
            )
            raise RuntimeError(
                f"Could not load embedding model '{self._model_name}': {e}"
            ) from e

    def get_embedding(self, text: str) -> list[float]:
        """Encode a single text string into an embedding vector.

        Args:
            text: The input text to embed.

        Returns:
            A list of floats representing the embedding (384 dimensions).

        Raises:
            RuntimeError: If the model cannot be loaded.
            ValueError: If the input text is empty.
        """
        if not text or not text.strip():
            raise ValueError("Input text must not be empty.")

        self._load_model()

        try:
            embedding = self._model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
        except Exception as e:
            logger.error("Failed to generate embedding for text: %s", e)
            raise RuntimeError(f"Embedding generation failed: {e}") from e

    def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Batch encode multiple text strings into embedding vectors.

        Args:
            texts: A list of input texts to embed.

        Returns:
            A list of embedding vectors, each a list of floats (384 dimensions).

        Raises:
            RuntimeError: If the model cannot be loaded.
            ValueError: If the input list is empty or contains empty strings.
        """
        if not texts:
            raise ValueError("Input texts list must not be empty.")

        cleaned = [t for t in texts if t and t.strip()]
        if len(cleaned) != len(texts):
            logger.warning(
                "Removed %d empty or whitespace-only strings from input batch.",
                len(texts) - len(cleaned),
            )
        if not cleaned:
            raise ValueError(
                "All input texts were empty or whitespace-only after filtering."
            )

        self._load_model()

        try:
            embeddings = self._model.encode(
                cleaned,
                batch_size=32,
                convert_to_numpy=True,
                show_progress_bar=False,
            )
            return [emb.tolist() for emb in embeddings]
        except Exception as e:
            logger.error("Failed to generate batch embeddings: %s", e)
            raise RuntimeError(f"Batch embedding generation failed: {e}") from e


def get_embedding_service() -> EmbeddingService:
    """Return the global singleton EmbeddingService instance.

    The instance is created on first call and reused thereafter.

    Returns:
        The shared EmbeddingService instance.
    """
    global _embedding_service_instance

    if _embedding_service_instance is None:
        logger.debug("Creating new EmbeddingService singleton instance.")
        _embedding_service_instance = EmbeddingService()

    return _embedding_service_instance
