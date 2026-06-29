"""
MongoDB connection management for PaperLens AI.

Provides:
  connect_db()  - called at startup via lifespan
  close_db()    - called at shutdown via lifespan
  get_db()      - returns the active database handle for use in routes
"""

from __future__ import annotations

import logging
import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None

DB_NAME = "paperlens"


async def connect_db() -> None:
    """Open the MongoDB connection and initialise the global client/db handles."""
    global _client, _db

    mongo_url = os.environ.get("MONGODB_URL")
    if not mongo_url:
        raise ValueError("MONGODB_URL environment variable is not set.")

    _client = AsyncIOMotorClient(
        mongo_url,
        tlsAllowInvalidCertificates=True,
        tlsAllowInvalidHostnames=True,
        serverSelectionTimeoutMS=30000,
    )
    _db = _client[DB_NAME]

    # Verify connectivity
    await _client.admin.command("ping")
    logger.info("Connected to MongoDB: database=%r", DB_NAME)

    # Ensure indexes exist (idempotent)
    await _db["users"].create_index("userId", unique=True)
    await _db["users"].create_index("email", unique=True)
    await _db["search_history"].create_index([("userId", 1), ("searchedAt", -1)])
    await _db["executions"].create_index("executionId", unique=True)
    await _db["executions"].create_index([("userId", 1), ("createdAt", -1)])
    logger.info("MongoDB indexes ensured.")


async def close_db() -> None:
    """Close the MongoDB connection gracefully."""
    global _client, _db

    if _client is not None:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection closed.")


async def get_db() -> AsyncIOMotorDatabase:
    """
    Return the active database handle.

    Raises RuntimeError if called before connect_db().
    """
    if _db is None:
        raise RuntimeError(
            "MongoDB is not connected. Ensure connect_db() was called during startup."
        )
    return _db
