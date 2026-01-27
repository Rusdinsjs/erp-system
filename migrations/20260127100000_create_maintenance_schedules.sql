-- Create maintenance_schedules table
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Frequency definition
    interval_type VARCHAR(50) NOT NULL, -- 'time', 'usage'
    interval_value INTEGER NOT NULL,
    interval_unit VARCHAR(50) NOT NULL, -- 'days', 'months', 'km', 'hours'
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Tracking
    last_run_date DATE,
    last_run_reading INTEGER, -- For usage based (Odometer/Hours)
    next_run_date DATE,
    next_run_reading INTEGER, -- For usage based
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_asset ON maintenance_schedules(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_run ON maintenance_schedules(next_run_date) WHERE is_active = true;

-- Trigger to update updated_at
CREATE OR REPLACE TRIGGER update_maintenance_schedules_updated_at
BEFORE UPDATE ON maintenance_schedules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
