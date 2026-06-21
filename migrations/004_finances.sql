-- Phase 3: credit cards, accounts (cash position), and upcoming big payments.
-- Seeds starter rows (amounts left at 0 to fill in) so the screens have shape.

CREATE TABLE IF NOT EXISTS credit_cards (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  balance       NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- current amount owed
  due_kind      TEXT NOT NULL DEFAULT 'monthly_day'
                  CHECK (due_kind IN ('monthly_day', 'fixed_date', 'none')),
  due_day       SMALLINT,   -- day-of-month for monthly_day (1..28 recommended)
  due_date      DATE,       -- specific deadline for fixed_date
  statement_day SMALLINT,   -- informational (e.g. Amex statement day)
  note          TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  archived      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS accounts (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  balance    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS upcoming_payments (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  amount       NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- total cost
  saved_so_far NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- already set aside
  due_date     DATE,
  note         TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  archived     BOOLEAN NOT NULL DEFAULT FALSE
);

-- Starter credit cards.
INSERT INTO credit_cards (name, due_kind, due_day, statement_day, note, sort_order)
VALUES ('Amex', 'monthly_day', 1, 15, 'Statement runs 15th → 15th, paid on the 1st', 1)
ON CONFLICT DO NOTHING;

INSERT INTO credit_cards (name, due_kind, due_day, note, sort_order)
VALUES ('Capital One', 'monthly_day', 15, 'Paid on the 15th', 2)
ON CONFLICT DO NOTHING;

INSERT INTO credit_cards (name, due_kind, due_date, note, sort_order)
VALUES ('Tesco', 'fixed_date', DATE '2026-12-31', '0% period ends 31 December', 3)
ON CONFLICT DO NOTHING;

-- Starter accounts.
INSERT INTO accounts (name, sort_order) VALUES ('Joint current account', 1)
ON CONFLICT DO NOTHING;
INSERT INTO accounts (name, sort_order) VALUES ('Savings', 2)
ON CONFLICT DO NOTHING;

-- Starter upcoming big payments (examples to edit).
INSERT INTO upcoming_payments (name, sort_order) VALUES ('Holiday', 1)
ON CONFLICT DO NOTHING;
INSERT INTO upcoming_payments (name, sort_order) VALUES ('Dog''s operation', 2)
ON CONFLICT DO NOTHING;
INSERT INTO upcoming_payments (name, sort_order) VALUES ('College payment', 3)
ON CONFLICT DO NOTHING;
