-- V179: Guaranteed tenant visit-ratings demo for /admin/ratings.
-- Prior seeds (V175–V177) only INSERT when completed maintenance_requests already exist;
-- if the DB was purged or migrations ran on an empty ops schema, visit_ratings stayed at 0.

SET search_path = property_mgmt;

-- Complete existing tenant-linked requests when ratings are sparse
UPDATE maintenance_requests mr
SET status = 'COMPLETED',
    closed_at = COALESCE(mr.closed_at, NOW() - ((mr.id % 14) + 1) * INTERVAL '1 day'),
    sla_breached = FALSE
WHERE mr.id IN (
    SELECT sub.id
    FROM (
        SELECT m.id
        FROM maintenance_requests m
        WHERE m.status NOT IN ('COMPLETED', 'NEEDS_REVISIT', 'CANCELLED')
          AND m.tenant_id IS NOT NULL
        ORDER BY m.id
        LIMIT 12
    ) sub
)
AND (SELECT COUNT(*) FROM visit_ratings) < 8;

-- Create completed maintenance visits from active leases when none exist yet
INSERT INTO maintenance_requests (
    request_number, tenant_id, unit_id, property_id, category_id,
    title, description, priority, status,
    scheduled_date, closed_at, sla_deadline, sla_breached, created_at
)
SELECT
    'MR-RATE-' || LPAD(lc.id::text, 4, '0'),
    lc.tenant_id,
    lc.unit_id,
    lc.property_id,
    (SELECT id FROM maintenance_categories ORDER BY id LIMIT 1),
    'زيارة صيانة مكتملة — ' || COALESCE(u.unit_number, 'وحدة ' || lc.unit_id),
    'طلب صيانة تجريبي: قام المستأجر بتقييم الزيارة بعد إغلاق الطلب (بيانات QA).',
    CASE (lc.id % 3) WHEN 0 THEN 'HIGH' WHEN 1 THEN 'NORMAL' ELSE 'LOW' END,
    'COMPLETED',
    CURRENT_DATE - (((lc.id % 10) + 3)::integer),
    NOW() - ((lc.id % 20) + 1) * INTERVAL '1 day',
    NOW() + INTERVAL '48 hours',
    FALSE,
    NOW() - ((lc.id % 20) + 3) * INTERVAL '1 day'
FROM lease_contracts lc
JOIN units u ON u.id = lc.unit_id
WHERE lc.status = 'ACTIVE'
  AND lc.tenant_id IS NOT NULL
  AND (SELECT COUNT(*) FROM visit_ratings) < 8
  AND NOT EXISTS (
      SELECT 1 FROM maintenance_requests x
      WHERE x.request_number = 'MR-RATE-' || LPAD(lc.id::text, 4, '0')
  )
ORDER BY lc.id
LIMIT 10
ON CONFLICT (request_number) DO NOTHING;

-- Tenant-submitted visit ratings (as if rated from the portal after a completed visit)
INSERT INTO visit_ratings (request_id, tenant_id, rating, comment, created_at)
SELECT mr.id,
       mr.tenant_id,
       CASE (mr.id % 4)
         WHEN 0 THEN 4
         WHEN 1 THEN 3
         WHEN 2 THEN 2
         ELSE 4
       END,
       CASE (mr.id % 5)
         WHEN 0 THEN 'خدمة ممتازة — الفني محترف والإصلاح سريع'
         WHEN 1 THEN 'العمل جيد لكن تأخر قليلاً عن الموعد'
         WHEN 2 THEN 'تم حل المشكلة بشكل كامل، شكراً للفريق'
         WHEN 3 THEN 'الصيانة مقبولة لكن احتاجت متابعة ثانية'
         ELSE 'تقييم المستأجر بعد زيارة صيانة مكتملة'
       END,
       COALESCE(mr.closed_at, NOW()) + INTERVAL '2 hours'
FROM maintenance_requests mr
WHERE mr.status IN ('COMPLETED', 'NEEDS_REVISIT')
  AND mr.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM visit_ratings vr WHERE vr.request_id = mr.id
  )
ORDER BY mr.id
LIMIT 25
ON CONFLICT (request_id) DO NOTHING;

-- Demo in-app notifications for super admin (owner/admin flow QA)
INSERT INTO notifications (
    recipient_user_id, actor_user_id, property_id, request_id,
    type, title, message, is_read, channel, related_entity, related_id, created_at
)
SELECT u.id,
       COALESCE(t.user_id, 1),
       mr.property_id,
       mr.id,
       'REQUEST_RATED',
       'تقييم زيارة صيانة',
       'قام المستأجر بتقييم طلب ' || COALESCE(mr.request_number, mr.id::text) || '.',
       FALSE,
       'IN_APP',
       'maintenance_request',
       mr.id,
       COALESCE(vr.created_at, NOW())
FROM visit_ratings vr
JOIN maintenance_requests mr ON mr.id = vr.request_id
LEFT JOIN tenants t ON t.id = mr.tenant_id
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role = 'SUPER_ADMIN' AND is_active = TRUE ORDER BY id LIMIT 1
) u
WHERE NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.type = 'REQUEST_RATED' AND n.request_id = mr.id AND n.recipient_user_id = u.id
)
ORDER BY vr.id
LIMIT 20;
