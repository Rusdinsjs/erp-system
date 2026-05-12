-- Clear existing templates and insert correctly
DELETE FROM category_attribute_templates;

-- Insert template for Kendaraan (VEHICLE)
INSERT INTO category_attribute_templates (category_id, attributes)
SELECT id, '["license_plate", "bpkb_number", "vin", "engine_number", "stnk_expiry", "kir_expiry", "tax_expiry", "fuel_type", "transmission", "odometer_last"]'::jsonb
FROM categories WHERE code = 'VEHICLE' OR code = 'OPS-KENDARAAN' LIMIT 1;

-- Insert template for Alat Berat (Heavy Equipment)
INSERT INTO category_attribute_templates (category_id, attributes)
SELECT id, '["Capacity (Ton/Hr)", "Power (KW)", "Input Size", "Output Size", "Engine Power (HP)", "Operating Weight (kg)"]'::jsonb
FROM categories WHERE code = 'INTI-ALAT-BERAT' LIMIT 1;

-- Insert template for IT Equipment
INSERT INTO category_attribute_templates (category_id, attributes)
SELECT id, '["Processor", "RAM", "Storage", "OS", "Screen Size", "Serial Number"]'::jsonb
FROM categories WHERE code = 'IT-EQUIP' LIMIT 1;

-- Insert template for Komputer & Laptop
INSERT INTO category_attribute_templates (category_id, attributes)
SELECT id, '["Processor", "RAM", "Storage", "OS", "Screen Size"]'::jsonb
FROM categories WHERE code = 'COMPUTER' LIMIT 1;

-- Insert template for Furniture
INSERT INTO category_attribute_templates (category_id, attributes)
SELECT id, '["Material", "Color", "Dimensions", "Room Location"]'::jsonb
FROM categories WHERE code = 'FURNITURE' LIMIT 1;
