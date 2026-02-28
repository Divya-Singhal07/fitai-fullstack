# backend/app/core/config.py
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # app
    APP_NAME: str = "FitAI"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"

    # databases
    POSTGRES_URL: str = "postgresql+asyncpg://fitai:password@localhost/fitai_db"
    MONGO_URL: str = "mongodb://localhost:27017"
    MONGO_DB: str = "fitai"

    # openai
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    # huggingface
    HF_TOKEN: str = ""
    HF_NUTRITION_MODEL: str = "microsoft/DialoGPT-medium"

    # aws s3
    AWS_ACCESS_KEY: str = ""
    AWS_SECRET_KEY: str = ""
    AWS_BUCKET: str = "fitai-media"
    AWS_REGION: str = "us-east-1"

    # firebase
    FIREBASE_CREDENTIALS: str = "firebase-credentials.json"

    # cors
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://fitai.yourdomain.com",
    ]

    # ml model paths
    POSE_MODEL_PATH: str = "ml/models/pose_classifier.pt"
    NUTRITION_MODEL_PATH: str = "ml/models/nutrition_rf.pkl"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
