<p align="center">
  <img src="frontend/public/logo.png" alt="RepoNexus" width="72" />
</p>

<h1 align="center">RepoNexus</h1>

<p align="center">
  AI-powered repository intelligence and technical-debt governance for GitHub —<br/>
  18 tools that read your repo like a senior engineer would. Runs entirely on your machine.
</p>

<p align="center">
  <a href="https://github.com/kritikGianta/RepoNexus/actions/workflows/ci.yml"><img src="https://github.com/kritikGianta/RepoNexus/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/python-3.11-3776AB" alt="Python 3.11" />
  <img src="https://img.shields.io/badge/react-18-61DAFB" alt="React 18" />
  <img src="https://img.shields.io/badge/runtime-docker%20compose-2496ED" alt="Docker Compose" />
</p>

---

## What it does

Connect a GitHub repository and RepoNexus runs a multi-signal analysis — AST parsing, cyclomatic
complexity, duplication fingerprinting, dependency centrality, security heuristics and documentation
density — on a background worker. Every finding gets a severity, an effort estimate and (with a Groq
key) an AI explanation and fix grounded in your own code. Scores are tracked per run so you can watch
debt trend down over time.

On top of the analysis sit 18 developer tools:

| Area | Tools |
|------|-------|
| Code health | Debt dashboard & trends · Zombie Code Exterminator · Debt Health Scorer (XGBoost) · Cloud Cost Optimizer · Migration Risk Analyzer |
| Review & security | PR Reviewer · Security Audit · Auto-fix PRs · GitHub issue creation |
| Understanding | Code Chat (repository Q&A) · Architecture Diagrams · Code Tutor · Interview Prep |
| Documentation | README Generator · Contributing Guide · API Documenter · Local Setup Guide · Release Notes · CI/CD Pipeline generator |
| Planning | Issue Triage · Issue Planner · Daily Standup |

## Architecture

```
            ┌──────────────────────────┐
 Browser ──►│ Nginx + React (Vite, TS) │  :8080
            └────────────┬─────────────┘
                         │ /api
            ┌────────────▼─────────────┐        ┌──────────────┐
            │  FastAPI (2 workers)     │◄──────►│ PostgreSQL 16│
            │  auth · repos · helpers  │        └──────────────┘
            └──────┬──────────┬────────┘
                   │ Celery   │ Groq LLM (key rotation)
            ┌──────▼──────┐   │
            │    Redis    │   │        ┌──────────────┐
            └──────┬──────┘   │        │    MLflow    │
            ┌──────▼──────────▼──┐────►│  run metrics │
            │   Celery worker    │     └──────────────┘
            │ analysis pipeline  │──► GitHub API
            └────────────────────┘
```

Full details — components, request flow and the database schema — are in
[architecture_and_schema.md](architecture_and_schema.md).

## Quick start (Docker Desktop)

**Prerequisites:** Docker Desktop and Python 3 (only used to generate secrets).

```bash
git clone https://github.com/kritikGianta/RepoNexus.git
cd RepoNexus
python scripts/bootstrap_env.py      # creates backend/.env with fresh JWT/encryption secrets
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| App | http://localhost:8080 |
| API docs (OpenAPI) | http://localhost:8000/docs |
| Readiness probe | http://localhost:8000/health/ready |
| MLflow | http://localhost:5000 |

The stack boots without any third-party keys; the app shows a banner listing what is still missing.

### Add your API keys

Edit `backend/.env`, then run `docker compose up -d` again to apply.

1. **GitHub OAuth app** (required to sign in) — GitHub → Settings → Developer settings → OAuth Apps → *New OAuth App*
   - Homepage URL: `http://localhost:8080`
   - Authorization callback URL: `http://localhost:8080/auth/github/callback`
   - Copy the values into `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
2. **Groq** (required for AI features) — create a free key at https://console.groq.com and set `GROQ_API_KEY`.
   Add more keys as a comma-separated `GROQ_API_KEYS` list; they rotate automatically when one is rate limited.

Without a Groq key, static analysis, scoring, trends and the local models still work; AI explanations,
chat and the generators return a clear "not configured" message.

### Everyday commands

```bash
docker compose ps                    # service health
docker compose logs -f backend worker
docker compose down                  # stop, keep data
docker compose down -v               # stop and wipe database, queue and MLflow data
```

## Local development without Docker

```bash
# Backend (SQLite, analyses run in-process — no Redis needed)
cd backend
python -m venv .venv && .venv/Scripts/activate      # Windows (use `source .venv/bin/activate` on macOS/Linux)
pip install -r requirements-dev.txt
python ../scripts/bootstrap_env.py
uvicorn app.main:app --reload --port 8000

# Frontend (second terminal) — proxies /api to :8000
cd frontend
npm install
npm run dev                                          # http://localhost:5175
```

For this mode, set the OAuth app callback (or a second OAuth app) to
`http://localhost:5175/auth/github/callback` and keep `GITHUB_REDIRECT_URI` in `backend/.env` in sync.

## Testing

```bash
cd backend && ruff check app ../own_models && pytest -q
cd frontend && npm run build
```

CI (`.github/workflows/ci.yml`) runs the same lint, tests and type-checked build, then verifies both
Docker images build. There is no deployment stage — RepoNexus is run locally.

## Configuration reference

All backend settings live in [`backend/.env.example`](backend/.env.example). The most relevant:

| Variable | Default | Purpose |
|----------|---------|---------|
| `JWT_SECRET`, `ENCRYPTION_KEY` | generated | Session signing and at-rest encryption of GitHub tokens |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | — | GitHub OAuth sign-in |
| `GROQ_API_KEY` / `GROQ_API_KEYS` | — | LLM features; multiple keys rotate on rate limits |
| `TASK_EXECUTION_MODE` | `inline` (`celery` in Docker) | Where analyses run |
| `MAX_FILES_PER_ANALYSIS` | `200` | Upper bound on files fetched per run |
| `MAX_AI_ENRICHMENTS` | `10` | Highest-impact findings that get an AI explanation per run |
| `GITHUB_WEBHOOK_SECRET` | — | HMAC secret for push webhooks (required in production mode) |

Push webhooks need a public URL; when testing locally, expose port 8000 with a tunnel (for example
`ngrok http 8000`) and set `API_BASE_URL` to the tunnel address before registering the webhook.

## Project structure

```
RepoNexus/
├── backend/
│   ├── app/
│   │   ├── api/          # routes, auth dependency, middleware (rate limit, security headers, request IDs)
│   │   ├── core/         # settings, security, OAuth, encryption, LLM client
│   │   ├── db/           # async SQLAlchemy engine/session
│   │   ├── ml/           # analysis pipeline, TF-IDF code retriever, MLflow tracker
│   │   ├── models/       # ORM models
│   │   ├── schemas/      # Pydantic contracts
│   │   ├── services/     # business logic, GitHub and AI helpers
│   │   └── tasks/        # Celery app and analysis dispatch
│   ├── alembic/          # migrations (applied automatically by the container)
│   └── tests/
├── frontend/             # React 18 + Vite + TypeScript + Tailwind
├── own_models/           # local models: XGBoost debt scorer, scanners, issue triage
├── scripts/              # bootstrap_env.py
└── docker-compose.yml
```

## Security notes

- GitHub access tokens are encrypted with Fernet before they are stored.
- JWTs are signed with `JWT_SECRET`; OAuth `state` is a signed, short-lived token.
- Webhook payloads are verified with HMAC-SHA256 when `GITHUB_WEBHOOK_SECRET` is set.
- Rate limiting is shared through Redis when the Celery stack is running.
- Containers run as a non-root user; secrets are only read from `backend/.env`, which is git-ignored.
