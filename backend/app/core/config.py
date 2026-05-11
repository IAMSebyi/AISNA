from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List, Optional

class Settings(BaseSettings):
    model_config = ConfigDict(case_sensitive=True, env_file=".env")

    PROJECT_NAME: str = "AISNA - AI Stock News Analyzer"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    ALPHA_VANTAGE_API_KEY: str = "demo"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-5.4-mini"
    OPENAI_REASONING_EFFORT: str = "low"
    OPENAI_TIMEOUT_SECONDS: float = 30.0

settings = Settings()
