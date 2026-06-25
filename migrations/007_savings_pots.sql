-- Savings rework: savings live in one place (the Cash & Savings page) as running
-- balances ("pots"), not per-month entries on the Month page. Non-destructive.

CREATE TABLE IF NOT EXISTS savings_pots (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  balance    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived   BOOLEAN NOT NULL DEFAULT FALSE
);

-- Migrate any existing savings categories into pots (preserve names + latest
-- carried value as the starting balance), once.
INSERT INTO savings_pots (name, balance, sort_order)
SELECT c.name,
       COALESCE(
         (SELECT v.amount FROM category_values v
          WHERE v.category_id = c.id
          ORDER BY v.effective_month DESC LIMIT 1),
         c.target_amount
       ),
       c.sort_order
FROM categories c
WHERE c.section = 'savings'
  AND c.archived = FALSE
  AND NOT EXISTS (SELECT 1 FROM savings_pots);

-- Retire savings categories so they no longer appear on the Month page
-- (data is kept, just archived).
UPDATE categories SET archived = TRUE WHERE section = 'savings';
