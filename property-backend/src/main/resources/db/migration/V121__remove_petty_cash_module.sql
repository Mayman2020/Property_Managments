-- Remove petty cash module permanently (tables + dependent data).
DROP TABLE IF EXISTS petty_cash_transactions CASCADE;
DROP TABLE IF EXISTS petty_cash_funds CASCADE;
DROP TABLE IF EXISTS petty_cash CASCADE;
