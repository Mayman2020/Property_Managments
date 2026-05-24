UPDATE module_definitions
SET icon = 'meeting_room'
WHERE module_key = 'vacancies'
  AND (icon IS NULL OR icon = 'door_open' OR icon = '');
