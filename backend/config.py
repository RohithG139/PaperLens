from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    MONGODB_URL: str
    PINECONE_API_KEY: str
    PINECONE_INDEX_NAME: str = "paperlens"
    PINECONE_ENVIRONMENT: str = "us-east-1"
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/callback"
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.0-flash"
    FRONTEND_URL: str = "http://localhost:5173"
    SEMANTIC_SCHOLAR_API_KEY: str = ""
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
