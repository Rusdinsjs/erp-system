-- ================================================================
-- Additive company_id Column Scoping to Business Tables (QTEN-006)
-- Migration Pattern: Nullable Column -> Backfill -> Index
-- ================================================================

-- 1. Add company_id column to Assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_assets_company_id ON assets(company_id);

-- 2. Add company_id column to Work Orders
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_work_orders_company_id ON work_orders(company_id);

-- 3. Add company_id column to Rental Contracts
ALTER TABLE rental_contracts ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_rental_contracts_company_id ON rental_contracts(company_id);

-- 4. Add company_id column to Purchase Bills (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'purchase_bills') THEN
        ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS company_id UUID;
        CREATE INDEX IF NOT EXISTS idx_purchase_bills_company_id ON purchase_bills(company_id);
    END IF;
END
$$;

-- 5. Add company_id column to Sales Invoices (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales_invoices') THEN
        ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS company_id UUID;
        CREATE INDEX IF NOT EXISTS idx_sales_invoices_company_id ON sales_invoices(company_id);
    END IF;
END
$$;

-- 6. Add company_id column to Inventory Items (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_items') THEN
        ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS company_id UUID;
        CREATE INDEX IF NOT EXISTS idx_inventory_items_company_id ON inventory_items(company_id);
    END IF;
END
$$;

-- Deterministic Backfill: Link company_id to the first active company of the tenant where available
DO $$
DECLARE
    default_cmp_id UUID;
BEGIN
    SELECT id INTO default_cmp_id FROM companies LIMIT 1;
    IF default_cmp_id IS NOT NULL THEN
        UPDATE assets SET company_id = default_cmp_id WHERE company_id IS NULL;
        UPDATE work_orders SET company_id = default_cmp_id WHERE company_id IS NULL;
        UPDATE rental_contracts SET company_id = default_cmp_id WHERE company_id IS NULL;
    END IF;
END
$$;
