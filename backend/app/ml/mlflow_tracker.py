from __future__ import annotations

from contextlib import contextmanager

import mlflow

from app.core.config import get_settings

settings = get_settings()


class MLflowTracker:
    def __init__(self) -> None:
        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        mlflow.set_experiment(settings.mlflow_experiment_name)

    @contextmanager
    def run_context(self, repo_full_name: str, commit_sha: str | None):
        run_name = f"{repo_full_name}:{(commit_sha or 'head')[:7]}"
        with mlflow.start_run(run_name=run_name) as run:
            mlflow.set_tags(
                {
                    "repo": repo_full_name,
                    "commit_sha": commit_sha or "unknown",
                    "service": "reponexus",
                }
            )
            yield run.info.run_id

    def log_metrics(self, metrics: dict[str, float]) -> None:
        for key, value in metrics.items():
            mlflow.log_metric(key, float(value))

    def log_params(self, params: dict[str, str | int | float]) -> None:
        mlflow.log_params(params)
