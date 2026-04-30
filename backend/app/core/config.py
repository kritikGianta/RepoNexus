from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True)

    app_name: str = "RepoNexus API"
    app_version: str = "1.0.0"
    api_v1_prefix: str = "/api/v1"
    environment: str = "development"

    database_url: str = Field(alias="DATABASE_URL")
    redis_url: str = Field(alias="REDIS_URL")

    github_client_id: str = Field(alias="GITHUB_CLIENT_ID")
    github_client_secret: str = Field(alias="GITHUB_CLIENT_SECRET")
    github_redirect_uri: str = Field(alias="GITHUB_REDIRECT_URI")
    github_webhook_secret: str | None = Field(default=None, alias="GITHUB_WEBHOOK_SECRET")

    jwt_secret: str = Field(alias="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 24 * 60

    encryption_key: str = Field(alias="ENCRYPTION_KEY")

    groq_api_key: str = Field(alias="GROQ_API_KEY")
    groq_api_key_2: str | None = Field(default=None, alias="GROQ_API_KEY_2")
    groq_model_name: str = "llama-3.3-70b-versatile"

    mlflow_tracking_uri: str = Field(alias="MLFLOW_TRACKING_URI")
    mlflow_experiment_name: str = "reponexus-analysis"

    api_base_url: str = Field(alias="API_BASE_URL")
    cors_origins: str = Field(alias="CORS_ORIGINS")

    default_plan_tier: str = Field(default="free", alias="DEFAULT_PLAN_TIER")
    celery_task_time_limit_seconds: int = Field(default=7200, alias="CELERY_TASK_TIME_LIMIT_SECONDS")
    max_files_per_analysis: int = Field(default=200, alias="MAX_FILES_PER_ANALYSIS")

    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    supported_extensions: List[str] = [
        ".py",
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".java",
        ".go",
    ]

    @property
    def allowed_cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
