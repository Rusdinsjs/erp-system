-- Add supervisor_signoff column to maintenance_work_orders
ALTER TABLE maintenance_work_orders
ADD COLUMN supervisor_signoff TEXT;
