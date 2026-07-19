SET search_path TO property_mgmt;
UPDATE users SET username = 'admin', password_hash = '$2b$10$49wu0oR2J3vEOrZkEGsLMuLFpKEt3nrQ9pnquwuvfZu2ceMvriOnq', is_active = TRUE
WHERE role = 'SUPER_ADMIN' AND (username IN ('admin', 'superadmin') OR email = 'admin@propmgmt.com');
