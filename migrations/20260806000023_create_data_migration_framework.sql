-- Migration 20260806000023: Section 23 Data Migration Strategy Across the Program

-- 1. Data Migration Logs Table (10-Step Migration Sequence Tracking)
CREATE TABLE IF NOT EXISTS data_migration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name VARCHAR(150) NOT NULL,
    step_number INT NOT NULL, -- 1=Inventory, 2=AddSchema, 3=Backfill, 4=Reconcile, 5=ShadowRead, 6=SwitchWrites, 7=SwitchReads, 8=Enforce, 9=Observe, 10=Cleanup
    step_name VARCHAR(50) NOT NULL,
    records_inventoried INT DEFAULT 0,
    records_backfilled INT DEFAULT 0,
    reconciled_sum_delta NUMERIC(20,4) DEFAULT 0.0000,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED', -- IN_PROGRESS, COMPLETED, FAILED
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_mig_name ON data_migration_logs(migration_name, step_number);

-- 2. Opening Balance Cutover Vouchers (No Fake History Rule)
CREATE TABLE IF NOT EXISTS opening_balance_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    voucher_type VARCHAR(50) NOT NULL, -- "GL_OPENING_BALANCE", "STOCK_OPENING_BALANCE"
    cutover_date DATE NOT NULL,
    total_amount NUMERIC(20,4) NOT NULL DEFAULT 0.0000,
    source_system VARCHAR(100) NOT NULL, -- e.g. "Legacy ERP v1.0 Export"
    status VARCHAR(50) NOT NULL DEFAULT 'POSTED',
    created_by UUID REFERENCES users(id),
    posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opening_balance_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID NOT NULL REFERENCES opening_balance_vouchers(id) ON DELETE CASCADE,
    account_id UUID REFERENCES chart_of_accounts(id),
    warehouse_id UUID REFERENCES warehouses(id),
    item_id UUID REFERENCES inventory_items(id),
    qty NUMERIC(15,4) DEFAULT 0.0000,
    unit_cost NUMERIC(18,6) DEFAULT 0.0000,
    amount NUMERIC(20,4) NOT NULL DEFAULT 0.0000
);

CREATE INDEX IF NOT EXISTS idx_ob_voucher_comp ON opening_balance_vouchers(company_id);
CREATE INDEX IF NOT EXISTS idx_ob_items_voucher ON opening_balance_items(voucher_id);
