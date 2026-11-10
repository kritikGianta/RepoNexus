from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_PLACEHOLDER_MARKERS = ("your_", "replace-this", "changeme", "gsk_your")


def _is_real_secret(value: str | None) -> bool:
    """True when a value looks like a real credential rather than an .env.example placeholder."""
    if not value or not value.strip():
        return False
    lowered = value.strip().lower()
    return not any(marker in lowered for marker in _PLACEHOLDER_MARKERS)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore")

    app_name: str = "RepoNexus API"
    app_version: str = "2.0.0"
    api_v1_prefix: str = "/api/v1"
    environment: str = Field(default="development", alias="ENVIRONMENT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    database_url: str = Field(default="sqlite+aiosqlite:///./reponexus.db", alias="DATABASE_URL")
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    # "celery" dispatches analysis jobs to the worker, "inline" runs them inside the API process.
    task_execution_mode: str = Field(default="inline", alias="TASK_EXECUTION_MODE")

    github_client_id: str = Field(default="", alias="GITHUB_CLIENT_ID")
    github_client_secret: str = Field(default="", alias="GITHUB_CLIENT_SECRET")
    github_redirect_uri: str = Field(default="http://localhost:5175/auth/github/callback", alias="GITHUB_REDIRECT_URI")
    github_webhook_secret: str | None = Field(default=None, alias="GITHUB_WEBHOOK_SECRET")

    jwt_secret: str = Field(alias="JWT_SECRET", min_length=32)
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = Field(default=24 * 60, alias="JWT_EXPIRE_MINUTES")

    encryption_key: str = Field(alias="ENCRYPTION_KEY")

    # Comma separated list of Groq keys. GROQ_API_KEY / GROQ_API_KEY_2 are still honoured.
    groq_api_keys: str = Field(default="", alias="GROQ_API_KEYS")
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    groq_api_key_2: str | None = Field(default=None, alias="GROQ_API_KEY_2")
    groq_model_name: str = Field(default="llama-3.3-70b-versatile", alias="GROQ_MODEL_NAME")

    mlflow_tracking_uri: str = Field(default="", alias="MLFLOW_TRACKING_URI")
    mlflow_experiment_name: str = "reponexus-analysis"

    api_base_url: str = Field(default="http://localhost:8000", alias="API_BASE_URL")
    cors_origins: str = Field(default="http://localhost:5175,http://localhost", alias="CORS_ORIGINS")

    default_plan_tier: str = Field(default="free", alias="DEFAULT_PLAN_TIER")
    celery_task_time_limit_seconds: int = Field(default=3600, alias="CELERY_TASK_TIME_LIMIT_SECONDS")
    max_files_per_analysis: int = Field(default=200, alias="MAX_FILES_PER_ANALYSIS")
    max_ai_enrichments: int = Field(default=10, alias="MAX_AI_ENRICHMENTS")
    rag_store_dir: str = Field(default="./data/rag_stores", alias="RAG_STORE_DIR")

    rate_limit_enabled: bool = Field(default=True, alias="RATE_LIMIT_ENABLED")

    supported_extensions: List[str] = [".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go"]

    @property
    def allowed_cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def groq_keys(self) -> List[str]:
        raw = [k.strip() for k in self.groq_api_keys.split(",")]
        raw += [self.groq_api_key or "", self.groq_api_key_2 or ""]
        keys: List[str] = []
        for key in raw:
            if _is_real_secret(key) and key not in keys:
                keys.append(key)
        return keys

    @property
    def ai_configured(self) -> bool:
        return bool(self.groq_keys)

    @property
    def github_oauth_configured(self) -> bool:
        return _is_real_secret(self.github_client_id) and _is_real_secret(self.github_client_secret)

    @property
    def use_celery(self) -> bool:
        return self.task_execution_mode.lower() == "celery"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
