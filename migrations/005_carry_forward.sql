-- v3: per-month, carry-forward item values (effective-dated). Non-destructive.
--
-- A category's amount for a month = the most recent category_values row whose
-- effective_month <= that month. Editing a month inserts/updates the row AT
-- that month, so the change applies from that month forward while earlier
-- months keep their own (earlier) values.

CREATE TABLE IF NOT EXISTS category_values (
  id              SERIAL PRIMARY KEY,
  category_id     INTEGER NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  effective_month TEXT NOT NULL,                 -- 'YYYY-MM'
  amount          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, effective_month)
);

CREATE INDEX IF NOT EXISTS category_values_lookup
  ON category_values (category_id, effective_month);

-- Backfill 1: Fixed & Savings keep the per-month amounts already entered (their
-- logged actuals become the carried values, so nothing visible is lost).
INSERT INTO category_values (category_id, effective_month, amount)
SELECT a.category_id, m.month, a.amount
FROM actuals a
JOIN months m ON m.id = a.month_id
JOIN categories c ON c.id = a.category_id
WHERE c.section IN ('fixed', 'savings')
ON CONFLICT (category_id, effective_month) DO NOTHING;

-- Backfill 2: every category gets a baseline (its existing plan target) from the
-- earliest tracked month, so values carry even where nothing was logged. For
-- Variable items this baseline is the budget; their logged spend stays in actuals.
INSERT INTO category_values (category_id, effective_month, amount)
SELECT c.id,
       COALESCE((SELECT MIN(month) FROM months), to_char(now(), 'YYYY-MM')),
       c.target_amount
FROM categories c
WHERE NOT EXISTS (
  SELECT 1 FROM category_values v WHERE v.category_id = c.id
)
ON CONFLICT (category_id, effective_month) DO NOTHING;
