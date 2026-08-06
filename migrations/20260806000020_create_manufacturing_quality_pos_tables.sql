-- Migration 20260806000020: Phase 13 Manufacturing, Quality and POS (QMFG-001..010, QQLT-001..004, QPOS-001..005)

-- 1. Manufacturing Workstream (QMFG-001..003)
CREATE TABLE IF NOT EXISTS boms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    bom_number VARCHAR(100) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    quantity NUMERIC(15,4) NOT NULL DEFAULT 1.0000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bom_num UNIQUE (company_id, bom_number)
);

CREATE TABLE IF NOT EXISTS bom_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_id UUID NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    qty_required NUMERIC(15,4) NOT NULL,
    scrap_percentage NUMERIC(5,2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS workstations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    workstation_name VARCHAR(100) NOT NULL,
    hour_rate NUMERIC(20,4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: Explicit naming `production_orders` to avoid collision with EAM `work_orders` (QMFG-003)
CREATE TABLE IF NOT EXISTS production_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    production_order_number VARCHAR(100) NOT NULL,
    bom_id UUID NOT NULL REFERENCES boms(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    target_qty NUMERIC(15,4) NOT NULL,
    produced_qty NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, IN_PROGRESS, COMPLETED, CANCELLED
    wip_account_id UUID REFERENCES chart_of_accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_prod_order_num UNIQUE (company_id, production_order_number)
);

-- 2. Quality Workstream (QQLT-001..004)
CREATE TABLE IF NOT EXISTS quality_inspection_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    item_id UUID REFERENCES inventory_items(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quality_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    inspection_number VARCHAR(100) NOT NULL,
    inspection_type VARCHAR(50) NOT NULL, -- INCOMING, IN_PROCESS, OUTGOING
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    batch_no VARCHAR(100),
    sample_size NUMERIC(15,4) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, PASSED, REJECTED, QUALITY_HOLD
    inspected_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_quality_insp_num UNIQUE (company_id, inspection_number)
);

-- 3. POS Workstream (QPOS-001..003)
CREATE TABLE IF NOT EXISTS pos_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    profile_name VARCHAR(100) NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    cash_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pos_profile_id UUID NOT NULL REFERENCES pos_profiles(id),
    cashier_user_id UUID NOT NULL REFERENCES users(id),
    opening_balance NUMERIC(20,4) NOT NULL DEFAULT 0.0000,
    closing_balance NUMERIC(20,4),
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, CLOSED
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);
