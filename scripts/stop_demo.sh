#!/usr/bin/env bash

REAL_PATH="$(realpath "${BASH_SOURCE[0]}")"
REAL_DIR="$(dirname "${REAL_PATH}")"
if [ "$(basename "${REAL_DIR}")" = "scripts" ]; then
  ROOT_DIR="$(dirname "${REAL_DIR}")"
else
  ROOT_DIR="${REAL_DIR}"
fi

echo "Stopping AI Banquet Food Waste Demo services..."

for pidfile in "${ROOT_DIR}/run/"*.pid; do
  if [ -f "$pidfile" ]; then
    PID=$(cat "$pidfile")
    NAME=$(basename "$pidfile" .pid)
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
      echo "Killing $NAME (PID $PID)..."
      kill "$PID" 2>/dev/null || true
      sleep 0.5
      if kill -0 "$PID" 2>/dev/null; then
        kill -9 "$PID" 2>/dev/null || true
      fi
    fi
    rm -f "$pidfile"
  fi
done

# Cleanup any stray uvicorn or socat listening on ports 8000 or 3000 if needed
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "socat.*LISTEN:8000" 2>/dev/null || true
pkill -f "socat.*LISTEN:3000" 2>/dev/null || true

echo "All services stopped."
