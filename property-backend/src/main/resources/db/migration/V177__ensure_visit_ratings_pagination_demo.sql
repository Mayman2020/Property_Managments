-- V177: Ensure visit ratings dashboard has at least 6 rows (pagination demo) + owner/admin notifications.

SET search_path = property_mgmt;

-- Mark additional maintenance requests as completed when visit ratings are sparse
UPDATE maintenance_requests mr
SET status = 'COMPLETED',
    closed_at = COALESCE(mr.closed_at, NOW())
WHERE mr.id IN (
    SELECT sub.id
    FROM (
        SELECT m.id
        FROM maintenance_requests m
        WHERE m.status NOT IN ('COMPLETED', 'NEEDS_REVISIT', 'CANCELLED')
        ORDER BY m.id
        LIMIT 12
    ) sub
)
AND (SELECT COUNT(*) FROM visit_ratings) < 6;

INSERT INTO visit_ratings (request_id, tenant_id, rating, comment)
SELECT mr.id,
       mr.tenant_id,
       CASE (mr.id % 4)
         WHEN 0 THEN 4
         WHEN 1 THEN 3
         WHEN 2 THEN 2
         ELSE 4
       END,
       CASE (mr.id % 3)
         WHEN 0 THEN 'خدمة ممتازة — الفني محترف والإصلاح سريع'
         WHEN 1 THEN 'العمل جيد لكن تأخر قليلاً عن الموعد'
         ELSE 'تقييم تجريبي — زيارة صيانة مكتملة'
       END
FROM maintenance_requests mr
WHERE mr.status IN ('COMPLETED', 'NEEDS_REVISIT')
  AND mr.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM visit_ratings vr WHERE vr.request_id = mr.id
  )
ORDER BY mr.id
LIMIT 25
ON CONFLICT (request_id) DO NOTHING;

-- Demo notifications to super admin for visit ratings (owner/admin/accountant flow QA)
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
       'قام المستأجر بتقييم طلب ' || COALESCE(mr.request_number, mr.id::text) || ' (بيانات تجريبية).',
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
