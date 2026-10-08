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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))  # 30 min access token
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))  # 7 days refresh token
    MAX_FAILED_LOGIN_ATTEMPTS: int = int(os.getenv("MAX_FAILED_LOGIN_ATTEMPTS", "5"))
    LOCKOUT_DURATION_MINUTES: int = int(os.getenv("LOCKOUT_DURATION_MINUTES", "15"))
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() in ("true", "1")
    
    # AI Configuration
    AI_MODE: str = os.getenv("AI_MODE", "yolo")  # "yolo" or "mock"
    AI_MODEL_PATH: str = os.getenv("AI_MODEL_PATH", "models/trained/foodwaste_yolo11m_seg_31cls.pt")
    AI_DET_MODEL_PATH: str = os.getenv("AI_DET_MODEL_PATH", "")
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
    DEMO_EMAIL: str = os.getenv("DEMO_EMAIL", "gandhaar.joshi@platesight.in")
    DEMO_PASSWORD: str = os.getenv("DEMO_PASSWORD", "pass1234")
    DEMO_HOTEL_NAME: str = os.getenv("DEMO_HOTEL_NAME", "Dolphin Hotels")
    
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]

settings = Settings()
