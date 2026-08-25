#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.docker"
COMPOSE_FILE="${PROJECT_ROOT}/compose.yaml"
SERVICE_NAME="app"

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

if [[ -z "$("${compose[@]}" ps --status running --quiet "${SERVICE_NAME}")" ]]; then
    echo "Chyba: Compose sluzba '${SERVICE_NAME}' nie je spustena." >&2
    echo "Nasadenie spustite pomocou ./scripts/docker_compose_up.sh." >&2
    exit 1
fi

echo "Otváram shell v Compose sluzbe '${SERVICE_NAME}'. Ukoncite ho prikazom 'exit'."
exec "${compose[@]}" exec "${SERVICE_NAME}" sh
