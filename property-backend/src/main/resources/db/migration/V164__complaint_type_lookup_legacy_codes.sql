INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked)
VALUES
('COMPLAINT_TYPE', 'NEIGHBOR_NOISE', 'إزعاج الجيران', 'Neighbor noise', 7, true, false),
('COMPLAINT_TYPE', 'COMMON_AREA', 'المناطق المشتركة', 'Common area', 8, true, false),
('COMPLAINT_TYPE', 'CLEANLINESS', 'النظافة', 'Cleanliness', 9, true, false)
ON CONFLICT (type, code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
