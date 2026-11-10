#!/bin/sh
set -e

# Apply database migrations before the API starts. The worker sets RUN_MIGRATIONS=false so
# only one container ever migrates.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] applying database migrations"
  attempt=1
  until alembic upgrade head; do
    if [ "$attempt" -ge 10 ]; then
      echo "[entrypoint] migrations failed after $attempt attempts" >&2
      exit 1
    fi
    echo "[entrypoint] database not ready, retrying in 3s ($attempt/10)"
    attempt=$((attempt + 1))
    sleep 3
  done
fi

exec "$@"
