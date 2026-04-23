-- V22: Required attachments support for tenant lease and property ownership docs

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS lease_contract_files TEXT;

ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS owner_document_files TEXT;
