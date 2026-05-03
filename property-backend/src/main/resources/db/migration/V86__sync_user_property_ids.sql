-- V86: Fix stale property_id on users after data resets.
-- V81 truncated properties but kept PROPERTY_ADMIN/HR/ACCOUNTANT users, leaving
-- their property_id pointing to deleted rows. V85 re-created properties with new
-- sequence IDs, so this migration unconditionally re-syncs every affected user.

SET search_path = property_mgmt;

DO $$
DECLARE
    v_property1_id BIGINT;
    v_property2_id BIGINT;
BEGIN
    SELECT id INTO v_property1_id FROM properties WHERE property_code = 'PROP-TEST-001';
    SELECT id INTO v_property2_id FROM properties WHERE property_code = 'PROP-QC-002';

    IF v_property1_id IS NOT NULL THEN
        UPDATE users
        SET property_id = v_property1_id
        WHERE email IN (
            'propertyadmin1@propmgmt.com',
            'accountant1@propmgmt.com',
            'hrofficer1@propmgmt.com',
            'contractsofficer1@propmgmt.com',
            'officer1@propmgmt.com',
            'tenant1@propmgmt.com'
        );
    END IF;

    IF v_property2_id IS NOT NULL THEN
        UPDATE users
        SET property_id = v_property2_id
        WHERE email = 'tenant2@propmgmt.com';
    END IF;
END $$;
