#!/usr/bin/env bash
set -Eeuo pipefail

relay_port="${RELAYONE_PORT:-6060}"

curl --fail --silent --show-error "http://127.0.0.1:${relay_port}/api/health/ready" >/dev/null
tailscale funnel --bg --yes "http://127.0.0.1:${relay_port}"
tailscale funnel status
