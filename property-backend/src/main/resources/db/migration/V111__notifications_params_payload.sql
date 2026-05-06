-- Adds a structured payload column so the backend can ship i18n keys + variables
-- (titleKey/bodyKey/vars) instead of pre-formatted Arabic + English text. The frontend
-- renders the final localized string from translation files at display time.
ALTER TABLE property_mgmt.notifications
    ADD COLUMN IF NOT EXISTS params JSONB;
