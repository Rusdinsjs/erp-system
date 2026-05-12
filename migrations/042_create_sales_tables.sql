-- Migration: 042_create_sales_tables
-- Description: Add tables for Sales Quotes, Sales Orders, and Shipments

-- 1. SALES QUOTES (Penawaran)
CREATE TABLE IF NOT EXISTS sales_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id),
    date DATE NOT NULL,
    expiry_date DATE,
    subject TEXT,
    message TEXT,
    subtotal DECIMAL(20, 4) NOT NULL DEFAULT 0,
    discount DECIMAL(20, 4) NOT NULL DEFAULT 0,
    tax DECIMAL(20, 4) NOT NULL DEFAULT 0,
    total_amount DECIMAL(20, 4) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, sent, accepted, rejected, converted
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES sales_quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,
    unit_price DECIMAL(20, 4) NOT NULL DEFAULT 0,
    total_price DECIMAL(20, 4) NOT NULL DEFAULT 0,
    account_id UUID REFERENCES chart_of_accounts(id) -- Revenue account potential
);

-- 2. SALES ORDERS (Pemesanan)
CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    quote_id UUID REFERENCES sales_quotes(id), -- Optional link to quote
    client_id UUID NOT NULL REFERENCES clients(id),
    date DATE NOT NULL,
    delivery_date DATE,
    subject TEXT,
    message TEXT,
    subtotal DECIMAL(20, 4) NOT NULL DEFAULT 0,
    discount DECIMAL(20, 4) NOT NULL DEFAULT 0,
    tax DECIMAL(20, 4) NOT NULL DEFAULT 0,
    total_amount DECIMAL(20, 4) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, confirmed, processing, shipped, completed, cancelled
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,
    unit_price DECIMAL(20, 4) NOT NULL DEFAULT 0,
    total_price DECIMAL(20, 4) NOT NULL DEFAULT 0,
    account_id UUID REFERENCES chart_of_accounts(id)
);

-- 3. SALES SHIPMENTS (Pengiriman)
CREATE TABLE IF NOT EXISTS sales_shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_number VARCHAR(50) UNIQUE NOT NULL,
    sales_order_id UUID REFERENCES sales_orders(id), -- Link to SO
    client_id UUID REFERENCES clients(id), -- Denormalized for query ease, or implied from SO
    date DATE NOT NULL,
    courier_name VARCHAR(100),
    tracking_number VARCHAR(100),
    recipient_name VARCHAR(100),
    address TEXT,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, shipped, delivered, returned
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_shipment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES sales_shipments(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES sales_order_items(id), -- Link to specific SO item
    description TEXT NOT NULL,
    quantity_shipped DECIMAL(15, 4) NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_quotes_client ON sales_quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_client ON sales_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_shipments_so ON sales_shipments(sales_order_id);
