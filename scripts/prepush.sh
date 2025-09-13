#!/usr/bin/env bash
set -euo pipefail

echo "[pre-push] Running tests before push..."

# Sync env (optional if already synced)
if command -v uv >/dev/null 2>&1; then
  echo "[pre-push] Ensuring venv is ready (uv sync --frozen if lock present)"
  if [ -f uv.lock ]; then
    uv sync --frozen >/dev/null 2>&1 || true
  else
    uv sync >/dev/null 2>&1 || true
  fi
fi

echo "[pre-push] pytest"
uv run pytest -q

echo "[pre-push] ruff (warn-only)"
if ! uv run ruff check || true; then
  echo "[pre-push] ruff found issues (non-blocking)"
fi

echo "[pre-push] mypy (warn-only)"
if ! uv run mypy || true; then
  echo "[pre-push] mypy found issues (non-blocking)"
fi

echo "[pre-push] OK"


