from __future__ import annotations

from contextlib import contextmanager

import mlflow

from app.core.config import get_settings

settings = get_settings()


class MLflowTracker:
    def __init__(self) -> None:
        # MLFlow requires write access to create ./mlruns folders.
        # Since Render's free tier uses a read-only filesystem, we gracefully bypass MLFlow.
        pass

    @contextmanager
    def run_context(self, repo_full_name: str, commit_sha: str | None):
        # Yield a dummy ID instead of crashing
        yield "mlflow_bypassed_for_production"

    def log_metrics(self, metrics: dict[str, float]) -> None:
        pass

    def log_params(self, params: dict[str, str | int | float]) -> None:
        pass
