-- V18: Generic lookups for countries and cities
CREATE TABLE IF NOT EXISTS lookups (
    id           BIGSERIAL PRIMARY KEY,
    type         VARCHAR(20) NOT NULL,
    code         VARCHAR(50) NOT NULL,
    name_ar      VARCHAR(150) NOT NULL,
    name_en      VARCHAR(150) NOT NULL,
    parent_id    BIGINT,
    sort_order   INT NOT NULL DEFAULT 0,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    is_locked    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lookups_parent FOREIGN KEY (parent_id) REFERENCES lookups(id),
    CONSTRAINT uq_lookup_type_code UNIQUE (type, code),
    CONSTRAINT chk_lookup_type CHECK (type IN ('COUNTRY', 'CITY'))
);

CREATE INDEX IF NOT EXISTS idx_lookups_type_active ON lookups(type, is_active);
CREATE INDEX IF NOT EXISTS idx_lookups_parent ON lookups(parent_id);

-- Seed Oman country (locked)
INSERT INTO lookups (type, code, name_ar, name_en, parent_id, sort_order, is_active, is_locked)
VALUES ('COUNTRY', 'OM', 'سلطنة عمان', 'Oman', NULL, 1, TRUE, TRUE)
ON CONFLICT (type, code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    is_locked = TRUE,
    is_active = TRUE;

-- Seed common Oman cities
INSERT INTO lookups (type, code, name_ar, name_en, parent_id, sort_order, is_active, is_locked)
SELECT 'CITY', v.code, v.name_ar, v.name_en, c.id, v.sort_order, TRUE, FALSE
FROM (VALUES
    ('MCT', 'مسقط', 'Muscat', 1),
    ('SL',  'صلالة', 'Salalah', 2),
    ('SM',  'صحار', 'Sohar', 3),
    ('NZ',  'نزوى', 'Nizwa', 4),
    ('BR',  'بركاء', 'Barka', 5)
) AS v(code, name_ar, name_en, sort_order)
CROSS JOIN lookups c
WHERE c.type = 'COUNTRY' AND c.code = 'OM'
ON CONFLICT (type, code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    parent_id = EXCLUDED.parent_id,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE;
