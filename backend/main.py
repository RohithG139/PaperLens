import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.mongodb import connect_db, close_db
from database.pinecone_client import init_pinecone
from routes import auth, papers, agents, users

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up PaperLens AI...")
    await connect_db()
    logger.info("MongoDB connected.")
    await init_pinecone()
    logger.info("Pinecone initialized.")
    yield
    logger.info("Shutting down PaperLens AI...")
    await close_db()
    logger.info("MongoDB connection closed.")


app = FastAPI(
    title="PaperLens AI",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(papers.router, prefix="/api/papers", tags=["papers"])
app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
app.include_router(users.router, prefix="/api/users", tags=["users"])


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "app": "PaperLens AI", "version": "1.0.0"}
