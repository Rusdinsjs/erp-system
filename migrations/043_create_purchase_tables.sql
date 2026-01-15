-- Purchase Quotes (Penawaran Pembelian / RFQ)
CREATE TABLE purchase_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    vendor_id UUID NOT NULL REFERENCES clients(id), -- Reusing clients table for vendors for simplicity
    date DATE NOT NULL,
    expiry_date DATE,
    subject VARCHAR(255),
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, sent, accepted, rejected
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_quote_id UUID NOT NULL REFERENCES purchase_quotes(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0
);

-- Purchase Orders (Pesanan Pembelian)
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    purchase_quote_id UUID REFERENCES purchase_quotes(id),
    vendor_id UUID NOT NULL REFERENCES clients(id),
    date DATE NOT NULL,
    delivery_date DATE,
    subject VARCHAR(255),
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, sent, confirmed, completed, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0
);

-- Purchase Shipments / Goods Received (Pengiriman Pembelian / Penerimaan Barang)
CREATE TABLE purchase_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_number VARCHAR(50) NOT NULL UNIQUE,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    vendor_id UUID REFERENCES clients(id),
    date DATE NOT NULL,
    courier_name VARCHAR(100),
    tracking_number VARCHAR(100),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'received', -- received, processing, returned
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_shipment_id UUID NOT NULL REFERENCES purchase_shipments(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity_received DECIMAL(10, 2) NOT NULL DEFAULT 0
);
