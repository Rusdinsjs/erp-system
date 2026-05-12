-- Migration: 041_create_kledo_finance_tables
-- Description: Create tables for Sales, Purchases, Expenses, and Cash & Bank modules

-- 1. SALES INVOICES (Penjualan)
CREATE TABLE IF NOT EXISTS sales_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id),
    date DATE NOT NULL,
    due_date DATE,
    subject TEXT,
    message TEXT,
    subtotal DECIMAL(20, 4) NOT NULL DEFAULT 0,
    discount DECIMAL(20, 4) NOT NULL DEFAULT 0,
    tax DECIMAL(20, 4) NOT NULL DEFAULT 0,
    total_amount DECIMAL(20, 4) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(20, 4) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, sent, partial, paid, overdue, void
    created_by UUID,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,
    unit_price DECIMAL(20, 4) NOT NULL DEFAULT 0,
    total_price DECIMAL(20, 4) NOT NULL DEFAULT 0,
    account_id UUID REFERENCES chart_of_accounts(id) -- Revenue account
);

-- 2. PURCHASE BILLS (Pembelian)
CREATE TABLE IF NOT EXISTS purchase_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    date DATE NOT NULL,
    due_date DATE,
    subject TEXT,
    subtotal DECIMAL(20, 4) NOT NULL DEFAULT 0,
    tax DECIMAL(20, 4) NOT NULL DEFAULT 0,
    total_amount DECIMAL(20, 4) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(20, 4) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, partial, paid, overdue, void
    created_by UUID,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES purchase_bills(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,
    unit_price DECIMAL(20, 4) NOT NULL DEFAULT 0,
    total_price DECIMAL(20, 4) NOT NULL DEFAULT 0,
    account_id UUID REFERENCES chart_of_accounts(id) -- Expense/Asset account
);

-- 3. EXPENSES (Biaya)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    pay_from_account_id UUID NOT NULL REFERENCES chart_of_accounts(id), -- Bank/Cash
    recipient VARCHAR(255),
    total_amount DECIMAL(20, 4) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'paid',
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id), -- Expense account
    description TEXT,
    amount DECIMAL(20, 4) NOT NULL DEFAULT 0
);

-- 4. CASH & BANK TRANSACTIONS (Mutasi Kas & Bank)
CREATE TABLE IF NOT EXISTS cash_bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- transfer, receive, send
    date DATE NOT NULL,
    amount DECIMAL(20, 4) NOT NULL DEFAULT 0,
    
    -- For Transfer
    from_account_id UUID REFERENCES chart_of_accounts(id),
    to_account_id UUID REFERENCES chart_of_accounts(id),
    
    -- For Receive/Send
    account_id UUID REFERENCES chart_of_accounts(id),
    contact_name VARCHAR(255),
    
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'posted',
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_invoices_client ON sales_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(date);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_vendor ON purchase_bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_date ON purchase_bills(date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_cash_bank_date ON cash_bank_transactions(date);
