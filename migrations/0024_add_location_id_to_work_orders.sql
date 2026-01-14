-- Add migration script here
ALTER TABLE maintenance_work_orders
ADD COLUMN location_id UUID REFERENCES locations(id);
