-- Two-period credit cards (e.g. Amex): a statement closes on statement_day and
-- is paid on due_day of the FOLLOWING month, while a new period is already
-- accruing. statement_balance = the closed amount to pay; balance = the amount
-- accruing in the current open period.

ALTER TABLE credit_cards
  ADD COLUMN IF NOT EXISTS statement_balance NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- Allow the new 'statement' due_kind alongside the existing kinds.
ALTER TABLE credit_cards DROP CONSTRAINT IF EXISTS credit_cards_due_kind_check;
ALTER TABLE credit_cards
  ADD CONSTRAINT credit_cards_due_kind_check
  CHECK (due_kind IN ('monthly_day', 'fixed_date', 'none', 'statement'));
