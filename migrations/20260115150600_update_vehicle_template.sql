-- Update Vehicle template with comprehensive attributes
DO $$
DECLARE
    vehicle_cat_id UUID;
BEGIN
    -- Find Vehicles category
    SELECT id INTO vehicle_cat_id FROM categories WHERE name ILIKE '%Vehicle%' OR name ILIKE '%Kendaraan%' OR code = 'VEHICLES' LIMIT 1;

    -- Update Template for Vehicles with comprehensive attributes
    IF vehicle_cat_id IS NOT NULL THEN
        UPDATE category_attribute_templates 
        SET attributes = '[
            "license_plate",
            "bpkb_number", 
            "vin",
            "engine_number",
            "stnk_expiry",
            "kir_expiry",
            "tax_expiry",
            "fuel_type",
            "transmission",
            "odometer_last"
        ]'::jsonb,
        updated_at = NOW()
        WHERE category_id = vehicle_cat_id;
        
        -- If no row was updated (template doesn't exist yet), insert it
        IF NOT FOUND THEN
            INSERT INTO category_attribute_templates (category_id, attributes)
            VALUES (vehicle_cat_id, '[
                "license_plate",
                "bpkb_number", 
                "vin",
                "engine_number",
                "stnk_expiry",
                "kir_expiry",
                "tax_expiry",
                "fuel_type",
                "transmission",
                "odometer_last"
            ]'::jsonb);
        END IF;
    END IF;
END $$;
