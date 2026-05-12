#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_URL="http://127.0.0.1:8000"
FRONTEND_URL="http://127.0.0.1:5173"

find_python() {
  if command -v python >/dev/null 2>&1; then
    PYTHON_CMD=(python)
  elif command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD=(python3)
  elif command -v py >/dev/null 2>&1; then
    PYTHON_CMD=(py -3)
  else
    echo "Python was not found. Install Python 3.11+ and run this file again."
    exit 1
  fi
}

find_npm() {
  if command -v npm >/dev/null 2>&1; then
    NPM_CMD=(npm)
  elif command -v npm.cmd >/dev/null 2>&1; then
    NPM_CMD=(npm.cmd)
  else
    echo "npm was not found. Install Node.js and run this file again."
    exit 1
  fi
}

free_port() {
  local port="$1"
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "\$ids = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach (\$id in \$ids) { if (\$id -and \$id -ne 0) { Stop-Process -Id \$id -Force -ErrorAction SilentlyContinue } }" >/dev/null 2>&1 || true
  elif command -v lsof >/dev/null 2>&1; then
    lsof -ti tcp:"$port" | xargs -r kill -9 || true
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" >/dev/null 2>&1 || true
  fi
}

open_frontend() {
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process '$FRONTEND_URL'" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$FRONTEND_URL" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$FRONTEND_URL" >/dev/null 2>&1 || true
  fi
}

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then kill "$BACKEND_PID" >/dev/null 2>&1 || true; fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then kill "$FRONTEND_PID" >/dev/null 2>&1 || true; fi
}

trap cleanup EXIT INT TERM

find_python
find_npm

echo "Installing backend requirements..."
"${PYTHON_CMD[@]}" -m pip install -r "$BACKEND_DIR/requirements.txt"

echo "Installing frontend packages..."
cd "$FRONTEND_DIR"
"${NPM_CMD[@]}" install

echo "Preparing ports 8000 and 5173..."
free_port 8000
free_port 5173

echo "Starting backend: $BACKEND_URL"
cd "$ROOT_DIR"
"${PYTHON_CMD[@]}" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

echo "Starting frontend: $FRONTEND_URL"
cd "$FRONTEND_DIR"
VITE_BACKEND_URL="$BACKEND_URL" "${NPM_CMD[@]}" run dev -- --host 127.0.0.1 --port 5173 &
FRONTEND_PID=$!

echo
echo "AURA demo is starting."
echo "Backend:  $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo "Keep this window open. Press Ctrl+C to stop both servers."

sleep 6
open_frontend

while kill -0 "$BACKEND_PID" >/dev/null 2>&1 && kill -0 "$FRONTEND_PID" >/dev/null 2>&1; do
  sleep 2
done

echo "One server stopped. Shutting down the other server."
