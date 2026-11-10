# RepoNexus backend

FastAPI service, Celery worker and analysis pipeline. See the [root README](../README.md) for running
the full stack with Docker.

## Run locally

```bash
python -m venv .venv && .venv/Scripts/activate   # or: source .venv/bin/activate
pip install -r requirements-dev.txt
python ../scripts/bootstrap_env.py               # creates .env with generated secrets
uvicorn app.main:app --reload --port 8000
```

With the default `.env`, the API uses SQLite, creates tables on startup and runs analyses in-process
(`TASK_EXECUTION_MODE=inline`), so Redis is not needed. To use the worker instead:

```bash
# TASK_EXECUTION_MODE=celery and a reachable REDIS_URL
celery -A app.tasks.celery_app:celery_app worker --loglevel=INFO --queues=analysis
```

## Migrations

The schema is owned by Alembic; the container entrypoint runs `alembic upgrade head` automatically.

```bash
alembic upgrade head
alembic revision --autogenerate -m "describe change"
```

## Analysis pipeline

`app/ml/pipeline.py` fetches up to `MAX_FILES_PER_ANALYSIS` source files through the Git Trees API and runs:

| Signal | Implementation |
|--------|----------------|
| AST (functions, classes, identifiers) | tree-sitter (`tree-sitter-languages`, Python/JS/TS/Java/Go) |
| Cyclomatic complexity, maintainability | radon (Python), heuristics elsewhere |
| Duplication | 8-line normalized window fingerprints across files |
| Coupling | dependency graph degree centrality (networkx) |
| Security smells, outdated modules, unused imports | lightweight static rules |
| Documentation density | comment/docstring ratio |

Findings are scored (`app/ml/debt_scorer.py`), given effort estimates, and the top `MAX_AI_ENRICHMENTS`
are explained by the LLM with context retrieved from a per-run TF-IDF code index (`app/ml/retriever.py`).
Run metrics are logged to MLflow when `MLFLOW_TRACKING_URI` is set.

## API overview

Interactive docs: `http://localhost:8000/docs`.

| Area | Endpoints |
|------|-----------|
| System | `GET /health`, `GET /health/ready`, `GET /api/v1/system/status` |
| Auth | `GET /api/v1/auth/github/login`, `GET /api/v1/auth/github/callback`, `GET /api/v1/auth/me` |
| Repositories | `GET /api/v1/repos`, `POST /api/v1/repos/connect`, `DELETE /api/v1/repos/{id}`, `POST /api/v1/repos/{id}/webhook` |
| Analysis | `POST /api/v1/analysis/{repo_id}/runs` (202, 409 if one is active), `GET /api/v1/analysis/{repo_id}/runs`, `GET /api/v1/analysis/runs/{run_id}` |
| Debt | `GET /api/v1/debts/{repo_id}/items`, `GET /api/v1/debts/items/{id}`, `PATCH /api/v1/debts/items/{id}/fixed` |
| Trends | `GET /api/v1/trends/{repo_id}?period=30d\|90d\|1y` |
| Webhooks | `POST /api/v1/webhooks/github` |
| AI helpers | `/api/v1/helpers/...` — chat, PR review, security scan, diagrams, docs generators, issue triage/planning, standup, interview, tutor, zombie/migration/cost scans, debt score |

AI helper endpoints return `503` with an explanatory message when no Groq key is configured.

## Layout

```
app/
├── api/         routes + middleware (request IDs, security headers, rate limiting)
├── core/        settings, JWT/OAuth state, Fernet encryption, Groq client with key rotation
├── db/          async engine and session dependency
├── ml/          pipeline, analyzers, retriever, MLflow tracker
├── models/      SQLAlchemy models (enums stored by value)
├── schemas/     Pydantic request/response models
├── services/    domain services, GitHub client, AI prompt helpers, repo chat
└── tasks/       Celery app, analysis task and dispatcher
```

## Tests

```bash
ruff check app ../own_models
pytest -q
```

Tests use an in-memory SQLite database and mock GitHub/OAuth; no network access is required.
