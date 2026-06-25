#!/usr/bin/env bash
#
# Deploy Family Budget: sync this checkout to the latest main and rebuild the
# Docker stack. Safe to run repeatedly. Run from the repo root:
#
#   ./deploy.sh
#
# It always force-syncs to origin/main, so it can't get stuck on an old commit
# or the wrong branch (the cause of "I merged but nothing changed" deploys).

set -euo pipefail
cd "$(dirname "$0")"

BRANCH="${DEPLOY_BRANCH:-main}"

echo "▸ Fetching latest from origin…"
git fetch origin --prune

echo "▸ Syncing to origin/${BRANCH} (discarding any local changes)…"
git checkout "${BRANCH}" 2>/dev/null || git checkout -b "${BRANCH}" "origin/${BRANCH}"
git reset --hard "origin/${BRANCH}"

echo "▸ Now on: $(git log --oneline -1)"

echo "▸ Rebuilding and recreating containers…"
docker compose up -d --build --force-recreate

echo "▸ Tidying up old images…"
docker image prune -f >/dev/null 2>&1 || true

echo
echo "✓ Deployed. Current status:"
docker compose ps
echo
echo "If the site still looks unchanged, hard-refresh your browser (Ctrl/Cmd+Shift+R)."
