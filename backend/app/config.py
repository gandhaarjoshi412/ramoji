import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True, 
        extra="ignore",
        env_file=[".env", "../.env", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")],
        env_file_encoding="utf-8"
    )

    APP_NAME: str = "AI Banquet Food Waste & Cost Analytics"
    ENV: str = os.getenv("ENV", "development")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./food_waste.db"
    )
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", 
        "mvp-super-secret-key-change-in-production-hotel-banquet-2026"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # AI Configuration
    AI_MODE: str = os.getenv("AI_MODE", "yolo")  # "yolo" or "mock"
    AI_MODEL_PATH: str = os.getenv("AI_MODEL_PATH", "best.pt")
    AI_CONFIDENCE_THRESHOLD: float = float(os.getenv("AI_CONFIDENCE_THRESHOLD", "0.70"))
    AI_MODEL_NAME: str = os.getenv("AI_MODEL_NAME", "YOLO11m-seg")
    AI_MODEL_VERSION: str = os.getenv("AI_MODEL_VERSION", "foodwaste-merged15k-v1.0")

    # Storage Configuration
    STORAGE_PROVIDER: str = os.getenv("STORAGE_PROVIDER", "local")  # "local" or "s3"
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    S3_BUCKET: str = os.getenv("S3_BUCKET", "")
    S3_ENDPOINT: str = os.getenv("S3_ENDPOINT", "")
    S3_ACCESS_KEY: str = os.getenv("S3_ACCESS_KEY", "")
    S3_SECRET_KEY: str = os.getenv("S3_SECRET_KEY", "")

    # Demo & Hotel Configuration
    DEMO_EMAIL: str = os.getenv("DEMO_EMAIL", "demo@example.com")
    DEMO_PASSWORD: str = os.getenv("DEMO_PASSWORD", "demo123")
    DEMO_HOTEL_NAME: str = os.getenv("DEMO_HOTEL_NAME", "Dolphin Hotels")
    
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]

settings = Settings()
