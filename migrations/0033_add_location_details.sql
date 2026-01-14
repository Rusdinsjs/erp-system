-- Add missing columns to locations table to match domain entity

ALTER TABLE locations
ADD COLUMN IF NOT EXISTS latitude VARCHAR(50),
ADD COLUMN IF NOT EXISTS longitude VARCHAR(50),
ADD COLUMN IF NOT EXISTS capacity INTEGER,
ADD COLUMN IF NOT EXISTS current_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN locations.latitude IS 'Latitude coordinate';
COMMENT ON COLUMN locations.longitude IS 'Longitude coordinate';
COMMENT ON COLUMN locations.capacity IS 'Maximum capacity for capacity planning';
COMMENT ON COLUMN locations.current_count IS 'Current utilization/occupancy';
