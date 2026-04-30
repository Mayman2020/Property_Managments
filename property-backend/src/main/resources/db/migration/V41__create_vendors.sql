-- V41: Vendors and contracts
CREATE TABLE IF NOT EXISTS vendors (
    id BIGSERIAL PRIMARY KEY,
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(200) NOT NULL,
    vendor_type VARCHAR(50) CHECK (vendor_type IN ('PLUMBER','ELECTRICIAN','CARPENTER','PAINTER','HVAC_TECHNICIAN','CLEANER','SECURITY','CIVIL_WORKS','ELEVATOR','GENERATOR','SUPPLIES_PROVIDER','OTHER')),
    contact_person VARCHAR(150),
    phone VARCHAR(30),
    email VARCHAR(150),
    address TEXT,
    commercial_reg VARCHAR(100),
    vat_number VARCHAR(100),
    bank_name VARCHAR(150),
    bank_iban VARCHAR(50),
    rating DECIMAL(3,1) DEFAULT 0,
    total_jobs INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_contracts (
    id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT REFERENCES vendors(id),
    property_id BIGINT REFERENCES properties(id),
    contract_type VARCHAR(50) CHECK (contract_type IN ('ONE_TIME','ANNUAL_MAINTENANCE','CLEANING','SECURITY','OTHER')),
    description TEXT,
    start_date DATE,
    end_date DATE,
    monthly_value DECIMAL(12,2),
    total_value DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'SAR',
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','TERMINATED','PENDING')),
    contract_doc_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_ratings (
    id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT REFERENCES vendors(id),
    maintenance_request_id BIGINT REFERENCES maintenance_requests(id),
    rated_by BIGINT REFERENCES users(id),
    quality_score INT CHECK (quality_score BETWEEN 1 AND 5),
    time_score INT CHECK (time_score BETWEEN 1 AND 5),
    price_score INT CHECK (price_score BETWEEN 1 AND 5),
    overall_score DECIMAL(3,1),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(vendor_type);
CREATE INDEX IF NOT EXISTS idx_vendor_ratings_vendor ON vendor_ratings(vendor_id);
