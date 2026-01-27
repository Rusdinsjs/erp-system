-- Migration: 20260127000000_create_inventory_module
-- Description: Separate Inventory Module with Account Mapping
-- Created: 2026-01-27

-- 1. Add extra units
INSERT INTO units (code, name) VALUES
('LITER', 'Liter'),
('DRUM', 'Drum'),
('KG', 'Kilogram'),
('MTR', 'Meter'),
('ROLL', 'Roll'),
('PCK', 'Pack')
ON CONFLICT (code) DO NOTHING;

-- 2. Inventory Categories with Account Mapping
CREATE TABLE IF NOT EXISTS inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Accounting Mapping
    inventory_account_id UUID REFERENCES chart_of_accounts(id), -- Asset Account (Persediaan)
    expense_account_id UUID REFERENCES chart_of_accounts(id),   -- Expense Account (Biaya Pemeliharaan)
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Inventory Items (Tepisah dari Aset Tetap)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES inventory_categories(id),
    unit_id INTEGER NOT NULL REFERENCES units(id),
    
    sku VARCHAR(100) UNIQUE NOT NULL, -- Kode Part / SKU
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Stock Management
    min_stock DECIMAL(15, 2) DEFAULT 0,
    max_stock DECIMAL(15, 2) DEFAULT 0,
    current_quantity DECIMAL(15, 2) NOT NULL DEFAULT 0,
    
    -- Financial Data
    average_cost DECIMAL(18, 2) NOT NULL DEFAULT 0,
    last_purchase_price DECIMAL(18, 2) NOT NULL DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Inventory Movements (Stock Ledger)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_movement_type') THEN
        CREATE TYPE inventory_movement_type AS ENUM (
            'IN_PURCHASE',    -- Stok masuk dari pembelian
            'IN_ADJUSTMENT',  -- Penambahan manual (Opname)
            'OUT_USAGE',      -- Pemakaian (Work Order)
            'OUT_ADJUSTMENT', -- Pengurangan manual (Opname)
            'OUT_TRANSFER'    -- Transfer antar gudang (jika ada)
        );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    movement_type inventory_movement_type NOT NULL,
    
    quantity DECIMAL(15, 2) NOT NULL,
    unit_price DECIMAL(18, 2) NOT NULL, -- Harga saat transaksi terjadi
    total_value DECIMAL(18, 2) NOT NULL,
    
    reference_id UUID,     -- Link ke ID Work Order, ID Purchase, dll
    reference_number VARCHAR(100), -- No WO, No Invoice, dll
    
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Link Inventory Items to Work Order Parts (Optional column)
ALTER TABLE maintenance_work_order_parts ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES inventory_items(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inv_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inv_movements_item ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_ref ON inventory_movements(reference_number);

-- Trigger for update_at
DROP TRIGGER IF EXISTS update_inventory_categories_updated_at ON inventory_categories;
CREATE TRIGGER update_inventory_categories_updated_at
BEFORE UPDATE ON inventory_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON inventory_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
