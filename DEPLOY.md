# Self-hosting on a VPS (Docker Compose + Caddy)

This runs the whole app on your own server: **Next.js app + Postgres + Caddy**
(which gets you automatic HTTPS for your domain — no manual certificates). The
database lives on the VPS; nothing is sent to a third party.

## What you need

- A VPS (any Linux with **Docker** + the **Docker Compose plugin** installed).
- A **domain** (or subdomain) with a DNS **A record** (and `AAAA` if you use
  IPv6) pointing at the VPS's public IP.
- Ports **80** and **443** open to the internet (Caddy needs both — 80 for the
  Let's Encrypt challenge, 443 for HTTPS).

> Install Docker quickly: `curl -fsSL https://get.docker.com | sh`

## Steps

```bash
# 1. Get the code onto the VPS
git clone https://github.com/kkcherr/family-budget.git
cd family-budget

# 2. Create your env file from the template
cp .env.docker.example .env
nano .env        # fill in DOMAIN, APP_PASSWORD, SESSION_SECRET, POSTGRES_PASSWORD
```

Fill in `.env`:

| Variable | What to put |
| --- | --- |
| `DOMAIN` | The domain pointing at this VPS, e.g. `budget.yourdomain.com` |
| `TLS_EMAIL` | Your email (Let's Encrypt renewal notices) — optional but nice |
| `APP_PASSWORD` | The shared password you'll both type to log in |
| `SESSION_SECRET` | A long random string — `openssl rand -base64 32` |
| `POSTGRES_PASSWORD` | A strong database password (used internally) |

```bash
# 3. Build and start everything (app, Postgres, Caddy) in the background
docker compose up -d --build
```

On first start the app container automatically **runs migrations and seeds**
the starter categories (both steps are idempotent and safe to repeat). Caddy
then requests a certificate for your domain — give it a few seconds, and open:

```
https://your-domain
```

Log in with `APP_PASSWORD`. Done. 🪷

## Day-to-day

```bash
docker compose logs -f app        # watch app logs
docker compose ps                 # status of the three services
docker compose pull && docker compose up -d --build   # update after a git pull
docker compose down               # stop (keeps data)
docker compose down -v            # stop AND delete the database volume (wipes data)
```

### Updating to a new version

```bash
git pull
docker compose up -d --build
```

Migrations run again on start; existing data is preserved (the seed step skips
when categories already exist).

### Backups

Your data lives in the `pgdata` Docker volume. A simple dump:

```bash
docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup-$(date +%F).sql
```

Restore into a fresh stack:

```bash
cat backup-YYYY-MM-DD.sql | docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

## How the pieces fit

```
Internet ──443/80──▶ Caddy ──▶ app:3000 (Next.js standalone)
                                   │
                                   └──▶ db:5432 (Postgres, private network)
```

- **Caddy** terminates TLS and reverse-proxies to the app. Automatic HTTPS via
  Let's Encrypt; certs are stored in the `caddy_data` volume.
- **app** is the Next.js standalone server. It talks to Postgres over the
  private Docker network (SSL disabled there via `?sslmode=disable`).
- **db** is Postgres 16; data persists in the `pgdata` volume.

## Troubleshooting

- **Certificate not issued / site not loading over HTTPS** — confirm DNS
  actually resolves to this VPS (`dig +short your-domain`) and that ports 80 and
  443 are open. Check `docker compose logs caddy`.
- **App restarting** — check `docker compose logs app`. Most often a missing or
  malformed value in `.env` (e.g. `APP_PASSWORD`/`SESSION_SECRET` not set).
- **Want to change the shared password** — edit `APP_PASSWORD` in `.env`, then
  `docker compose up -d` to recreate the app container.

---

Prefer a managed host instead? See the **Deploy to Vercel** button in the
[README](./README.md) for a Vercel + Neon setup.
