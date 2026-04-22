-- V7: Inventory Items and Transactions

CREATE TABLE inventory_items (
    id              BIGSERIAL PRIMARY KEY,
    property_id     BIGINT REFERENCES properties(id),
    item_code       VARCHAR(50) UNIQUE NOT NULL,
    item_name_ar    VARCHAR(200) NOT NULL,
    item_name_en    VARCHAR(200),
    unit_of_measure VARCHAR(30),
    quantity        DECIMAL(10,2) DEFAULT 0 CHECK (quantity >= 0),
    min_quantity    DECIMAL(10,2) DEFAULT 0,
    location        VARCHAR(100),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory_transactions (
    id                  BIGSERIAL PRIMARY KEY,
    request_id          BIGINT REFERENCES maintenance_requests(id),
    item_id             BIGINT NOT NULL REFERENCES inventory_items(id),
    transaction_type    VARCHAR(10) NOT NULL CHECK (transaction_type IN ('IN','OUT')),
    quantity            DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    notes               TEXT,
    performed_by        BIGINT REFERENCES users(id),
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inventory_property  ON inventory_items(property_id);
CREATE INDEX idx_inventory_code      ON inventory_items(item_code);
CREATE INDEX idx_inv_trans_item      ON inventory_transactions(item_id);
CREATE INDEX idx_inv_trans_request   ON inventory_transactions(request_id);
CREATE INDEX idx_inv_trans_created   ON inventory_transactions(created_at DESC);
