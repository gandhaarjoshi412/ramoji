#!/usr/bin/env bash
set -eo pipefail

LAPTOP_TAILSCALE_IP="$(tailscale ip -4 2>/dev/null || echo '100.119.100.111')"

echo "Starting Tailscale private bridge on ${LAPTOP_TAILSCALE_IP}..."

socat TCP4-LISTEN:8000,bind="${LAPTOP_TAILSCALE_IP}",reuseaddr,fork TCP4:127.0.0.1:8000 &
P1=$!

socat TCP4-LISTEN:3000,bind="${LAPTOP_TAILSCALE_IP}",reuseaddr,fork TCP4:127.0.0.1:3000 &
P2=$!

cleanup() {
  kill "${P1}" "${P2}" 2>/dev/null || true
  wait "${P1}" "${P2}" 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM

wait -n "${P1}" "${P2}"
