#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_DIR/compose.yaml"
ENV_FILE="$PROJECT_DIR/.env.docker"

if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "Docker Compose file not found: $COMPOSE_FILE" >&2
    exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Docker environment file not found: $ENV_FILE" >&2
    echo "Create it from $PROJECT_DIR/.env.docker.example and fill in the required values." >&2
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "Docker CLI is not installed or is not available in PATH." >&2
    exit 1
fi

compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

echo "Validating Docker Compose configuration..."
"${compose[@]}" config --quiet

echo "Building the application image..."
"${compose[@]}" build --pull

echo "Starting the application and waiting for a healthy container..."
"${compose[@]}" up -d --wait --wait-timeout 120

"${compose[@]}" ps
