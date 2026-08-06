-- Migration 20260806000021: Phase 14 Indonesia Localization App (QIDN-001..008)

-- 1. Indonesian Identity Fields on Master Data (QIDN-001)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS npwp VARCHAR(30);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nik VARCHAR(30);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tax_name VARCHAR(150);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tax_address TEXT;

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS npwp VARCHAR(30);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS nik VARCHAR(30);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS tax_name VARCHAR(150);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS tax_address TEXT;

-- 2. e-Faktur Tax Invoices Table (QIDN-003)
CREATE TABLE IF NOT EXISTS id_tax_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    sales_invoice_id UUID REFERENCES sales_invoices(id),
    tax_invoice_number VARCHAR(50) NOT NULL, -- e.g. 010.000-26.00000001
    npwp_buyer VARCHAR(30) NOT NULL,
    name_buyer VARCHAR(150) NOT NULL,
    tax_base NUMERIC(20,4) NOT NULL, -- DPP
    vat_amount NUMERIC(20,4) NOT NULL, -- PPN
    vat_rate NUMERIC(5,2) NOT NULL DEFAULT 11.00, -- 11%, 12%
    effective_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'POSTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_id_tax_inv_num UNIQUE (company_id, tax_invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_id_tax_inv_comp ON id_tax_invoices(company_id);

-- 3. PPh Withholding Certificates Table (QIDN-004)
CREATE TABLE IF NOT EXISTS id_withholding_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    certificate_number VARCHAR(100) NOT NULL, -- Nomor Bukti Potong
    pph_type VARCHAR(50) NOT NULL, -- PPH23, PPH4_2, PPH21, PPH22
    vendor_id UUID REFERENCES vendors(id),
    client_id UUID REFERENCES clients(id),
    gross_amount NUMERIC(20,4) NOT NULL,
    pph_amount NUMERIC(20,4) NOT NULL,
    pph_rate NUMERIC(5,2) NOT NULL,
    posting_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'POSTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_id_withholding_cert UNIQUE (company_id, certificate_number)
);

CREATE INDEX IF NOT EXISTS idx_id_withholding_comp ON id_withholding_certificates(company_id);
