#!/usr/bin/env bash
set -euo pipefail

# Generate UI screenshots across a few key viewports.
#
# Requirements:
# - Python deps installed (`uv sync --all-extras`)
# - Playwright browser installed (Firefox recommended):
#     npx -y playwright install firefox
#
# Usage:
#   scripts/ui_screenshots.sh
#
# Output:
#   artifacts/playwright/*.png

HOST="${HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
NEXT_PORT="${NEXT_PORT:-3000}"
BASE_OUT_DIR="${OUT_DIR:-artifacts/playwright}"

BACKEND_BASE="http://${HOST}:${BACKEND_PORT}"
NEXT_BASE="http://${HOST}:${NEXT_PORT}"

mkdir -p "${BASE_OUT_DIR}"

is_up() {
  local base="$1"
  local path="$2"
  curl -fsS "${base}${path}" >/dev/null 2>&1
}

if is_up "${NEXT_BASE}" "/"; then
  BASE_URL="${NEXT_BASE}"
  echo "[ui] using next server at ${BASE_URL}"
elif is_up "${BACKEND_BASE}" "/healthz"; then
  BASE_URL="${BACKEND_BASE}"
  echo "[ui] using backend server at ${BASE_URL}"
else
  echo "[ui] starting backend server at ${BACKEND_BASE}"
  uv run uvicorn app.main:app --host "${HOST}" --port "${BACKEND_PORT}" > "${BASE_OUT_DIR}/uvicorn.log" 2>&1 &
  SERVER_PID="$!"
  trap 'kill "${SERVER_PID}" >/dev/null 2>&1 || true' EXIT

  for _ in $(seq 1 80); do
    if is_up "${BACKEND_BASE}" "/healthz"; then
      break
    fi
    sleep 0.25
  done

  if ! is_up "${BACKEND_BASE}" "/healthz"; then
    echo "[ui] server failed to start; see ${BASE_OUT_DIR}/uvicorn.log"
    exit 1
  fi

  BASE_URL="${BACKEND_BASE}"
fi

VIEWPORTS=("1280,800" "768,1024" "390,844")
SCHEMES=("light" "dark")

ROUTES=(
  "/:home"
  "/about:about"
  "/blog:blog"
  "/blog/semantic-entropy-probe-comparison:semantic-entropy-probe-comparison"
  "/coursework:coursework"
)

declare -A WAIT_SELECTOR
WAIT_SELECTOR["/"]="#content"
WAIT_SELECTOR["/about"]="#content"
WAIT_SELECTOR["/blog"]="#content"
WAIT_SELECTOR["/blog/semantic-entropy-probe-comparison"]="#content"
WAIT_SELECTOR["/coursework"]="#cw-viz"

capture() {
  local route="$1"
  local slug="$2"
  local selector="${WAIT_SELECTOR["${route}"]:-}"

  for scheme in "${SCHEMES[@]}"; do
    for viewport in "${VIEWPORTS[@]}"; do
      local safe_viewport="${viewport/,/x}"
      local target="${BASE_URL}${route}"
      local out="${BASE_OUT_DIR}/${scheme}-${slug}-${safe_viewport}.png"

      echo "[ui] ${scheme} ${viewport} ${target} -> ${out}"
      if [ -n "${selector}" ]; then
        npx -y playwright screenshot -b firefox --color-scheme "${scheme}" --viewport-size "${viewport}" --full-page --wait-for-selector "${selector}" "${target}" "${out}"
      else
        npx -y playwright screenshot -b firefox --color-scheme "${scheme}" --viewport-size "${viewport}" --full-page "${target}" "${out}"
      fi
    done
  done
}

for route_meta in "${ROUTES[@]}"; do
  route="${route_meta%%:*}"
  slug="${route_meta##*:}"
  capture "${route}" "${slug}"
done

echo "[ui] done -> ${BASE_OUT_DIR}"
