# syntax=docker/dockerfile:1

# --- Dependencies ---------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# --- Build ----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DB is not needed at build time (all data pages are dynamic).
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Runtime --------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js standalone server bundle (includes a traced node_modules with
# postgres.js, which the migration scripts reuse).
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Migrations + seed run on container start. The app bundles postgres.js into
# its server chunks, but the standalone tracer omits it (restrictive package
# `exports`), so copy the zero-dependency package for the scripts to import.
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/node_modules/postgres ./node_modules/postgres
COPY --from=build /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Run as the unprivileged user that ships with the node image.
USER node

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
