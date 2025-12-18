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
PORT="${PORT:-8000}"
BASE_URL="http://${HOST}:${PORT}"
OUT_DIR="${OUT_DIR:-artifacts/playwright}"

mkdir -p "${OUT_DIR}"

SERVER_PID=""
if curl -fsS "${BASE_URL}/healthz" >/dev/null 2>&1; then
  echo "[ui] using existing server at ${BASE_URL}"
else
  echo "[ui] starting server on ${BASE_URL}"
  uv run uvicorn app.main:app --host "${HOST}" --port "${PORT}" > "${OUT_DIR}/uvicorn.log" 2>&1 &
  SERVER_PID="$!"
  trap 'kill "${SERVER_PID}" >/dev/null 2>&1 || true' EXIT
fi

echo "[ui] waiting for healthz..."
for _ in $(seq 1 60); do
  if curl -fsS "${BASE_URL}/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

if ! curl -fsS "${BASE_URL}/healthz" >/dev/null 2>&1; then
  echo "[ui] server failed to start; see ${OUT_DIR}/uvicorn.log"
  exit 1
fi

declare -a VIEWPORTS=("1280,800" "768,1024" "390,844")
declare -a SCHEMES=("light" "dark")

capture() {
  local path="$1"
  local slug="$2"
  local wait_for="$3"

  for scheme in "${SCHEMES[@]}"; do
    for vp in "${VIEWPORTS[@]}"; do
      local safe_vp="${vp/,/x}"
      local target="${BASE_URL}${path}"
      local out="${OUT_DIR}/${scheme}-${slug}-${safe_vp}.png"

      echo "[ui] ${scheme} ${vp} ${target} -> ${out}"
      if [ -n "${wait_for}" ]; then
        npx -y playwright screenshot -b firefox --color-scheme "${scheme}" --viewport-size "${vp}" --full-page \
          --wait-for-selector "${wait_for}" "${target}" "${out}"
      else
        npx -y playwright screenshot -b firefox --color-scheme "${scheme}" --viewport-size "${vp}" --full-page \
          "${target}" "${out}"
      fi
    done
  done
}

capture "/" "about" ""
capture "/blog" "blog" ""
capture "/blog/semantic-entropy-probe-comparison" "semantic-entropy-probe-comparison" ".marimo-embed iframe"
capture "/coursework" "coursework" "#cw-viz svg"

echo "[ui] done -> ${OUT_DIR}"
