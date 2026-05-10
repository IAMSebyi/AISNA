from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "AISNA - AI Stock News Analyzer"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    ALPHA_VANTAGE_API_KEY: str = "demo"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
