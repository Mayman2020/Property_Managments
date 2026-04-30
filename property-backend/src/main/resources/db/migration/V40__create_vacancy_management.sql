-- V40: Vacancy management
CREATE TABLE IF NOT EXISTS vacancy_listings (
    id BIGSERIAL PRIMARY KEY,
    unit_id BIGINT REFERENCES units(id) UNIQUE,
    property_id BIGINT REFERENCES properties(id),
    title_ar VARCHAR(300),
    title_en VARCHAR(300),
    description_ar TEXT,
    asking_rent DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'SAR',
    available_from DATE,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,
    views_count INT DEFAULT 0,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vacancy_photos (
    id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT REFERENCES vacancy_listings(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    is_cover BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rental_inquiries (
    id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT REFERENCES vacancy_listings(id),
    unit_id BIGINT REFERENCES units(id),
    property_id BIGINT REFERENCES properties(id),
    inquirer_name VARCHAR(150) NOT NULL,
    inquirer_phone VARCHAR(30) NOT NULL,
    inquirer_email VARCHAR(150),
    inquirer_type VARCHAR(20) CHECK (inquirer_type IN ('INDIVIDUAL','COMPANY')),
    message TEXT,
    preferred_start DATE,
    status VARCHAR(30) DEFAULT 'NEW' CHECK (status IN ('NEW','CONTACTED','VIEWING_SCHEDULED','OFFER_MADE','CONVERTED','REJECTED','CLOSED')),
    assigned_to BIGINT REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vacancy_unit ON vacancy_listings(unit_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_listing ON rental_inquiries(listing_id);
