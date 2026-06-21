#!/bin/sh
# Apply migrations + seed (both idempotent), then start the Next.js server.
set -e

echo "› Applying database migrations…"
node scripts/migrate.mjs

echo "› Seeding starter data (skips if categories already exist)…"
node scripts/seed.mjs

echo "› Starting Family Budget on :${PORT:-3000}"
exec node server.js
