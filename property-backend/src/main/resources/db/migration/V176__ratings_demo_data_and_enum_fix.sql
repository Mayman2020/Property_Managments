-- V176: Ratings dashboard demo data + normalize legacy complaint rating labels.
-- Business flow: tenants rate COMPLETED/NEEDS_REVISIT visits and CLOSED/RESOLVED complaints;
-- admins see results on /admin/ratings; REQUEST_RATED / COMPLAINT_RATED notifications fire on real submit.

SET search_path = property_mgmt;

-- ── 1. Normalize legacy seed labels to API enums ─────────────────────
UPDATE complaint_ratings
SET rating = CASE rating
    WHEN 'EXCELLENT'  THEN 'VERY_SATISFIED'
    WHEN 'VERY_GOOD'  THEN 'VERY_SATISFIED'
    WHEN 'GOOD'       THEN 'SATISFIED'
    WHEN 'FAIR'       THEN 'DISSATISFIED'
    WHEN 'POOR'       THEN 'VERY_DISSATISFIED'
    ELSE rating
END
WHERE rating IN ('EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR');

-- ── 2. Close open demo complaint so it can appear in ratings ─────────
UPDATE tenant_complaints
SET status = 'CLOSED',
    resolved_at = COALESCE(resolved_at, NOW())
WHERE status IN ('OPEN', 'IN_REVIEW')
  AND id = (
    SELECT tc.id
    FROM tenant_complaints tc
    WHERE tc.status IN ('OPEN', 'IN_REVIEW')
    ORDER BY tc.id
    LIMIT 1
  );

-- ── 2b. Ensure at least two completed requests exist for visit ratings demo
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
        LIMIT 2
    ) sub
)
AND NOT EXISTS (
    SELECT 1 FROM maintenance_requests x
    WHERE x.status IN ('COMPLETED', 'NEEDS_REVISIT')
);

-- ── 2c. Seed closed complaints when table is empty (demo QA) ───────────
INSERT INTO tenant_complaints (
    tenant_id, unit_id, property_id, complaint_type, title, description, status, priority, resolved_at
)
SELECT DISTINCT ON (t.id)
       t.id,
       lc.unit_id,
       lc.property_id,
       'COMMON_AREA',
       'شكوى تجريبية — ' || COALESCE(t.full_name, 'مستأجر'),
       'بيانات تجريبية لاختبار تقييمات الشكاوى في لوحة التقييمات.',
       'CLOSED',
       'NORMAL',
       NOW()
FROM tenants t
JOIN lease_contracts lc ON lc.tenant_id = t.id AND lc.status = 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM tenant_complaints)
ORDER BY t.id, lc.id
LIMIT 3;

-- ── 3. Visit ratings for completed / needs-revisit requests ──────────
INSERT INTO visit_ratings (request_id, tenant_id, rating, comment)
SELECT mr.id,
       mr.tenant_id,
       CASE (mr.id % 4)
         WHEN 0 THEN 4
         WHEN 1 THEN 3
         WHEN 2 THEN 2
         ELSE 4
       END,
       'تقييم تجريبي — زيارة صيانة مكتملة'
FROM maintenance_requests mr
WHERE mr.status IN ('COMPLETED', 'NEEDS_REVISIT')
  AND NOT EXISTS (
    SELECT 1 FROM visit_ratings vr WHERE vr.request_id = mr.id
  )
ORDER BY mr.id
LIMIT 25
ON CONFLICT (request_id) DO NOTHING;

-- ── 4. Complaint ratings for closed / resolved complaints ────────────
INSERT INTO complaint_ratings (complaint_id, rater_user_id, rating, rater_role, rated_at)
SELECT c.id,
       COALESCE(t.user_id, 1),
       CASE (c.id % 4)
         WHEN 0 THEN 'VERY_SATISFIED'
         WHEN 1 THEN 'SATISFIED'
         WHEN 2 THEN 'DISSATISFIED'
         ELSE 'VERY_DISSATISFIED'
       END,
       'TENANT',
       COALESCE(c.resolved_at, c.created_at, NOW())
FROM tenant_complaints c
LEFT JOIN tenants t ON t.id = c.tenant_id
WHERE c.status IN ('RESOLVED', 'CLOSED')
  AND NOT EXISTS (
    SELECT 1 FROM complaint_ratings cr WHERE cr.complaint_id = c.id
  )
ORDER BY c.id
LIMIT 25
ON CONFLICT (complaint_id) DO NOTHING;

-- ── 5. Sample in-app notifications (demo only, idempotent) ───────────
INSERT INTO notifications (
    recipient_user_id, actor_user_id, property_id, request_id,
    type, title, message, is_read, channel, related_entity, related_id, created_at
)
SELECT 1,
       COALESCE(t.user_id, 1),
       mr.property_id,
       mr.id,
       'REQUEST_RATED',
       'Tenant submitted a rating',
       'Request ' || COALESCE(mr.request_number, mr.id::text) || ' was rated (demo seed).',
       FALSE,
       'IN_APP',
       'maintenance_request',
       mr.id,
       COALESCE(vr.created_at, NOW())
FROM visit_ratings vr
JOIN maintenance_requests mr ON mr.id = vr.request_id
LEFT JOIN tenants t ON t.id = mr.tenant_id
WHERE NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.type = 'REQUEST_RATED' AND n.request_id = mr.id
)
ORDER BY vr.id
LIMIT 10;

INSERT INTO notifications (
    recipient_user_id, actor_user_id, property_id,
    type, title, message, is_read, channel, related_entity, related_id, created_at
)
SELECT 1,
       cr.rater_user_id,
       c.property_id,
       'COMPLAINT_RATED',
       'تقييم شكوى',
       'تم تقييم الشكوى: ' || COALESCE(c.title, 'شكوى #' || c.id),
       FALSE,
       'IN_APP',
       'tenant_complaint',
       c.id,
       COALESCE(cr.rated_at, NOW())
FROM complaint_ratings cr
JOIN tenant_complaints c ON c.id = cr.complaint_id
WHERE NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.type = 'COMPLAINT_RATED' AND n.related_entity = 'tenant_complaint' AND n.related_id = c.id
)
ORDER BY cr.id
LIMIT 10;
