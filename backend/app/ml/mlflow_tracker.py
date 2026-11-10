"""Optional MLflow experiment tracking.

Tracking is enabled when MLFLOW_TRACKING_URI is set (docker compose points it at the bundled
MLflow server). Any MLflow failure is logged and swallowed so an analysis never fails because
the tracking server is unavailable.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class MLflowTracker:
    def __init__(self) -> None:
        settings = get_settings()
        self._uri = settings.mlflow_tracking_uri
        self._experiment = settings.mlflow_experiment_name
        self._active = False
        self._mlflow = None

    @contextmanager
    def run_context(self, repo_full_name: str, commit_sha: str | None):
        run_id = ""
        if self._uri:
            try:
                import mlflow

                mlflow.set_tracking_uri(self._uri)
                mlflow.set_experiment(self._experiment)
                run = mlflow.start_run(run_name=f"{repo_full_name}@{(commit_sha or 'head')[:7]}")
                self._mlflow, self._active, run_id = mlflow, True, run.info.run_id
            except Exception as exc:  # noqa: BLE001
                logger.warning("MLflow unavailable, continuing without tracking: %s", exc)
        try:
            yield run_id
        finally:
            if self._active and self._mlflow is not None:
                try:
                    self._mlflow.end_run()
                except Exception:  # noqa: BLE001
                    pass
            self._active = False

    def log_metrics(self, metrics: dict[str, float]) -> None:
        if self._active and self._mlflow is not None:
            try:
                self._mlflow.log_metrics({k: float(v) for k, v in metrics.items()})
            except Exception as exc:  # noqa: BLE001
                logger.warning("MLflow log_metrics failed: %s", exc)

    def log_params(self, params: dict[str, str | int | float]) -> None:
        if self._active and self._mlflow is not None:
            try:
                self._mlflow.log_params(params)
            except Exception as exc:  # noqa: BLE001
                logger.warning("MLflow log_params failed: %s", exc)
