-- Switch the household plan to pounds (GBP).
-- Safe for installs already seeded with the old USD default.

ALTER TABLE plan ALTER COLUMN currency SET DEFAULT 'GBP';

UPDATE plan SET currency = 'GBP' WHERE currency = 'USD';
