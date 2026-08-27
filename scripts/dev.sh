#!/usr/bin/env bash
#
# Starts the Crezo dev stack on stable, permanent URLs.
#
#   ./scripts/dev.sh          normal start
#   ./scripts/dev.sh --clear  clear the Metro cache (after adding native modules
#                             or new route files)
#
#   app      exp://metro.crezo.studio
#   backend  https://api.crezo.studio
#
# Both are served by a single named Cloudflare tunnel (`crezo-dev`), so they
# survive restarts, cache clears, and reboots. This replaces the old ngrok +
# `expo start --tunnel` setup, where Expo minted a fresh `*.exp.direct`
# subdomain on every successful start and the phone had to be re-paired.
#
# `EXPO_PACKAGER_PROXY_URL` is the key: it makes Metro advertise the public
# hostname in its manifest, so Expo Go fetches the bundle from Cloudflare
# instead of from an unreachable localhost address.

set -euo pipefail
cd "$(dirname "$0")/.."

METRO_HOST="metro.crezo.studio"
API_HOST="dev-api.crezo.studio"
TUNNEL_CONFIG="$HOME/.cloudflared/crezo-dev.yml"
LOGS="/tmp/claude-501/crezo-dev"
mkdir -p "$LOGS"

CLEAR=""
[ "${1:-}" = "--clear" ] && CLEAR="--clear"

echo "→ stopping anything already running"
pkill -f "expo start"         2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
pkill -f "tsx watch"          2>/dev/null || true
sleep 2

echo "→ backend on :3001"
nohup npm run server:dev > "$LOGS/backend.log" 2>&1 &
disown
until curl -s -m 3 -o /dev/null http://localhost:3001/health; do sleep 1; done
echo "  up"

echo "→ metro on :8081${CLEAR:+ (cache cleared)}"
EXPO_PUBLIC_BACKEND_URL="https://$API_HOST" \
EXPO_PACKAGER_PROXY_URL="https://$METRO_HOST" \
  nohup npx expo start --go $CLEAR > "$LOGS/metro.log" 2>&1 &
disown
until curl -s -m 3 -o /dev/null http://localhost:8081/; do sleep 2; done
echo "  up"

echo "→ cloudflare tunnel (both hostnames)"
nohup cloudflared tunnel --config "$TUNNEL_CONFIG" run crezo-dev > "$LOGS/cloudflared.log" 2>&1 &
disown
until grep -q "Registered tunnel connection" "$LOGS/cloudflared.log" 2>/dev/null; do sleep 2; done
echo "  connected"

echo
echo "  app      exp://$METRO_HOST"
echo "  backend  https://$API_HOST"
echo "  logs     $LOGS"
echo
echo "stop with: pkill -f 'expo start'; pkill -f cloudflared; pkill -f 'tsx watch'"
