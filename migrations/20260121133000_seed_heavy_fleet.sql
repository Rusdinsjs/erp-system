-- Migration: Seed Heavy Equipment & Fleet
-- Description: Adds 5 Heavy Equipment, 5 Dump Trucks, and 5 Operational Vehicles
-- Created: 2026-01-21

-- ============================================
-- PREPARE SCHEMA (Missing Column Fix)
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'assets' AND column_name = 'vehicle_details'
    ) THEN
        ALTER TABLE assets ADD COLUMN vehicle_details JSONB;
    END IF;
END $$;

-- ============================================
-- ENSURE CATEGORIES EXIST
-- ============================================

INSERT INTO categories (id, code, name, parent_id) VALUES
    -- Heavy Equipment (under MACHINERY)
    ('44444444-4444-4444-4444-444444444431', 'HEAVY-EQUIP', 'Alat Berat', '44444444-4444-4444-4444-444444444404'),
    -- Fleet (under VEHICLE)
    ('44444444-4444-4444-4444-444444444441', 'DUMP-TRUCK', 'Dump Truck', '44444444-4444-4444-4444-444444444403'),
    ('44444444-4444-4444-4444-444444444442', 'OPERATIONAL', 'Kendaraan Operasional', '44444444-4444-4444-4444-444444444403')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5 HEAVY EQUIPMENT (ALAT BERAT)
-- ============================================

INSERT INTO assets (id, asset_code, name, category_id, location_id, department_id, organization_id, status, brand, model, purchase_date, purchase_price, useful_life_months, is_rental) VALUES
    -- 1. Excavator PC200
    (gen_random_uuid(), 'EQP-2024-001', 'Excavator Komatsu PC200-10', '44444444-4444-4444-4444-444444444431', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'available', 'Komatsu', 'PC200-10', '2023-01-15', 1500000000, 120, true),
    
    -- 2. Excavator Kobelco
    (gen_random_uuid(), 'EQP-2024-002', 'Excavator Kobelco SK200', '44444444-4444-4444-4444-444444444431', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'rented_out', 'Kobelco', 'SK200-10', '2023-02-20', 1450000000, 120, true),
    
    -- 3. Bulldozer
    (gen_random_uuid(), 'EQP-2024-003', 'Bulldozer CAT D6R', '44444444-4444-4444-4444-444444444431', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'available', 'Caterpillar', 'D6R XL', '2022-06-10', 2200000000, 120, true),

    -- 4. Wheel Loader
    (gen_random_uuid(), 'EQP-2024-004', 'Wheel Loader WA380', '44444444-4444-4444-4444-444444444431', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'maintenance', 'Komatsu', 'WA380-6', '2023-08-01', 1800000000, 120, true),

    -- 5. Motor Grader
    (gen_random_uuid(), 'EQP-2024-005', 'Motor Grader GD535', '44444444-4444-4444-4444-444444444431', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'available', 'Komatsu', 'GD535-5', '2023-11-15', 1900000000, 120, true);

-- ============================================
-- 5 DUMP TRUCKS
-- ============================================

INSERT INTO assets (id, asset_code, name, category_id, location_id, department_id, organization_id, status, brand, model, purchase_date, purchase_price, useful_life_months, is_rental, vehicle_details) VALUES
    -- 1. Hino 500
    (gen_random_uuid(), 'DT-001', 'Hino 500 Ranger (DT-01)', '44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'available', 'Hino', 'FM 260 JD', '2023-05-01', 850000000, 96, true,
    '{"license_plate": "B 9001 TXT", "fuel_type": "Diesel", "capacity": "20 Ton", "color": "Green"}'::jsonb),

    -- 2. Hino 500
    (gen_random_uuid(), 'DT-002', 'Hino 500 Ranger (DT-02)', '44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'rented_out', 'Hino', 'FM 260 JD', '2023-05-01', 850000000, 96, true,
    '{"license_plate": "B 9002 TXT", "fuel_type": "Diesel", "capacity": "20 Ton", "color": "Green"}'::jsonb),

    -- 3. Isuzu Giga
    (gen_random_uuid(), 'DT-003', 'Isuzu Giga FVZ (DT-03)', '44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'available', 'Isuzu', 'FVZ 34 N HP', '2023-06-15', 900000000, 96, true,
    '{"license_plate": "B 9003 TXT", "fuel_type": "Diesel", "capacity": "24 Ton", "color": "White"}'::jsonb),

    -- 4. Mitsubishi Fuso
    (gen_random_uuid(), 'DT-004', 'Fuso Fighter X (DT-04)', '44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'maintenance', 'Mitsubishi', 'FN 62 F HD', '2023-07-20', 880000000, 96, true,
    '{"license_plate": "B 9004 TXT", "fuel_type": "Diesel", "capacity": "22 Ton", "color": "Orange"}'::jsonb),

    -- 5. Hino 500
    (gen_random_uuid(), 'DT-005', 'Hino 500 Ranger (DT-05)', '44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'available', 'Hino', 'FM 260 JD', '2023-05-01', 850000000, 96, true,
    '{"license_plate": "B 9005 TXT", "fuel_type": "Diesel", "capacity": "20 Ton", "color": "Green"}'::jsonb);

-- ============================================
-- 5 OPERATIONAL VEHICLES (KENDARAAN)
-- ============================================

INSERT INTO assets (id, asset_code, name, category_id, location_id, department_id, organization_id, status, brand, model, purchase_date, purchase_price, useful_life_months, is_rental, vehicle_details) VALUES
    -- 1. Toyota Hilux
    (gen_random_uuid(), 'OPS-001', 'Toyota Hilux DC 4x4', '44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'in_use', 'Toyota', 'Hilux Double Cabin', '2024-01-05', 550000000, 60, false,
    '{"license_plate": "B 1234 ABC", "fuel_type": "Diesel", "capacity": "5 Seater", "color": "White"}'::jsonb),

    -- 2. Mitsubishi Triton
    (gen_random_uuid(), 'OPS-002', 'Mitsubishi Triton DC', '44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'available', 'Mitsubishi', 'Triton GLS', '2024-02-10', 530000000, 60, false,
    '{"license_plate": "B 1235 ABC", "fuel_type": "Diesel", "capacity": "5 Seater", "color": "Silver"}'::jsonb),

    -- 3. Toyota Avanza
    (gen_random_uuid(), 'OPS-003', 'Toyota Avanza Veloz (Pool)', '44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'available', 'Toyota', 'Avanza Veloz', '2023-11-20', 280000000, 60, false,
    '{"license_plate": "B 1236 ABC", "fuel_type": "Petrol", "capacity": "7 Seater", "color": "Black"}'::jsonb),

    -- 4. Innova Zenix
    (gen_random_uuid(), 'OPS-004', 'Innova Zenix Hybrid (Direksi)', '44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'in_use', 'Toyota', 'Innova Zenix Q', '2024-01-15', 620000000, 60, false,
    '{"license_plate": "B 1 RFS", "fuel_type": "Hybrid", "capacity": "7 Seater", "color": "Black"}'::jsonb),

    -- 5. Gran Max Blind Van
    (gen_random_uuid(), 'OPS-005', 'Daihatsu Gran Max (Logistik)', '44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'available', 'Daihatsu', 'Gran Max BV', '2023-10-05', 180000000, 60, false,
    '{"license_plate": "B 9876 XYZ", "fuel_type": "Petrol", "capacity": "Cargo", "color": "White"}'::jsonb);
