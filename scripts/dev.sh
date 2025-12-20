#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-127.0.0.1}"
SITE_PORT="${SITE_PORT:-8000}"
EDITOR_PORT="${EDITOR_PORT:-8001}"

echo "[dev] starting personal site on http://${HOST}:${SITE_PORT}"
uv run uvicorn app.main:app --host "${HOST}" --port "${SITE_PORT}" --reload &
SITE_PID="$!"

echo "[dev] starting coursework editor on http://${HOST}:${EDITOR_PORT}"
uv run uvicorn scripts.coursework_editor:app --host "${HOST}" --port "${EDITOR_PORT}" --reload &
EDITOR_PID="$!"

cleanup() {
  kill "${SITE_PID}" >/dev/null 2>&1 || true
  kill "${EDITOR_PID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "[dev] open:"
echo "  site:   http://${HOST}:${SITE_PORT}"
echo "  editor: http://${HOST}:${EDITOR_PORT}"
echo "[dev] press Ctrl+C to stop"

wait

