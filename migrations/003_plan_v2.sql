-- Plan v2: replace the four "group" buckets with Fixed / Variable / Savings
-- sections, two sub-columns per section, and a payment frequency per item.
-- No real data yet, so rebuild the category + actuals tables cleanly.

DROP TABLE IF EXISTS actuals;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  section       TEXT NOT NULL
                  CHECK (section IN ('fixed', 'variable', 'savings')),
  col           SMALLINT NOT NULL DEFAULT 0,  -- sub-column within the section
  target_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- per occurrence
  frequency     TEXT NOT NULL DEFAULT 'monthly'
                  CHECK (frequency IN ('monthly', 'twice_monthly',
                    'every_3_months', 'every_6_months', 'every_12_months',
                    'one_off')),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  archived      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX categories_layout_idx
  ON categories (archived, section, col, sort_order, id);

CREATE TABLE actuals (
  id          SERIAL PRIMARY KEY,
  month_id    INTEGER NOT NULL REFERENCES months (id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month_id, category_id)
);
