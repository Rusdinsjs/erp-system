-- Migration 20260806000016: Phase 9 ERPQu Metadata Kernel (QMETA-001 s.d QMETA-004)

-- 1. EntityType Registry (QMETA-001)
CREATE TABLE IF NOT EXISTS entity_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE, -- e.g. "INSPECTION_CHECKLIST", "SALES_INVOICE"
    module VARCHAR(50) NOT NULL DEFAULT 'CUSTOM',
    storage_strategy VARCHAR(50) NOT NULL DEFAULT 'HYBRID_JSONB', -- "TYPED", "HYBRID_JSONB", "DYNAMIC_JSONB"
    is_custom BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Field Definitions Table (QMETA-002)
CREATE TABLE IF NOT EXISTS field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type_id UUID NOT NULL REFERENCES entity_types(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    label VARCHAR(100) NOT NULL,
    data_type VARCHAR(50) NOT NULL, -- "STRING", "NUMBER", "DECIMAL", "BOOLEAN", "DATE", "DATETIME", "JSON"
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_readonly BOOLEAN NOT NULL DEFAULT FALSE,
    default_value TEXT,
    options_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_field_def_entity_name UNIQUE (entity_type_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_field_defs_entity ON field_definitions(entity_type_id);

-- 3. Layout Definitions Table (QMETA-003)
CREATE TABLE IF NOT EXISTS layout_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type_id UUID NOT NULL REFERENCES entity_types(id) ON DELETE CASCADE,
    layout_name VARCHAR(100) NOT NULL DEFAULT 'DEFAULT',
    layout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_layout_def_entity_name UNIQUE (entity_type_id, layout_name)
);

-- 4. Hybrid JSONB Custom Data Column on Standard Typed ERP Documents (QMETA-004)
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE maintenance_work_orders ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;
