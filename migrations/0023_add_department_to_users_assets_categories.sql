-- Add department column to users
ALTER TABLE users ADD COLUMN department VARCHAR(100);

-- Add department column to assets
ALTER TABLE assets ADD COLUMN department VARCHAR(100);

-- Add department column to categories
ALTER TABLE categories ADD COLUMN department VARCHAR(100);
