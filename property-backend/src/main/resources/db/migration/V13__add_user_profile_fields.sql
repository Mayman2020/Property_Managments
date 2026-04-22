-- V13: User profile support

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(600);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
