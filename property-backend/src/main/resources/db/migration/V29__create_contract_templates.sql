-- Contract Templates (قوالب العقود)
CREATE TABLE contract_templates (
    id              BIGSERIAL PRIMARY KEY,
    template_name   VARCHAR(200) NOT NULL,
    template_type   VARCHAR(30) CHECK (template_type IN ('RESIDENTIAL','COMMERCIAL','SHOP')),
    content         TEXT NOT NULL,
    variables       JSONB,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
