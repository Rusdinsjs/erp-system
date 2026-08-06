-- Migration 20260806000013: Phase 6 Selling & Buying as Document Graphs (QSELL-001..006, QBUY-001..006)

-- 1. Commercial Masters Enhancement (QSELL-001, QBUY-001)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(20,4) DEFAULT 0.0000;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'IDR';

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payment_terms_days INT DEFAULT 30;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'IDR';

-- 2. Source Line Traceability for Sales & Purchasing Items (QSELL-002, QBUY-002)
ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS source_type VARCHAR(50);
ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS source_line_id UUID;

ALTER TABLE purchase_bill_items ADD COLUMN IF NOT EXISTS source_type VARCHAR(50);
ALTER TABLE purchase_bill_items ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE purchase_bill_items ADD COLUMN IF NOT EXISTS source_line_id UUID;

ALTER TABLE sales_shipment_items ADD COLUMN IF NOT EXISTS source_type VARCHAR(50);
ALTER TABLE sales_shipment_items ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE sales_shipment_items ADD COLUMN IF NOT EXISTS source_line_id UUID;

ALTER TABLE purchase_shipment_items ADD COLUMN IF NOT EXISTS source_type VARCHAR(50);
ALTER TABLE purchase_shipment_items ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE purchase_shipment_items ADD COLUMN IF NOT EXISTS source_line_id UUID;

-- 3. Three-Way Matching & Purchase Receipts (QBUY-002, QBUY-005)
CREATE TABLE IF NOT EXISTS purchase_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    receipt_number VARCHAR(100) NOT NULL,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    posting_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT uq_purchase_receipt_no UNIQUE (company_id, receipt_number)
);

CREATE TABLE IF NOT EXISTS purchase_receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    qty_received NUMERIC(15,4) NOT NULL,
    unit_cost NUMERIC(18,6) NOT NULL,
    total_amount NUMERIC(20,4) NOT NULL,
    po_line_id UUID,
    batch_no VARCHAR(100),
    serial_no VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_pr_company_po ON purchase_receipts(company_id, purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_pri_receipt ON purchase_receipt_items(receipt_id);

-- 4. Landed Cost Vouchers (QBUY-006)
CREATE TABLE IF NOT EXISTS landed_cost_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    voucher_number VARCHAR(100) NOT NULL,
    posting_date DATE NOT NULL,
    total_landed_cost NUMERIC(20,4) NOT NULL,
    distribute_by VARCHAR(50) NOT NULL DEFAULT 'QTY', -- QTY, AMOUNT
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID
);
