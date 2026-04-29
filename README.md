# RepoNexus

**RepoNexus** is an AI-powered repository intelligence and governance platform. Connect your GitHub repositories, analyze code and infrastructure for complexity, security, and maintainability, and track repository health and trends over time.

## Architecture

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   React Frontend │◄──►│  FastAPI Backend  │◄──►│  MySQL / SQLite  │
│   Vite + TS      │    │  + Celery Workers │    │  (async)         │
└──────────────────┘    └────────┬─────────┘    └──────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌─────────┐ ┌──────────┐ ┌──────────┐
              │  Redis   │ │  Groq AI │ │  MLflow  │
              │  (Queue) │ │  (LLM)   │ │ (Track)  │
              └─────────┘ └──────────┘ └──────────┘
```

## Features

- **GitHub OAuth** — Secure authentication with encrypted token storage
- **Multi-signal Analysis** — AST, static analysis, complexity metrics, NLP
- **AI Explanations** — RAG-backed insights using Groq LLM + FAISS
- **Trend Tracking** — Historical debt score visualization with Recharts
- **Webhook Integration** — Auto-analyze on push to default branch
- **Production-ready** — Alembic migrations, rate limiting, correlation IDs, structured logging

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env   # Fill in your credentials
pip install -r requirements.txt
alembic upgrade head   # Run DB migrations
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
cp .env.example .env   # Set VITE_API_URL and VITE_GITHUB_CLIENT_ID
npm install
npm run dev
```

### Docker
```bash
docker-compose up -d
```

## Testing

```bash
# Backend tests
cd backend && pytest -v

# Frontend build validation
cd frontend && npm run build
```

## Deployment

| Component | Free Hosting Option |
|-----------|-------------------|
| Frontend  | Vercel / Netlify  |
| Backend   | Render / Railway  |
| Database  | PlanetScale / Render PostgreSQL |
| Redis     | Upstash           |

See `backend/README.md` and `frontend/README.md` for detailed deployment guides.

## Project Structure

```
RepoNexus/
├── backend/              # FastAPI + Celery backend
│   ├── app/              # Application code
│   │   ├── api/          # Routes + middleware
│   │   ├── core/         # Config, security, OAuth
│   │   ├── db/           # Database session
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   ├── ml/           # ML analysis pipeline
│   │   └── tasks/        # Celery tasks
│   ├── alembic/          # Database migrations
│   └── tests/            # Unit + integration tests
├── frontend/             # React + Vite + TypeScript
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Route pages
│       ├── stores/       # Zustand state
│       ├── lib/          # API client + utilities
│       └── types/        # TypeScript interfaces
├── infra/                # K8s manifests
└── docker-compose.yml
```
