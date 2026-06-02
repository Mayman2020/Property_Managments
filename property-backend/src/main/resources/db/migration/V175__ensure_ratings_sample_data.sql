-- V175: Ensure ratings dashboard has sample data when requests/complaints exist but ratings are empty.

INSERT INTO property_mgmt.visit_ratings (request_id, tenant_id, rating, comment)
SELECT mr.id,
       mr.tenant_id,
       CASE (mr.id % 4)
         WHEN 0 THEN 4
         WHEN 1 THEN 3
         WHEN 2 THEN 2
         ELSE 4
       END,
       'Demo visit rating — auto-seeded for ratings dashboard QA'
FROM property_mgmt.maintenance_requests mr
WHERE mr.status IN ('COMPLETED', 'NEEDS_REVISIT')
  AND NOT EXISTS (
    SELECT 1 FROM property_mgmt.visit_ratings vr WHERE vr.request_id = mr.id
  )
ORDER BY mr.id
LIMIT 25
ON CONFLICT (request_id) DO NOTHING;

INSERT INTO property_mgmt.complaint_ratings (complaint_id, rater_user_id, rating, rater_role, rated_at)
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
FROM property_mgmt.tenant_complaints c
LEFT JOIN property_mgmt.tenants t ON t.id = c.tenant_id
WHERE c.status IN ('RESOLVED', 'CLOSED')
  AND NOT EXISTS (
    SELECT 1 FROM property_mgmt.complaint_ratings cr WHERE cr.complaint_id = c.id
  )
ORDER BY c.id
LIMIT 25
ON CONFLICT (complaint_id) DO NOTHING;