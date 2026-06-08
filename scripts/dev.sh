#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-127.0.0.1}"
SITE_PORT="${SITE_PORT:-8000}"
EDITOR_PORT="${EDITOR_PORT:-8001}"
NEXT_HOST="${NEXT_HOST:-127.0.0.1}"
NEXT_PORT="${NEXT_PORT:-3000}"

FRONTEND_PUBLIC_STATIC="${WORKDIR:-/home/ubuntu/personal-site}/frontend/public/static"
APP_STATIC_DIR="${WORKDIR:-/home/ubuntu/personal-site}/app/static"

sync_frontend_static() {
  mkdir -p "${FRONTEND_PUBLIC_STATIC}"
  for file in coursework.css coursework.js courses.json; do
    if [ -f "${APP_STATIC_DIR}/${file}" ]; then
      cp -f "${APP_STATIC_DIR}/${file}" "${FRONTEND_PUBLIC_STATIC}/${file}"
    fi
  done
}

sync_frontend_static

echo "[dev] starting personal site on http://${HOST}:${SITE_PORT}"
uv run uvicorn app.main:app --host "${HOST}" --port "${SITE_PORT}" --reload &
SITE_PID="$!"

echo "[dev] starting coursework editor on http://${HOST}:${EDITOR_PORT}"
uv run uvicorn scripts.coursework_editor:app --host "${HOST}" --port "${EDITOR_PORT}" --reload &
EDITOR_PID="$!"

echo "[dev] starting Next.js frontend on http://${NEXT_HOST}:${NEXT_PORT}"
npm --prefix frontend run dev -- --hostname "${NEXT_HOST}" --port "${NEXT_PORT}" &
NEXT_PID="$!"

cleanup() {
  kill "${SITE_PID}" >/dev/null 2>&1 || true
  kill "${EDITOR_PID}" >/dev/null 2>&1 || true
  kill "${NEXT_PID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "[dev] open:"
echo "  site (backend):  http://${HOST}:${SITE_PORT}"
echo "  next frontend:   http://${NEXT_HOST}:${NEXT_PORT}"
echo "  editor:          http://${HOST}:${EDITOR_PORT}"
echo "[dev] press Ctrl+C to stop"

wait
