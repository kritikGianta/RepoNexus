# syntax=docker/dockerfile:1.7

FROM python:3.11-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app
COPY backend/requirements.txt ./
RUN python -m pip install --upgrade pip && pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

RUN useradd --create-home --shell /bin/bash appuser
WORKDIR /app

COPY --from=builder /wheels /wheels
RUN python -m pip install --no-cache /wheels/* && rm -rf /wheels

# Copy application code
COPY backend/app ./app

# Include ML models (debt scorer, zombie scanner, etc.)
COPY own_models ./own_models

# Create directories for runtime data
RUN mkdir -p /app/rag_stores && chown appuser:appuser /app/rag_stores

USER appuser
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
