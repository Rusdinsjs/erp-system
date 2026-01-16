-- Seed Category Attributes and Sub-categories based on previous hardcoded templates

DO $$
DECLARE
    heavy_equip_id UUID;
    computer_id UUID;
    server_id UUID;
    it_equip_id UUID;
BEGIN
    -- Get IDs of existing parent categories
    SELECT id INTO heavy_equip_id FROM categories WHERE code = 'INTI-ALAT-BERAT';
    SELECT id INTO computer_id FROM categories WHERE code = 'COMPUTER';
    SELECT id INTO server_id FROM categories WHERE code = 'SERVER';
    SELECT id INTO it_equip_id FROM categories WHERE code = 'IT-EQUIP';

    -- 1. HEAVY EQUIPMENT SUB-CATEGORIES --
    IF heavy_equip_id IS NOT NULL THEN
        -- Excavator
        INSERT INTO categories (code, name, parent_id, department, main_category, attributes)
        VALUES ('HE-EXCAVATOR', 'Excavator', heavy_equip_id, 'LOGISTIC', 'ASET INTI (RENTAL)', 
        '["Bucket Capacity (m3)", "Operating Weight (kg)", "Engine Power (HP)", "Max Digging Depth"]'::jsonb)
        ON CONFLICT (code) DO UPDATE SET attributes = EXCLUDED.attributes;

        -- Dump Truck (jika belum ada, masukkan ke inti-truk atau alat berat?, asumsi alat berat dulu sesuai template lama)
        -- Loader
        INSERT INTO categories (code, name, parent_id, department, main_category, attributes)
        VALUES ('HE-LOADER', 'Wheel Loader', heavy_equip_id, 'LOGISTIC', 'ASET INTI (RENTAL)', 
        '["Bucket Capacity (m3)", "Payload (kg)", "Engine Power (HP)", "Dumping Clearance"]'::jsonb)
        ON CONFLICT (code) DO UPDATE SET attributes = EXCLUDED.attributes;

        -- Dozer
        INSERT INTO categories (code, name, parent_id, department, main_category, attributes)
        VALUES ('HE-DOZER', 'Bulldozer', heavy_equip_id, 'LOGISTIC', 'ASET INTI (RENTAL)', 
        '["Blade Capacity (m3)", "Operating Weight (kg)", "Engine Power (HP)", "Blade Type"]'::jsonb)
        ON CONFLICT (code) DO UPDATE SET attributes = EXCLUDED.attributes;

        -- Grader
        INSERT INTO categories (code, name, parent_id, department, main_category, attributes)
        VALUES ('HE-GRADER', 'Motor Grader', heavy_equip_id, 'LOGISTIC', 'ASET INTI (RENTAL)', 
        '["Blade Width", "Operating Weight", "Engine Power"]'::jsonb)
        ON CONFLICT (code) DO UPDATE SET attributes = EXCLUDED.attributes;

        -- Compactor
        INSERT INTO categories (code, name, parent_id, department, main_category, attributes)
        VALUES ('HE-COMPACTOR', 'Compactor / Vibro', heavy_equip_id, 'LOGISTIC', 'ASET INTI (RENTAL)', 
        '["Drum Width", "Operating Weight", "Vibration Frequency"]'::jsonb)
        ON CONFLICT (code) DO UPDATE SET attributes = EXCLUDED.attributes;
        
        -- Crusher
        INSERT INTO categories (code, name, parent_id, department, main_category, attributes)
        VALUES ('HE-CRUSHER', 'Crusher / Pemecah Batu', heavy_equip_id, 'LOGISTIC', 'ASET INTI (RENTAL)', 
        '["Capacity (Ton/Hr)", "Power (KW)", "Input Size (mm)", "Output Size (mm)", "CSS Range"]'::jsonb)
        ON CONFLICT (code) DO UPDATE SET attributes = EXCLUDED.attributes;
    END IF;

    -- 2. IT EQUIPMENT --
    -- Computer (Laptop/PC)
    IF computer_id IS NOT NULL THEN
        UPDATE categories 
        SET attributes = '["Processor", "RAM", "Storage", "Screen Size", "OS"]'::jsonb
        WHERE id = computer_id;
    END IF;

    -- Server
    IF server_id IS NOT NULL THEN
        UPDATE categories 
        SET attributes = '["Processor", "RAM", "Storage (RAID)", "Form Factor", "OS"]'::jsonb
        WHERE id = server_id;
    END IF;
    
    -- Network (Upsert if needed, or update existing)
    -- Assuming generic attributes for generic categories not explicitly in old template but useful
    
    -- 3. PLANT & MACHINERY (Need to find parent first, assuming 'MACHINERY')
    DECLARE
        machinery_id UUID;
    BEGIN
        SELECT id INTO machinery_id FROM categories WHERE code = 'MACHINERY';
        
        IF machinery_id IS NOT NULL THEN
            -- Genset
            INSERT INTO categories (code, name, parent_id, department, main_category, attributes)
            VALUES ('PM-GENSET', 'Generator Set (Genset)', machinery_id, 'ENGINEERING', 'ASET OPERASIONAL', 
            '["KVA Prime", "KVA Standby", "Fuel Consumption (L/h)", "Phase", "Voltage"]'::jsonb)
            ON CONFLICT (code) DO UPDATE SET attributes = EXCLUDED.attributes;

            -- Compressor
            INSERT INTO categories (code, name, parent_id, department, main_category, attributes)
            VALUES ('PM-COMPRESSOR', 'Air Compressor', machinery_id, 'ENGINEERING', 'ASET OPERASIONAL', 
            '["Capacity (CFM)", "Pressure (Bar)", "Power (KW)"]'::jsonb)
            ON CONFLICT (code) DO UPDATE SET attributes = EXCLUDED.attributes;
        END IF;
    END;

END $$;
