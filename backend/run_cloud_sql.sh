#!/bin/bash
# Start the API using Google Cloud SQL for PostgreSQL (not SQLite).
# Configure backend/.env — see CLOUD_SQL_SETUP.md
#
# Required in .env:
#   CLOUD_SQL_INSTANCE=PROJECT_ID:REGION:altitudedb1
#   CLOUD_SQL_USER=...
#   CLOUD_SQL_PASSWORD=...
# Optional:
#   CLOUD_SQL_DATABASE=altitude          (default in app is "postgres" — set this for app DB)
#   CLOUD_SQL_USE_UNIX_SOCKET=true       (on GCP: Cloud Run / GCE with connector)
#   CLOUD_SQL_USE_UNIX_SOCKET=false      (local laptop + Cloud SQL Auth Proxy to 127.0.0.1:5432)
#   CLOUD_SQL_HOST=127.0.0.1
#   CLOUD_SQL_PORT=5432

cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:$PATH"

if ! command -v uv &> /dev/null; then
    echo "❌ uv is not installed. Install: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

echo "🔍 Checking Cloud SQL configuration (from environment + backend/.env)..."
uv run python -c "
import sys
from app.config import settings
if not (settings.CLOUD_SQL_INSTANCE and settings.CLOUD_SQL_USER and settings.CLOUD_SQL_PASSWORD):
    print('❌ Missing Cloud SQL settings.', file=sys.stderr)
    print('', file=sys.stderr)
    print('Add to backend/.env (see CLOUD_SQL_SETUP.md):', file=sys.stderr)
    print('  CLOUD_SQL_INSTANCE=YOUR_PROJECT:YOUR_REGION:altitudedb1', file=sys.stderr)
    print('  CLOUD_SQL_DATABASE=altitude', file=sys.stderr)
    print('  CLOUD_SQL_USER=...', file=sys.stderr)
    print('  CLOUD_SQL_PASSWORD=...', file=sys.stderr)
    print('', file=sys.stderr)
    print('Local dev with Cloud SQL Auth Proxy: also set', file=sys.stderr)
    print('  CLOUD_SQL_USE_UNIX_SOCKET=false', file=sys.stderr)
    print('  CLOUD_SQL_HOST=127.0.0.1', file=sys.stderr)
    sys.exit(1)
print('✅ Cloud SQL instance:', settings.CLOUD_SQL_INSTANCE)
print('   Database:', settings.CLOUD_SQL_DATABASE)
print('   Unix socket:', settings.CLOUD_SQL_USE_UNIX_SOCKET)
"

if [ $? -ne 0 ]; then
    exit 1
fi

echo "📦 Syncing dependencies with uv..."
uv sync

echo "🚀 Starting backend (PostgreSQL via Google Cloud SQL)..."
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
