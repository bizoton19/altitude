#!/bin/bash
# Run the API against local Postgres from docker-compose (see repo root docker-compose.yml).
# 1. Start DB:  docker compose up -d postgres   (from repo root)
# 2. Run:       ./run_postgres_local.sh

cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:$PATH"

# Default matches docker-compose.yml: user altitude, password altitude_dev, db altitude
export DATABASE_URL="${DATABASE_URL:-postgresql+asyncpg://altitude:altitude_dev@127.0.0.1:5432/altitude}"

# Disable Cloud SQL URL override in app/config.py so DATABASE_URL is used
export CLOUD_SQL_INSTANCE=""
export CLOUD_SQL_USER=""
export CLOUD_SQL_PASSWORD=""

exec ./run.sh
