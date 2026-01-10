#!/bin/bash
# Simple script to run the backend with uv and uvicorn

cd "$(dirname "$0")"

# Add uv to PATH if it's in the default location
export PATH="$HOME/.local/bin:$PATH"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ uv is not installed. Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Sync dependencies with uv
echo "📦 Syncing dependencies with uv..."
uv sync

# Run with uvicorn
echo "🚀 Starting backend server..."
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

