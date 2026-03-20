#!/bin/bash
# Setup MCP accounts server globally for Claude Code.
# Reads credentials from environment or .env file.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load .env if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

API_URL="${ACCOUNTS_API_URL:-http://localhost:7767}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@yaotoshi.xyz}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

if [ -z "$ADMIN_PASSWORD" ]; then
  echo "Error: ADMIN_PASSWORD not set. Set it in .env or export it."
  exit 1
fi

claude mcp add accounts --scope user \
  -e ACCOUNTS_API_URL="$API_URL" \
  -e ACCOUNTS_ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e ACCOUNTS_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -- node "$PROJECT_ROOT/mcp/dist/index.js"

echo "Done. Restart Claude Code for changes to take effect."
