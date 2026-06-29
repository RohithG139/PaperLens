from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class UserBase(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None
    provider: str = "google"


class UserCreate(UserBase):
    google_id: str


class UserDB(UserBase):
    id: str = Field(alias="_id")
    google_id: str
    created_at: datetime
    updated_at: datetime
    search_history: list[str] = []
    saved_papers: list[str] = []

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }


class UserResponse(UserBase):
    id: str
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }
