-- Fix: notifications.request_id is overloaded as a generic identifier across
-- many notification sources (vacancy listings, payroll deductions, complaints,
-- lease contracts, etc.), but the column was originally created with a foreign
-- key to maintenance_requests in V11. That FK fires whenever any non-maintenance
-- notification (e.g. an auto-published vacancy listing fired when a lease
-- termination is approved) writes a non-maintenance id, and the insert fails
-- with a constraint violation, masking the originating business action with a
-- 500 INTERNAL_ERROR.
--
-- Dropping the FK is non-destructive (the column itself, its data, and all
-- downstream uses such as click-through navigation remain intact); it simply
-- removes the legacy maintenance-only constraint so the column can serve its
-- already-existing polymorphic role.

ALTER TABLE property_mgmt.notifications
    DROP CONSTRAINT IF EXISTS notifications_request_id_fkey;
