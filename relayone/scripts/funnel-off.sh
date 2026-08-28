#!/usr/bin/env bash
set -Eeuo pipefail

tailscale funnel --https=443 off
tailscale funnel status
