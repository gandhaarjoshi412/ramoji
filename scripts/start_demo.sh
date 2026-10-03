#!/usr/bin/env bash
set -eo pipefail

REAL_PATH="$(realpath "${BASH_SOURCE[0]}")"
REAL_DIR="$(dirname "${REAL_PATH}")"
if [ "$(basename "${REAL_DIR}")" = "scripts" ]; then
  ROOT_DIR="$(dirname "${REAL_DIR}")"
else
  ROOT_DIR="${REAL_DIR}"
fi

cd "${ROOT_DIR}"

mkdir -p run logs

# Load environment variables if .env exists
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"

# Detect Laptop Tailscale IP
LAPTOP_TAILSCALE_IP="${LAPTOP_TAILSCALE_IP:-$(tailscale ip -4 2>/dev/null || echo '100.119.100.111')}"

echo "=================================================="
echo " Starting AI Banquet Food Waste Platform (Laptop) "
echo "=================================================="
echo " Root Dir       : ${ROOT_DIR}"
echo " Tailscale IP   : ${LAPTOP_TAILSCALE_IP}"
echo " Backend Target : ${BACKEND_HOST}:${BACKEND_PORT}"
echo " Frontend Target: ${FRONTEND_HOST}:${FRONTEND_PORT}"
echo "=================================================="

# Stop any lingering previous instances
"${ROOT_DIR}/scripts/stop_demo.sh" >/dev/null 2>&1 || true

# 1. Start Backend (FastAPI + GPU YOLO)
echo "Starting Backend service..."
nohup "${ROOT_DIR}/backend/venv/bin/uvicorn" app.main:app \
  --app-dir "${ROOT_DIR}/backend" \
  --host "${BACKEND_HOST}" \
  --port "${BACKEND_PORT}" \
  --workers 1 \
  --timeout-keep-alive 120 \
  </dev/null > "${ROOT_DIR}/logs/backend.log" 2>&1 &
BACKEND_PID=$!
disown "${BACKEND_PID}" 2>/dev/null || true
echo "${BACKEND_PID}" > "${ROOT_DIR}/run/backend.pid"

# 2. Start Frontend (Next.js Production Server)
echo "Starting Frontend service..."
(
  cd "${ROOT_DIR}/frontend"
  exec nohup npm run start -- -p "${FRONTEND_PORT}" -H "${FRONTEND_HOST}" \
    </dev/null > "${ROOT_DIR}/logs/frontend.log" 2>&1
) &
FRONTEND_PID=$!
disown "${FRONTEND_PID}" 2>/dev/null || true
echo "${FRONTEND_PID}" > "${ROOT_DIR}/run/frontend.pid"

# 3. If bound to 127.0.0.1, bridge Tailscale interface specifically to localhost
if [ "${BACKEND_HOST}" = "127.0.0.1" ] && [ -n "${LAPTOP_TAILSCALE_IP}" ]; then
  echo "Bridging Tailscale IP ${LAPTOP_TAILSCALE_IP}:${BACKEND_PORT} -> 127.0.0.1:${BACKEND_PORT}..."
  nohup socat "TCP4-LISTEN:${BACKEND_PORT},bind=${LAPTOP_TAILSCALE_IP},reuseaddr,fork" "TCP4:127.0.0.1:${BACKEND_PORT}" \
    </dev/null > "${ROOT_DIR}/logs/socat_backend.log" 2>&1 &
  SOCAT_BACKEND_PID=$!
  disown "${SOCAT_BACKEND_PID}" 2>/dev/null || true
  echo "${SOCAT_BACKEND_PID}" > "${ROOT_DIR}/run/socat_backend.pid"
fi

if [ "${FRONTEND_HOST}" = "127.0.0.1" ] && [ -n "${LAPTOP_TAILSCALE_IP}" ]; then
  echo "Bridging Tailscale IP ${LAPTOP_TAILSCALE_IP}:${FRONTEND_PORT} -> 127.0.0.1:${FRONTEND_PORT}..."
  nohup socat "TCP4-LISTEN:${FRONTEND_PORT},bind=${LAPTOP_TAILSCALE_IP},reuseaddr,fork" "TCP4:127.0.0.1:${FRONTEND_PORT}" \
    </dev/null > "${ROOT_DIR}/logs/socat_frontend.log" 2>&1 &
  SOCAT_FRONTEND_PID=$!
  disown "${SOCAT_FRONTEND_PID}" 2>/dev/null || true
  echo "${SOCAT_FRONTEND_PID}" > "${ROOT_DIR}/run/socat_frontend.pid"
fi

# Wait and verify readiness
echo "Verifying service readiness..."
READY=0
for i in {1..15}; do
  sleep 1
  if curl -s "http://127.0.0.1:${BACKEND_PORT}/api/health" >/dev/null 2>&1 && \
     curl -s "http://127.0.0.1:${FRONTEND_PORT}/" >/dev/null 2>&1; then
    READY=1
    break
  fi
done

if [ ${READY} -eq 1 ]; then
  echo "✅ Services successfully started and verified healthy!"
  echo "   Backend : http://${BACKEND_HOST}:${BACKEND_PORT}/api/health"
  echo "   Frontend: http://${FRONTEND_HOST}:${FRONTEND_PORT}/"
  echo "   Tailscale Endpoint: http://${LAPTOP_TAILSCALE_IP}:${FRONTEND_PORT}/"
  echo "   Public Domain     : https://ai.platesight.in"
else
  echo "⚠️ Services did not report ready within 15 seconds. Check logs in logs/:"
  tail -n 20 "${ROOT_DIR}/logs/backend.log" || true
  tail -n 20 "${ROOT_DIR}/logs/frontend.log" || true
fi
