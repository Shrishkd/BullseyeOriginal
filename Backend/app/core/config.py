from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "Bullseye Backend"

    # =====================
    # DATABASE
    # =====================
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./bullseye.db"
    )

    # =====================
    # AUTH / JWT
    # =====================
    SECRET_KEY: str = "dev-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # =====================
    # AI / ML
    # =====================
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    GEMINI_API_KEY: str | None = None

    # =====================
    # MARKET DATA
    # =====================
    FINNHUB_API_KEY: str | None = None

    # =====================
    # UPSTOX
    # =====================
    UPSTOX_API_KEY: str | None = None
    UPSTOX_API_SECRET: str | None = None
    UPSTOX_REDIRECT_URI: str | None = None

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
