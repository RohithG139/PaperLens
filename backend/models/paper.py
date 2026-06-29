from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class Author(BaseModel):
    name: str
    authorId: Optional[str] = None


class Paper(BaseModel):
    paperId: str
    title: str
    abstract: Optional[str] = None
    authors: list[Author] = []
    year: Optional[int] = None
    citationCount: int = 0
    referenceCount: int = 0
    fieldsOfStudy: list[str] = []
    url: Optional[str] = None
    relevanceScore: float = 0.0


class PaperSummary(BaseModel):
    paperId: str
    title: str
    problemStatement: str
    methodology: str
    results: str
    advantages: str
    limitations: str


class ComparisonResult(BaseModel):
    papers: list[Paper]
    comparisonTable: dict
    similarities: list[str]
    differences: list[str]
    recommendation: str


class SearchQuery(BaseModel):
    query: str
    max_results: int = Field(default=10, ge=1, le=50)


class SearchResult(BaseModel):
    query: str
    papers: list[Paper]
    total: int
    searchedAt: datetime
