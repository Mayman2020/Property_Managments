-- V158: Legal entities (multi-entity support) + link to properties
CREATE TABLE IF NOT EXISTS legal_entities (
    id                      BIGSERIAL PRIMARY KEY,
    name_ar                 VARCHAR(255) NOT NULL,
    name_en                 VARCHAR(255),
    commercial_registration VARCHAR(100),
    tax_number              VARCHAR(100),
    address                 TEXT,
    phone                   VARCHAR(50),
    email                   VARCHAR(255),
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS legal_entity_id BIGINT REFERENCES legal_entities(id);

CREATE INDEX IF NOT EXISTS idx_properties_legal_entity_id ON properties(legal_entity_id);

-- Demo seed: 2 legal entities for the demo
INSERT INTO legal_entities (id, name_ar, name_en, commercial_registration, tax_number, is_active)
OVERRIDING SYSTEM VALUE VALUES
(1, 'شركة الأملاك الذهبية للتطوير العقاري', 'Golden Properties Development Co.', 'CR-1001234567', 'TAX-300001', TRUE),
(2, 'مؤسسة النخبة لإدارة العقارات',          'Elite Property Management Est.',    'CR-1009876543', 'TAX-300002', TRUE)
ON CONFLICT DO NOTHING;
SELECT setval('legal_entities_id_seq', 2, true);

-- Assign properties to legal entities
UPDATE properties SET legal_entity_id = 1 WHERE id IN (1, 2);
UPDATE properties SET legal_entity_id = 2 WHERE id IN (3, 4);
