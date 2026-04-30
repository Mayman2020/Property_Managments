DO $$
DECLARE
    v_password_hash CONSTANT TEXT := '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS';
    v_owner_user_id BIGINT;
    v_owner_id BIGINT;
    v_company_a_id BIGINT;
    v_company_b_id BIGINT;
    v_property_id BIGINT;
    v_floor_id BIGINT;
    v_unit_id BIGINT;
    v_tenant_user_id BIGINT;
    v_tenant_id BIGINT;
    v_internal_officer_id BIGINT;
    v_contractor_officer_id BIGINT;
    v_category_ids BIGINT[];
    v_statuses TEXT[] := ARRAY['PENDING', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'TENANT_ABSENT', 'COMPLETED', 'NEEDS_REVISIT', 'CANCELLED'];
    v_priorities TEXT[] := ARRAY['LOW', 'NORMAL', 'HIGH', 'URGENT'];
    v_status_one TEXT;
    v_status_two TEXT;
    v_priority_one TEXT;
    v_priority_two TEXT;
    v_property_code TEXT;
    v_property_name_ar TEXT;
    v_property_name_en TEXT;
    v_unit_number TEXT;
    v_request_number_one TEXT;
    v_request_number_two TEXT;
    v_property_type TEXT;
BEGIN
    INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active)
    SELECT 'demoowner', 'demo.owner@estateos.local', v_password_hash, 'Demo Portfolio Owner', '0509100000', 'OWNER', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo.owner@estateos.local');

    SELECT id INTO v_owner_user_id FROM users WHERE email = 'demo.owner@estateos.local';

    INSERT INTO owners (full_name, national_id, phone, email, is_active, user_id, portal_access, address, notes)
    SELECT 'Demo Portfolio Owner', 'OWN-DEMO-001', '0509100000', 'demo.owner@estateos.local', TRUE, v_owner_user_id, TRUE,
           'Riyadh Demo District', 'Seeded owner for the 5x5 showcase dataset'
    WHERE NOT EXISTS (SELECT 1 FROM owners WHERE national_id = 'OWN-DEMO-001');

    SELECT id INTO v_owner_id FROM owners WHERE national_id = 'OWN-DEMO-001';

    INSERT INTO contractor_companies (name, phone, email, notes, active, name_ar, name_en, contract_start, contract_end)
    SELECT 'Fast Track Maintenance', '0509200001', 'dispatch@fasttrack.local', 'External maintenance company for showcase data', TRUE,
           'فاست تراك للصيانة', 'Fast Track Maintenance', CURRENT_DATE - 90, CURRENT_DATE + 365
    WHERE NOT EXISTS (SELECT 1 FROM contractor_companies WHERE name = 'Fast Track Maintenance');

    INSERT INTO contractor_companies (name, phone, email, notes, active, name_ar, name_en, contract_start, contract_end)
    SELECT 'Blue Wrench Services', '0509200002', 'ops@bluewrench.local', 'Backup maintenance company for showcase data', TRUE,
           'بلو رينش للخدمات', 'Blue Wrench Services', CURRENT_DATE - 60, CURRENT_DATE + 365
    WHERE NOT EXISTS (SELECT 1 FROM contractor_companies WHERE name = 'Blue Wrench Services');

    SELECT id INTO v_company_a_id FROM contractor_companies WHERE name = 'Fast Track Maintenance';
    SELECT id INTO v_company_b_id FROM contractor_companies WHERE name = 'Blue Wrench Services';

    SELECT ARRAY_AGG(id ORDER BY id) INTO v_category_ids FROM maintenance_categories;

    FOR property_idx IN 1..5 LOOP
        v_property_code := format('DEMO-PROP-%s', LPAD(property_idx::TEXT, 3, '0'));
        v_property_name_ar := format('عقار تجريبي %s', property_idx);
        v_property_name_en := format('Demo Property %s', property_idx);
        v_property_type := CASE property_idx
            WHEN 2 THEN 'COMMERCIAL'
            WHEN 4 THEN 'MIXED'
            ELSE 'RESIDENTIAL'
        END;

        INSERT INTO users (
            username, email, password_hash, full_name, phone, role, property_id,
            maintenance_officer_type, is_active
        )
        SELECT
            format('internal.officer.%s', property_idx),
            format('internal.officer.%s@estateos.local', property_idx),
            v_password_hash,
            format('Internal Officer %s', property_idx),
            format('05093%05s', property_idx),
            'MAINTENANCE_OFFICER',
            NULL,
            'INTERNAL_PROPERTY',
            TRUE
        WHERE NOT EXISTS (
            SELECT 1 FROM users WHERE email = format('internal.officer.%s@estateos.local', property_idx)
        );

        INSERT INTO users (
            username, email, password_hash, full_name, phone, role, property_id,
            maintenance_officer_type, maintenance_company_name, contractor_company_id, is_active
        )
        SELECT
            format('contractor.officer.%s', property_idx),
            format('contractor.officer.%s@estateos.local', property_idx),
            v_password_hash,
            format('Contractor Officer %s', property_idx),
            format('05094%05s', property_idx),
            'MAINTENANCE_OFFICER',
            NULL,
            'CONTRACTOR_COMPANY',
            CASE WHEN property_idx % 2 = 0 THEN 'Blue Wrench Services' ELSE 'Fast Track Maintenance' END,
            CASE WHEN property_idx % 2 = 0 THEN v_company_b_id ELSE v_company_a_id END,
            TRUE
        WHERE NOT EXISTS (
            SELECT 1 FROM users WHERE email = format('contractor.officer.%s@estateos.local', property_idx)
        );

        SELECT id INTO v_internal_officer_id
        FROM users
        WHERE email = format('internal.officer.%s@estateos.local', property_idx);

        SELECT id INTO v_contractor_officer_id
        FROM users
        WHERE email = format('contractor.officer.%s@estateos.local', property_idx);

        INSERT INTO properties (
            owner_id, property_name, property_code, property_type, address, city, country,
            total_floors, total_units, description, is_active, property_name_ar, property_name_en,
            maintenance_internal_officer_user_id, maintenance_contractor_company_id
        )
        SELECT
            v_owner_id,
            v_property_name_ar,
            v_property_code,
            v_property_type,
            format('District %s, Main Avenue, Riyadh', property_idx),
            'Riyadh',
            'Saudi Arabia',
            5,
            5,
            format('Expanded showcase property %s with five occupied units and maintenance history.', property_idx),
            TRUE,
            v_property_name_ar,
            v_property_name_en,
            v_internal_officer_id,
            CASE WHEN property_idx % 2 = 0 THEN v_company_b_id ELSE v_company_a_id END
        WHERE NOT EXISTS (SELECT 1 FROM properties WHERE property_code = v_property_code);

        SELECT id INTO v_property_id FROM properties WHERE property_code = v_property_code;

        UPDATE properties
        SET owner_id = v_owner_id,
            total_floors = 5,
            total_units = 5,
            property_name = v_property_name_ar,
            property_name_ar = v_property_name_ar,
            property_name_en = v_property_name_en,
            description = format('Expanded showcase property %s with five occupied units and maintenance history.', property_idx),
            maintenance_internal_officer_user_id = v_internal_officer_id,
            maintenance_contractor_company_id = CASE WHEN property_idx % 2 = 0 THEN v_company_b_id ELSE v_company_a_id END,
            updated_at = NOW()
        WHERE id = v_property_id;

        UPDATE users
        SET property_id = v_property_id,
            is_active = TRUE
        WHERE id IN (v_internal_officer_id, v_contractor_officer_id);

        FOR unit_idx IN 1..5 LOOP
            INSERT INTO floors (property_id, floor_number, floor_label)
            SELECT v_property_id, unit_idx, format('Floor %s', unit_idx)
            WHERE NOT EXISTS (
                SELECT 1 FROM floors WHERE property_id = v_property_id AND floor_number = unit_idx
            );

            SELECT id INTO v_floor_id
            FROM floors
            WHERE property_id = v_property_id AND floor_number = unit_idx;

            v_unit_number := format('%s0%s', unit_idx, property_idx);

            INSERT INTO units (
                property_id, floor_id, unit_number, unit_type, area_sqm, bedrooms, bathrooms,
                is_rented, rent_amount, currency, notes, is_active
            )
            SELECT
                v_property_id,
                v_floor_id,
                v_unit_number,
                CASE WHEN v_property_type = 'COMMERCIAL' THEN 'OFFICE' ELSE 'APARTMENT' END,
                95 + (unit_idx * 7),
                CASE WHEN v_property_type = 'COMMERCIAL' THEN NULL ELSE 2 + (unit_idx % 2) END,
                2,
                TRUE,
                3200 + (property_idx * 120) + (unit_idx * 80),
                'SAR',
                format('Showcase unit %s for %s', v_unit_number, v_property_name_en),
                TRUE
            WHERE NOT EXISTS (
                SELECT 1 FROM units WHERE property_id = v_property_id AND unit_number = v_unit_number
            );

            SELECT id INTO v_unit_id
            FROM units
            WHERE property_id = v_property_id AND unit_number = v_unit_number;

            UPDATE units
            SET floor_id = v_floor_id,
                is_rented = TRUE,
                is_active = TRUE,
                notes = format('Showcase unit %s for %s', v_unit_number, v_property_name_en),
                updated_at = NOW()
            WHERE id = v_unit_id;

            INSERT INTO users (username, email, password_hash, full_name, phone, role, property_id, is_active)
            SELECT
                format('tenant.%s.%s', property_idx, unit_idx),
                format('tenant.%s.%s@estateos.local', property_idx, unit_idx),
                v_password_hash,
                format('Tenant %s-%s', property_idx, unit_idx),
                format('05095%02s%02s', property_idx, unit_idx),
                'TENANT',
                v_property_id,
                TRUE
            WHERE NOT EXISTS (
                SELECT 1 FROM users WHERE email = format('tenant.%s.%s@estateos.local', property_idx, unit_idx)
            );

            SELECT id INTO v_tenant_user_id
            FROM users
            WHERE email = format('tenant.%s.%s@estateos.local', property_idx, unit_idx);

            INSERT INTO tenants (
                user_id, unit_id, property_id, full_name, national_id, phone, email,
                lease_start, lease_end, is_active, notes
            )
            SELECT
                v_tenant_user_id,
                v_unit_id,
                v_property_id,
                format('Tenant %s-%s', property_idx, unit_idx),
                format('TEN-%s-%s', LPAD(property_idx::TEXT, 2, '0'), LPAD(unit_idx::TEXT, 2, '0')),
                format('05095%02s%02s', property_idx, unit_idx),
                format('tenant.%s.%s@estateos.local', property_idx, unit_idx),
                CURRENT_DATE - ((property_idx * 8) + unit_idx),
                CURRENT_DATE + 330,
                TRUE,
                format('Primary tenant for %s / unit %s', v_property_name_en, v_unit_number)
            WHERE NOT EXISTS (
                SELECT 1 FROM tenants WHERE email = format('tenant.%s.%s@estateos.local', property_idx, unit_idx)
            );

            SELECT id INTO v_tenant_id
            FROM tenants
            WHERE email = format('tenant.%s.%s@estateos.local', property_idx, unit_idx);

            v_status_one := v_statuses[((property_idx + unit_idx - 2) % array_length(v_statuses, 1)) + 1];
            v_status_two := v_statuses[((property_idx + unit_idx + 1) % array_length(v_statuses, 1)) + 1];
            v_priority_one := v_priorities[((property_idx + unit_idx - 2) % array_length(v_priorities, 1)) + 1];
            v_priority_two := v_priorities[((property_idx + unit_idx - 1) % array_length(v_priorities, 1)) + 1];
            v_request_number_one := format('MR-D%s%s-01', property_idx, unit_idx);
            v_request_number_two := format('MR-D%s%s-02', property_idx, unit_idx);

            INSERT INTO maintenance_requests (
                request_number, tenant_id, unit_id, property_id, category_id, title, description, priority, status,
                assigned_to, scheduled_date, scheduled_time_from, scheduled_time_to, tenant_notes,
                contractor_company_id, closed_at, created_at, updated_at
            )
            SELECT
                v_request_number_one,
                v_tenant_id,
                v_unit_id,
                v_property_id,
                CASE
                    WHEN COALESCE(array_length(v_category_ids, 1), 0) = 0 THEN NULL
                    ELSE v_category_ids[((unit_idx - 1) % array_length(v_category_ids, 1)) + 1]
                END,
                CASE unit_idx
                    WHEN 1 THEN 'Kitchen plumbing leak'
                    WHEN 2 THEN 'AC cooling issue'
                    WHEN 3 THEN 'Corridor lighting fault'
                    WHEN 4 THEN 'Door lock jammed'
                    ELSE 'Water heater inspection'
                END,
                format('Property %s unit %s reported request type one with full tenant and scheduling details.', property_idx, v_unit_number),
                v_priority_one,
                v_status_one,
                v_internal_officer_id,
                CURRENT_DATE + (unit_idx - 3),
                TIME '09:00',
                TIME '11:00',
                CASE
                    WHEN v_status_one = 'TENANT_ABSENT' THEN 'Technician visited but the tenant did not answer the door.'
                    WHEN v_status_one = 'PENDING' THEN 'Waiting for confirmation call from the tenant.'
                    WHEN v_status_one = 'NEEDS_REVISIT' THEN 'First visit completed and a spare part is needed.'
                    ELSE 'Tenant shared access notes and preferred morning visit.'
                END,
                NULL,
                CASE WHEN v_status_one IN ('COMPLETED', 'CANCELLED') THEN NOW() - INTERVAL '1 day' ELSE NULL END,
                NOW() - ((property_idx * 5 + unit_idx) || ' days')::INTERVAL,
                NOW()
            WHERE NOT EXISTS (SELECT 1 FROM maintenance_requests WHERE request_number = v_request_number_one);

            INSERT INTO maintenance_requests (
                request_number, tenant_id, unit_id, property_id, category_id, title, description, priority, status,
                assigned_to, scheduled_date, scheduled_time_from, scheduled_time_to, tenant_notes,
                contractor_company_id, closed_at, created_at, updated_at
            )
            SELECT
                v_request_number_two,
                v_tenant_id,
                v_unit_id,
                v_property_id,
                CASE
                    WHEN COALESCE(array_length(v_category_ids, 1), 0) = 0 THEN NULL
                    ELSE v_category_ids[((property_idx + unit_idx - 1) % array_length(v_category_ids, 1)) + 1]
                END,
                CASE unit_idx
                    WHEN 1 THEN 'Balcony sealant follow-up'
                    WHEN 2 THEN 'Breaker trip follow-up'
                    WHEN 3 THEN 'Bathroom fan replacement'
                    WHEN 4 THEN 'Ceiling patch inspection'
                    ELSE 'Intercom troubleshooting'
                END,
                format('Second request for property %s unit %s routed to the contractor-side maintenance officer.', property_idx, v_unit_number),
                v_priority_two,
                v_status_two,
                v_contractor_officer_id,
                CURRENT_DATE + (unit_idx - 1),
                TIME '14:00',
                TIME '16:00',
                CASE
                    WHEN v_status_two = 'TENANT_ABSENT' THEN 'Visit completed but no one responded on site.'
                    WHEN v_status_two = 'PENDING' THEN 'No response yet on the follow-up call.'
                    WHEN v_status_two = 'COMPLETED' THEN 'Visit completed successfully by contractor team.'
                    ELSE 'Contractor technician assigned with afternoon access window.'
                END,
                CASE WHEN property_idx % 2 = 0 THEN v_company_b_id ELSE v_company_a_id END,
                CASE WHEN v_status_two IN ('COMPLETED', 'CANCELLED') THEN NOW() - INTERVAL '2 day' ELSE NULL END,
                NOW() - ((property_idx * 5 + unit_idx - 1) || ' days')::INTERVAL,
                NOW()
            WHERE NOT EXISTS (SELECT 1 FROM maintenance_requests WHERE request_number = v_request_number_two);
        END LOOP;
    END LOOP;
END $$;
