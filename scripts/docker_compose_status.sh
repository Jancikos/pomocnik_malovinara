#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.docker"
COMPOSE_FILE="${PROJECT_ROOT}/compose.yaml"

cd "${PROJECT_ROOT}"

if ! command -v docker >/dev/null 2>&1; then
    echo "Chyba: Docker nie je nainstalovany alebo nie je dostupny v PATH." >&2
    exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
    echo "Chyba: Docker Compose plugin nie je dostupny." >&2
    exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
    echo "Chyba: Subor .env.docker neexistuje." >&2
    echo "Vytvorte ho skopirovanim .env.docker.example a doplnte produkcne hodnoty." >&2
    exit 1
fi

compose=(docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}")

"${compose[@]}" config --quiet

if [[ -z "$("${compose[@]}" ps --status running --quiet)" ]]; then
    echo "Ziadne Compose kontajnery nie su spustene."
    exit 0
fi

echo "Beziace Docker Compose kontajnery:"
"${compose[@]}" ps --status running
