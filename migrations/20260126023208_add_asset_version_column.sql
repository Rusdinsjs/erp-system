-- Add version column for optimistic locking
ALTER TABLE assets ADD COLUMN version INT DEFAULT 1;
