-- Add assigned_asset_id and work_area_id to employees table
ALTER TABLE employees
ADD COLUMN assigned_asset_id UUID REFERENCES assets(id),
ADD COLUMN work_area_id UUID REFERENCES locations(id);

-- Index for faster lookups
CREATE INDEX idx_employees_assigned_asset ON employees(assigned_asset_id);
CREATE INDEX idx_employees_work_area ON employees(work_area_id);
