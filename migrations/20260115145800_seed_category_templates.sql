-- Seed initial category attribute templates
-- We first need to find the category IDs. Since we don't know the IDs, we will try to look them up by name or code if they exist, 
-- or generic logic if we can't find them.
-- However, safe way is to create a function to helper insert.

DO $$
DECLARE
    it_cat_id UUID;
    vehicle_cat_id UUID;
    heavy_eq_cat_id UUID;
BEGIN
    -- Try to find categories (Assuming standard names/codes exist from previous seeds or usage)
    -- Adjust these names if your actual category names are different
    SELECT id INTO it_cat_id FROM categories WHERE name ILIKE '%IT Equipment%' OR code = 'IT' LIMIT 1;
    SELECT id INTO vehicle_cat_id FROM categories WHERE name ILIKE '%Vehicle%' OR code = 'VEHICLES' LIMIT 1;
    SELECT id INTO heavy_eq_cat_id FROM categories WHERE name ILIKE '%Heavy Equipment%' OR code = 'HE' LIMIT 1;

    -- Insert Template for IT Equipment
    IF it_cat_id IS NOT NULL THEN
        INSERT INTO category_attribute_templates (category_id, attributes)
        VALUES (it_cat_id, '["Processor", "RAM", "Storage", "OS", "Screen Size", "Serial Number"]'::jsonb)
        ON CONFLICT (category_id) DO NOTHING;
    END IF;

    -- Insert Template for Vehicles
    IF vehicle_cat_id IS NOT NULL THEN
        INSERT INTO category_attribute_templates (category_id, attributes)
        VALUES (vehicle_cat_id, '["License Plate", "VIN", "Engine Number", "Color", "Year", "Fuel Type"]'::jsonb)
        ON CONFLICT (category_id) DO NOTHING;
    END IF;

    -- Insert Template for Heavy Equipment
    IF heavy_eq_cat_id IS NOT NULL THEN
        INSERT INTO category_attribute_templates (category_id, attributes)
        VALUES (heavy_eq_cat_id, '["Capacity (Ton/Hr)", "Power (KW)", "Input Size", "Output Size", "Engine Power (HP)", "Operating Weight (kg)"]'::jsonb)
        ON CONFLICT (category_id) DO NOTHING;
    END IF;

END $$;
