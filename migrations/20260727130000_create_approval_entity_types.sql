-- Migration: Create approval_entity_types table and seed default system entities

CREATE TABLE IF NOT EXISTS approval_entity_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    value           VARCHAR(50) UNIQUE NOT NULL,
    label           VARCHAR(100) NOT NULL,
    icon            VARCHAR(50),
    color           VARCHAR(50),
    description     TEXT,
    backend_module  VARCHAR(100),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    is_system       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default 9 entity types
INSERT INTO approval_entity_types (id, value, label, icon, color, description, backend_module, is_system) VALUES
    (gen_random_uuid(), 'asset', 'Asset', 'Box', 'text-green-400', 'Asset creation, sale, and disposal', 'asset_service', true),
    (gen_random_uuid(), 'work_order', 'Work Order', 'Wrench', 'text-blue-400', 'Maintenance work order creation', 'work_order_service', true),
    (gen_random_uuid(), 'loan', 'Loan', 'ArrowLeftRight', 'text-cyan-400', 'Asset loan requests', 'loan_service', true),
    (gen_random_uuid(), 'lifecycle_transition', 'Lifecycle Transition', 'RefreshCw', 'text-violet-400', 'Asset state changes (deploy, retire, etc)', 'asset_service', true),
    (gen_random_uuid(), 'rental_request', 'Rental Request', 'Truck', 'text-orange-400', 'New rental order requests', 'rental_service', true),
    (gen_random_uuid(), 'timesheet_verification', 'Timesheet', 'ClipboardCheck', 'text-teal-400', 'Timesheet verification requests', 'timesheet_service', true),
    (gen_random_uuid(), 'conversion_request', 'Conversion', 'ArrowLeftRight', 'text-purple-400', 'Unit conversion requests', 'inventory_service', true),
    (gen_random_uuid(), 'fuel_request', 'Fuel Request', 'Fuel', 'text-yellow-400', 'Fuel logging requests', 'fuel_service', true),
    (gen_random_uuid(), 'tax_renewal', 'Tax Renewal', 'FileText', 'text-rose-400', 'Tax/KIR/STNK renewal requests', 'tax_renewal_service', true)
ON CONFLICT (value) DO NOTHING;

-- Add foreign key constraint to approval_workflows table
ALTER TABLE approval_workflows
    DROP CONSTRAINT IF EXISTS fk_approval_workflows_entity_type;

ALTER TABLE approval_workflows
    ADD CONSTRAINT fk_approval_workflows_entity_type
    FOREIGN KEY (entity_type) REFERENCES approval_entity_types(value)
    ON UPDATE CASCADE ON DELETE RESTRICT;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_approval_entity_types_value ON approval_entity_types(value);
CREATE INDEX IF NOT EXISTS idx_approval_entity_types_is_active ON approval_entity_types(is_active);
