# 🪷 Family Budget

A calm, mobile-first web app for a couple's **weekly money check-in**. Set
**one fixed monthly plan** (combined income + spending-category targets), then
each month track actual spending against it — viewed primarily as a
**percentage of income**. Both partners log in with **one shared password** and
see the **same shared data**.

Goals: _save more, avoid overspending_ — gently.

---

## ✨ What it does

- **One shared login.** A single household password; everyone sees the same
  numbers. No per-user accounts.
- **One fixed plan.** A combined monthly income plus editable spending
  categories, each with a target entered in **pounds** but shown everywhere as
  a **% of income**.
- **Weekly check-ins.** Each month you overwrite the **running total** spent per
  category. The app compares actual vs plan and flags overspending **softly** —
  a warm blush tone, never a harsh red.
- **Calm, lavender UI.** Soft progress bars per category, a donut for the
  overall breakdown, and clean big headline numbers (income, total spent, % of
  income spent, total saved + savings rate, overall over/under vs plan).
- **Savings shown positively.** Savings is a normal category with its own
  target, but surfaced as a good thing in the headline.

Seeded starter categories (all editable — rename / add / remove / reorder):

| Group | Categories |
| --- | --- |
| **Essentials** | Housing/Rent, Utilities, Groceries, Transportation, Insurance |
| **Lifestyle** | Dining out, Entertainment & subscriptions, Shopping, Travel |
| **Health & family** | Health/Medical, Childcare/Kids, Pets, Gifts & donations |
| **Financial** | Savings, Investments, Debt/Loan payments |

---

## 🧱 Stack

- **Next.js** (App Router, TypeScript) + **Tailwind CSS**
- **Postgres** (Neon free tier) via the [`postgres`](https://github.com/porsager/postgres) (postgres.js) client
- **Auth:** one shared password checked against `APP_PASSWORD`; a signed,
  httpOnly session cookie (HMAC-SHA256 with `SESSION_SECRET`); **middleware
  guards every page and API route**
- **Deploy:** Vercel + Neon Postgres integration

---

## 🚀 Deploy to Vercel (one click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkkcherr%2Ffamily-budget&env=APP_PASSWORD,SESSION_SECRET&envDescription=Shared%20household%20password%20and%20a%20long%20random%20cookie%20signing%20secret&envLink=https%3A%2F%2Fgithub.com%2Fkkcherr%2Ffamily-budget%23environment-variables&project-name=family-budget&repository-name=family-budget)

Then, in three short steps:

1. **Add Postgres (Neon).** In the new project go to **Storage → Create
   Database → Neon** (Vercel's Neon integration). One click provisions a free
   Neon database and injects a **`DATABASE_URL`** environment variable into the
   project automatically.
2. **Set the two env vars** (the Deploy button prompts for these):
   - `APP_PASSWORD` — the shared household password you'll both type.
   - `SESSION_SECRET` — a long random string. Generate one with
     `openssl rand -base64 32`.
3. **Initialize the database** once (creates tables + seeds categories):
   ```bash
   # from your machine, using the Neon connection string from Vercel
   DATABASE_URL="postgres://...neon.tech/...?sslmode=require" npm run db:setup
   ```
   `db:setup` runs migrations and the seed; both are **idempotent**, so it's
   safe to re-run. Redeploy if needed, open the app, and log in.

> **Tip:** You can copy the `DATABASE_URL` from Vercel → your project →
> **Storage → Neon → `.env.local`**, or from the Neon dashboard.

---

## 🖥️ Self-host on your own VPS (Docker)

Prefer to run it on your own server with your own domain? One command brings up
the **app + Postgres + Caddy** (automatic HTTPS), with the database living on
your VPS:

```bash
git clone https://github.com/kkcherr/family-budget.git
cd family-budget
cp .env.docker.example .env     # set DOMAIN, APP_PASSWORD, SESSION_SECRET, POSTGRES_PASSWORD
docker compose up -d --build
```

Migrations and seeding run automatically on first start. Full walkthrough,
updates, and backups are in **[DEPLOY.md](./DEPLOY.md)**.

---

## 🛠️ Local development

**Prerequisites:** Node 18+ and a Postgres database (local or a Neon dev branch).

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env.local
#   then edit .env.local — set DATABASE_URL, APP_PASSWORD, SESSION_SECRET

# 3. Create tables + seed starter categories
npm run db:setup        # = npm run migrate && npm run seed

# 4. Run
npm run dev             # http://localhost:3000
```

Build / start production locally:

```bash
npm run build
npm run start
```

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Postgres connection string. On Vercel + Neon this is provided automatically. SSL is enabled automatically for non-local hosts. |
| `APP_PASSWORD` | ✅ | The single shared password both partners type on the login screen. |
| `SESSION_SECRET` | ✅ | Long random string used to sign the session cookie. `openssl rand -base64 32`. |

---

## 🗂️ Project structure

```
app/
  page.tsx            Dashboard (month switcher, headline, donut, categories)
  plan/page.tsx       Plan editor (income + categories)
  login/page.tsx      Shared-password login
  api/                login · logout · plan · categories · categories/[id] · actuals
  components/         Donut, ProgressBar, CategoryRow, HeadlineSummary, ...
lib/
  db.ts               postgres.js client (SSL auto for remote hosts)
  auth.ts             Web Crypto HMAC session token + password check
  queries.ts          Data access + derived figures
  money.ts            Currency / percent / month helpers
  types.ts, palette.ts
migrations/001_init.sql
scripts/migrate.ts    Idempotent migration runner (tracks applied files)
scripts/seed.ts       Idempotent starter categories + default income
middleware.ts         Guards all pages + API routes
```

## 🧮 Data model

- **`plan`** — single row (`id = 1`): `monthly_income`, `currency`, `updated_at`.
- **`categories`** — `name`, `group` (`essentials | lifestyle | health_family |
  financial`), `target_amount` (pounds), `kind` (`spending | savings`),
  `sort_order`, `archived`.
- **`months`** — `month` text `'YYYY-MM'` (unique).
- **`actuals`** — `month_id`, `category_id`, `amount` (running total), unique on
  `(month_id, category_id)`.

Everything else — percent of income, plan vs actual, remaining, overspend flag,
total spent, total saved + savings rate, overall % of income spent, projected
leftover — is **derived in the app** (see `lib/queries.ts`).

## 🔐 A note on auth

This is intentionally simple: one shared password for a household of two. The
session cookie is httpOnly, `SameSite=Lax`, `Secure` in production, and signed
with `SESSION_SECRET` so it can't be forged. There are no per-user accounts,
audit trails, per-transaction logs, or bank integrations — those are explicit
non-goals for v1.

---

Made to be calm. 🌿
