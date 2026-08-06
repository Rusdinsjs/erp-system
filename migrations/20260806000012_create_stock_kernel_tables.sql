-- Migration 20260806000012: Phase 5 Trusted Stock Kernel (QSTK-001 s.d QSTK-004, QSTK-010)

-- 1. Warehouses Table (QSTK-002)
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    parent_id UUID REFERENCES warehouses(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    warehouse_type VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_warehouse_company_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_warehouses_company ON warehouses(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_parent ON warehouses(parent_id);

-- Seed default Main Warehouse for default company scope
INSERT INTO warehouses (id, company_id, code, name, is_group, warehouse_type)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'WH-MAIN', 'Main Warehouse', FALSE, 'DEFAULT')
ON CONFLICT (company_id, code) DO NOTHING;

-- 2. Bin Projection Table (QSTK-003)
CREATE TABLE IF NOT EXISTS bins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    actual_qty NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    reserved_qty NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    ordered_qty NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    stock_value NUMERIC(20,4) NOT NULL DEFAULT 0.0000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bin_company_warehouse_item UNIQUE (company_id, warehouse_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_bins_warehouse_item ON bins(warehouse_id, item_id);
CREATE INDEX IF NOT EXISTS idx_bins_item ON bins(item_id);

-- 3. Immutable Stock Ledger Entries (QSTK-004)
CREATE TABLE IF NOT EXISTS stock_ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    posting_date DATE NOT NULL,
    posting_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actual_qty_delta NUMERIC(15,4) NOT NULL,
    qty_after NUMERIC(15,4) NOT NULL,
    valuation_rate NUMERIC(18,6) NOT NULL DEFAULT 0.000000,
    stock_value_delta NUMERIC(20,4) NOT NULL DEFAULT 0.0000,
    stock_value_after NUMERIC(20,4) NOT NULL DEFAULT 0.0000,
    voucher_type VARCHAR(50) NOT NULL,
    voucher_no VARCHAR(100) NOT NULL,
    voucher_id UUID NOT NULL,
    voucher_line_id UUID,
    batch_no VARCHAR(100),
    serial_no VARCHAR(100),
    is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID
);

-- Performance and Audit indexes for Stock Ledger
CREATE INDEX IF NOT EXISTS idx_sle_company_wh_item_date ON stock_ledger_entries(company_id, warehouse_id, item_id, posting_date);
CREATE INDEX IF NOT EXISTS idx_sle_voucher ON stock_ledger_entries(voucher_type, voucher_id);
CREATE INDEX IF NOT EXISTS idx_sle_posting_datetime ON stock_ledger_entries(posting_datetime);

-- Trigger to prevent UPDATE or DELETE on immutable stock_ledger_entries (QSTK-004 Append-Only Enforcement)
CREATE OR REPLACE FUNCTION prevent_stock_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'QSTK-004 Immutability Violation: stock_ledger_entries is append-only. Updates and deletes are forbidden. Use reversing stock movements instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_stock_ledger_mutation ON stock_ledger_entries;
CREATE TRIGGER trg_prevent_stock_ledger_mutation
BEFORE UPDATE OR DELETE ON stock_ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_stock_ledger_mutation();

-- 4. Stock Reservations Table (QSTK-010)
CREATE TABLE IF NOT EXISTS stock_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    reserved_qty NUMERIC(15,4) NOT NULL,
    voucher_type VARCHAR(50) NOT NULL,
    voucher_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_item ON stock_reservations(warehouse_id, item_id);
