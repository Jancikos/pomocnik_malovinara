#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
DEPLOY_USER="${DEPLOY_USER:-git-deploy}"
git_as_deploy=(sudo -u "$DEPLOY_USER" git -C "$PROJECT_DIR")

if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is not installed or is not available in PATH." >&2
    exit 1
fi

if ! "${git_as_deploy[@]}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Git repository not found: $PROJECT_DIR" >&2
    exit 1
fi

if [[ -n "$("${git_as_deploy[@]}" status --porcelain)" ]]; then
    read -r -p "There are uncommitted changes. Continue with pull? (y/N) " reply
    if [[ ! "$reply" =~ ^[Yy]$ ]]; then
        echo "Pull cancelled."
        exit 1
    fi
fi

echo "Fetching the latest changes..."
"${git_as_deploy[@]}" fetch --prune

echo "Updating the working tree with a fast-forward pull..."
"${git_as_deploy[@]}" pull --ff-only
