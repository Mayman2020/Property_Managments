-- V152: Add emails to employees 3, 4, 5 that were missing in V151 demo seed
UPDATE employees SET email = 'sultan.shehri@propmgmt.com'   WHERE id = 3;
UPDATE employees SET email = 'ahmed.qahtani@propmgmt.com'   WHERE id = 4;
UPDATE employees SET email = 'abdullah.sulami@propmgmt.com' WHERE id = 5;
