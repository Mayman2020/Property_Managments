-- V9: Additional composite indexes for common query patterns

-- Dashboard stats: count by status per property
CREATE INDEX idx_req_property_status
    ON maintenance_requests(property_id, status);

-- Officer schedule: assigned requests by date
CREATE INDEX idx_req_assigned_scheduled
    ON maintenance_requests(assigned_to, scheduled_date)
    WHERE scheduled_date IS NOT NULL;

-- Tenant request history
CREATE INDEX idx_req_tenant_created
    ON maintenance_requests(tenant_id, created_at DESC);

-- Low stock: property + quantity vs min
CREATE INDEX idx_inv_low_stock
    ON inventory_items(property_id, quantity, min_quantity)
    WHERE is_active = TRUE;

-- Units: vacant per property
CREATE INDEX idx_units_vacant
    ON units(property_id, is_rented)
    WHERE is_active = TRUE;

-- Active tenants per unit
CREATE INDEX idx_tenants_unit_active
    ON tenants(unit_id, is_active);
