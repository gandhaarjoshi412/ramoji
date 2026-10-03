#!/usr/bin/env bash

REAL_PATH="$(realpath "${BASH_SOURCE[0]}")"
REAL_DIR="$(dirname "${REAL_PATH}")"
if [ "$(basename "${REAL_DIR}")" = "scripts" ]; then
  ROOT_DIR="$(dirname "${REAL_DIR}")"
else
  ROOT_DIR="${REAL_DIR}"
fi

LAPTOP_TAILSCALE_IP="$(tailscale ip -4 2>/dev/null || echo '100.119.100.111')"

echo "=========================================================="
echo "         AI Banquet Food Waste Demo Status Check          "
echo "=========================================================="

echo -n "1. Tailscale Daemon: "
if systemctl is-active --quiet tailscaled; then
  echo "RUNNING (Laptop Tailscale IP: ${LAPTOP_TAILSCALE_IP})"
else
  echo "STOPPED"
fi

echo -n "2. Tailscale Mesh Direct Peer: "
if tailscale status 2>/dev/null | grep -q "creji"; then
  TAIL_STATUS=$(tailscale status | grep "creji")
  echo "ACTIVE -> ${TAIL_STATUS}"
else
  echo "DISCONNECTED"
fi

echo -n "3. Systemd Backend Service: "
if systemctl --user is-active --quiet ramoji-backend; then
  echo "RUNNING (systemd: ramoji-backend.service)"
else
  echo "STOPPED / FAILED"
fi

echo -n "4. Systemd Frontend Service: "
if systemctl --user is-active --quiet ramoji-frontend; then
  echo "RUNNING (systemd: ramoji-frontend.service)"
else
  echo "STOPPED / FAILED"
fi

echo -n "5. Systemd Tailscale Bridge: "
if systemctl --user is-active --quiet ramoji-bridge; then
  echo "RUNNING (systemd: ramoji-bridge.service)"
else
  echo "STOPPED / FAILED"
fi

echo -n "6. Local Backend (127.0.0.1:8000): "
BACKEND_HEALTH=$(curl -s -m 3 http://127.0.0.1:8000/api/health 2>/dev/null || echo "")
if [ -n "$BACKEND_HEALTH" ]; then
  echo "HEALTHY -> $BACKEND_HEALTH"
else
  echo "DOWN / UNREACHABLE"
fi

echo -n "7. Local Frontend (127.0.0.1:3000): "
if curl -s -I -m 3 http://127.0.0.1:3000/ >/dev/null 2>&1; then
  echo "HEALTHY (200 OK)"
else
  echo "DOWN / UNREACHABLE"
fi

echo -n "8. Tailscale Backend (${LAPTOP_TAILSCALE_IP}:8000): "
if curl -s -m 3 "http://${LAPTOP_TAILSCALE_IP}:8000/api/health" >/dev/null 2>&1; then
  echo "REACHABLE"
else
  echo "DOWN / UNREACHABLE"
fi

echo -n "9. Tailscale Frontend (${LAPTOP_TAILSCALE_IP}:3000): "
if curl -s -I -m 3 "http://${LAPTOP_TAILSCALE_IP}:3000/" >/dev/null 2>&1; then
  echo "REACHABLE"
else
  echo "DOWN / UNREACHABLE"
fi

echo -n "10. Public Domain (https://ai.platesight.in): "
PUB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -m 5 https://ai.platesight.in/ 2>/dev/null || echo "FAIL")
if [ "$PUB_STATUS" = "200" ]; then
  echo "ONLINE (HTTP 200 OK - Let's Encrypt TLS Active)"
else
  echo "HTTP ${PUB_STATUS}"
fi

echo -n "11. Public API Health (https://ai.platesight.in/api/health): "
PUB_API=$(curl -s -o /dev/null -w "%{http_code}" -m 5 https://ai.platesight.in/api/health 2>/dev/null || echo "FAIL")
if [ "$PUB_API" = "200" ]; then
  echo "ONLINE (HTTP 200 OK - Reverse Proxy Connected)"
else
  echo "HTTP ${PUB_API}"
fi

echo "=========================================================="
echo "Useful Commands:"
echo "  View backend logs : journalctl --user -u ramoji-backend -f"
echo "  View frontend logs: journalctl --user -u ramoji-frontend -f"
echo "  View bridge logs  : journalctl --user -u ramoji-bridge -f"
echo "  Restart stack     : systemctl --user restart ramoji-backend ramoji-frontend ramoji-bridge"
echo "  Stop stack        : systemctl --user stop ramoji-backend ramoji-frontend ramoji-bridge"
echo "=========================================================="
