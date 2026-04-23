-- All seeded users: password plain text "12345" (BCrypt cost 10)
-- Also force is_active = TRUE (fixes "User is disabled" if a row was inactive)

UPDATE users
SET password_hash = '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS',
    is_active = TRUE
WHERE TRUE;
