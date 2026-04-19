#!/usr/bin/env bash
# Start FastAPI backend (:8000) then Vite frontend (:5173).
# Uses backend/.env if present (SQLite default, or Cloud SQL if configured).
# Ctrl+C stops Vite and the backend child process.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

for port in 8000 5173; do
  lsof -ti:"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
done

echo "Starting backend (./backend/run.sh)..."
(cd "$ROOT/backend" && ./run.sh) &
BACK_PID=$!

cleanup() {
  echo ""
  echo "Stopping backend (pid $BACK_PID)..."
  kill "$BACK_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
    echo "Backend OK: http://127.0.0.1:8000/health"
    break
  fi
  if ! kill -0 "$BACK_PID" 2>/dev/null; then
    echo "Backend process exited; check backend logs above."
    exit 1
  fi
  sleep 1
done

if ! curl -sf "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
  echo "Timeout waiting for backend on :8000"
  exit 1
fi

echo "Starting frontend (pnpm run dev)..."
echo "Open http://localhost:5173/ (Vite may bind IPv6; use localhost not 127.0.0.1 if the page fails to load)."
pnpm run dev
