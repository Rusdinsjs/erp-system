-- Seeding Inventory Items and Initial Stock
-- Depends on: 20260127000000_create_inventory_module.sql (Module Creation)
-- Depends on: 20260127000100_standardize_indonesian_coa.sql (Categories Seeding)

DO $$
DECLARE
    -- Category IDs
    v_cat_sp UUID; -- Suku Cadang
    v_cat_lb UUID; -- Pelumas
    v_cat_tr UUID; -- Ban
    
    -- Unit IDs
    v_unit_pcs INTEGER;
    v_unit_ltr INTEGER;
    v_unit_drm INTEGER;
    v_unit_set INTEGER;
    
    -- Item IDs (for movements)
    v_item_id UUID;
BEGIN
    -- 1. Get Category IDs
    SELECT id INTO v_cat_sp FROM inventory_categories WHERE code = 'CAT-SP';
    SELECT id INTO v_cat_lb FROM inventory_categories WHERE code = 'CAT-LB';
    SELECT id INTO v_cat_tr FROM inventory_categories WHERE code = 'CAT-TR';
    
    -- 2. Get Unit IDs (Case sensitive check based on previous migration)
    SELECT id INTO v_unit_pcs FROM units WHERE code = 'PCS';
    SELECT id INTO v_unit_ltr FROM units WHERE code = 'LITER';
    SELECT id INTO v_unit_drm FROM units WHERE code = 'DRUM';
    SELECT id INTO v_unit_set FROM units WHERE code = 'SET';
    
    -- Fallback for Units if strictly not found (though previous migration inserts them)
    IF v_unit_pcs IS NULL THEN INSERT INTO units (code, name) VALUES ('PCS', 'Pieces') RETURNING id INTO v_unit_pcs; END IF;
    IF v_unit_set IS NULL THEN INSERT INTO units (code, name) VALUES ('SET', 'Set') RETURNING id INTO v_unit_set; END IF;

    -- ==========================================
    -- CATEGORY: SUKU CADANG (CAT-SP)
    -- ==========================================
    
    -- Item 1: Filter Oli Komatsu
    INSERT INTO inventory_items (category_id, unit_id, sku, name, description, min_stock, max_stock, current_quantity, average_cost, last_purchase_price)
    VALUES (v_cat_sp, v_unit_pcs, 'SP-FLT-KM-001', 'Filter Oli Komatsu PC200', 'Oil Filter Genuine Komatsu 600-211-1340', 10, 50, 25, 150000, 155000)
    RETURNING id INTO v_item_id;
    
    -- Opening Stock Movement
    INSERT INTO inventory_movements (item_id, movement_type, quantity, unit_price, total_value, notes, reference_number)
    VALUES (v_item_id, 'IN_ADJUSTMENT', 25, 150000, 3750000, 'Saldo Awal Migrasi', 'OP-INV-2026');

    -- Item 2: Filter Udara Outer
    INSERT INTO inventory_items (category_id, unit_id, sku, name, description, min_stock, max_stock, current_quantity, average_cost, last_purchase_price)
    VALUES (v_cat_sp, v_unit_pcs, 'SP-FLT-AF-002', 'Air Filter Outer Sakuda', 'Air Filter Outer compatible with Hino 500', 5, 20, 8, 350000, 350000)
    RETURNING id INTO v_item_id;
    
    INSERT INTO inventory_movements (item_id, movement_type, quantity, unit_price, total_value, notes, reference_number)
    VALUES (v_item_id, 'IN_ADJUSTMENT', 8, 350000, 2800000, 'Saldo Awal Migrasi', 'OP-INV-2026');

    -- Item 3: Kampas Rem Depan
    INSERT INTO inventory_items (category_id, unit_id, sku, name, description, min_stock, max_stock, current_quantity, average_cost, last_purchase_price)
    VALUES (v_cat_sp, v_unit_set, 'SP-BRK-FR-003', 'Kampas Rem Depan (Brake Pad)', 'Brake Pad Set Isuzu Giga', 4, 12, 10, 850000, 850000)
    RETURNING id INTO v_item_id;
    
    INSERT INTO inventory_movements (item_id, movement_type, quantity, unit_price, total_value, notes, reference_number)
    VALUES (v_item_id, 'IN_ADJUSTMENT', 10, 850000, 8500000, 'Saldo Awal Migrasi', 'OP-INV-2026');


    -- ==========================================
    -- CATEGORY: PELUMAS & KIMIA (CAT-LB)
    -- ==========================================

    -- Item 4: Shell Rimula R4
    INSERT INTO inventory_items (category_id, unit_id, sku, name, description, min_stock, max_stock, current_quantity, average_cost, last_purchase_price)
    VALUES (v_cat_lb, v_unit_drm, 'LB-OIL-R4-DRM', 'Shell Rimula R4X 15W-40 (Drum)', 'Drum 209 Liter', 2, 10, 5, 8500000, 8750000)
    RETURNING id INTO v_item_id;
    
    INSERT INTO inventory_movements (item_id, movement_type, quantity, unit_price, total_value, notes, reference_number)
    VALUES (v_item_id, 'IN_ADJUSTMENT', 5, 8500000, 42500000, 'Saldo Awal Migrasi', 'OP-INV-2026');

    -- Item 5: Coolant Prestone
    INSERT INTO inventory_items (category_id, unit_id, sku, name, description, min_stock, max_stock, current_quantity, average_cost, last_purchase_price)
    VALUES (v_cat_lb, v_unit_ltr, 'LB-CLT-PRS-001', 'Prestone Radiator Coolant', 'Ready to use, Green, Galon 4L', 20, 100, 45, 125000, 130000)
    RETURNING id INTO v_item_id;
    
    INSERT INTO inventory_movements (item_id, movement_type, quantity, unit_price, total_value, notes, reference_number)
    VALUES (v_item_id, 'IN_ADJUSTMENT', 45, 125000, 5625000, 'Saldo Awal Migrasi', 'OP-INV-2026');
    
    
    -- ==========================================
    -- CATEGORY: BAN / TIRES (CAT-TR)
    -- ==========================================

    -- Item 6: Ban Bridgestone
    INSERT INTO inventory_items (category_id, unit_id, sku, name, description, min_stock, max_stock, current_quantity, average_cost, last_purchase_price)
    VALUES (v_cat_tr, v_unit_pcs, 'TR-BS-1000-20', 'Bridgestone 10.00-20', 'Ban Truk - E-Miler', 10, 40, 12, 3800000, 3950000)
    RETURNING id INTO v_item_id;
    
    INSERT INTO inventory_movements (item_id, movement_type, quantity, unit_price, total_value, notes, reference_number)
    VALUES (v_item_id, 'IN_ADJUSTMENT', 12, 3800000, 45600000, 'Saldo Awal Migrasi', 'OP-INV-2026');
    
    -- Item 7: Ban GT Radial
    INSERT INTO inventory_items (category_id, unit_id, sku, name, description, min_stock, max_stock, current_quantity, average_cost, last_purchase_price)
    VALUES (v_cat_tr, v_unit_pcs, 'TR-GT-750-16', 'GT Radial 7.50-16', 'Ban Truk Engkel', 8, 24, 20, 2100000, 2200000)
    RETURNING id INTO v_item_id;
    
    INSERT INTO inventory_movements (item_id, movement_type, quantity, unit_price, total_value, notes, reference_number)
    VALUES (v_item_id, 'IN_ADJUSTMENT', 20, 2100000, 42000000, 'Saldo Awal Migrasi', 'OP-INV-2026');

END $$;
