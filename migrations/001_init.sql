-- Family Budget — initial schema
-- One shared household plan, editable categories, and per-month actuals.

CREATE TABLE IF NOT EXISTS plan (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  monthly_income NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'USD',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plan_singleton CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS categories (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  "group"       TEXT NOT NULL
                  CHECK ("group" IN ('essentials', 'lifestyle', 'health_family', 'financial')),
  target_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  kind          TEXT NOT NULL DEFAULT 'spending'
                  CHECK (kind IN ('spending', 'savings')),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  archived      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS categories_sort_idx ON categories (archived, sort_order, id);

CREATE TABLE IF NOT EXISTS months (
  id    SERIAL PRIMARY KEY,
  month TEXT NOT NULL UNIQUE  -- 'YYYY-MM'
);

CREATE TABLE IF NOT EXISTS actuals (
  id          SERIAL PRIMARY KEY,
  month_id    INTEGER NOT NULL REFERENCES months (id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month_id, category_id)
);

-- Ensure the singleton plan row always exists.
INSERT INTO plan (id, monthly_income, currency)
VALUES (1, 0, 'USD')
ON CONFLICT (id) DO NOTHING;
