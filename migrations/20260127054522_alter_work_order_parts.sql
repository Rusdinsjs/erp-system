-- Add inventory_item_id to maintenance_work_order_parts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_work_order_parts' AND column_name = 'inventory_item_id') THEN
        ALTER TABLE maintenance_work_order_parts ADD COLUMN inventory_item_id UUID REFERENCES inventory_items(id);
    END IF;
END $$;

-- Rename added_at to created_at ONLY if created_at does NOT exist and added_at DOES
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_work_order_parts' AND column_name = 'added_at'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_work_order_parts' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE maintenance_work_order_parts RENAME COLUMN added_at TO created_at;
    END IF;
END $$;

-- Add updated_at if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_work_order_parts' AND column_name = 'updated_at') THEN
        ALTER TABLE maintenance_work_order_parts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;
