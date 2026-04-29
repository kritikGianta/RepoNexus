# RepoNexus Backend

Production-ready FastAPI backend for AI-powered repository intelligence and developer productivity.

## Features

- GitHub OAuth authentication with encrypted token storage (Fernet).
- JWT-based API auth.
- Repository connect/disconnect and webhook registration.
- Async analysis run triggering with Celery + Redis.
- Multi-language technical debt pipeline using:
  - tree-sitter AST parsing for Python/JS/TS/Java/Go
  - radon complexity metrics for Python
  - pylint + flake8 static analysis
  - spaCy documentation NLP checks
  - LangChain + FAISS + sentence-transformers embeddings
  - Groq LLM (llama3-70b-8192) for context-aware explanations and fixes
- MLflow tracking for run-level metrics and trend comparisons.
- Debt trend snapshots per run for historical dashboarding.

## API Endpoints

- `GET /health`
- `GET /api/v1/auth/github/login`
- `GET /api/v1/auth/github/callback`
- `GET /api/v1/auth/me`
- `GET /api/v1/repos`
- `POST /api/v1/repos/connect`
- `DELETE /api/v1/repos/{repo_id}`
- `POST /api/v1/repos/{repo_id}/webhook`
- `POST /api/v1/analysis/{repo_id}/runs`
- `GET /api/v1/analysis/{repo_id}/runs`
- `GET /api/v1/analysis/runs/{run_id}`
- `GET /api/v1/debts/{repo_id}/items`
- `GET /api/v1/debts/items/{item_id}`
- `PATCH /api/v1/debts/items/{item_id}/fixed`
- `GET /api/v1/trends/{repo_id}?period=30d|90d|1y`
- `POST /api/v1/webhooks/github`

## Environment Variables

See `.env.example` for required variables:

- `DATABASE_URL`
- `REDIS_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_REDIRECT_URI`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `GROQ_API_KEY`
- `MLFLOW_TRACKING_URI`
- `API_BASE_URL`
- `CORS_ORIGINS`
- `GITHUB_WEBHOOK_SECRET`

## Local Run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

Run Celery worker:

```bash
cd backend
celery -A app.tasks.celery_app:celery_app worker --loglevel=INFO --queues=analysis
```

## Local Full Stack via Docker Compose

```bash
docker compose up --build
```

This starts MySQL, Redis, MLflow, backend API, and Celery worker.
