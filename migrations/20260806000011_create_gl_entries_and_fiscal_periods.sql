-- Migration 20260806000011: Phase 4 Trusted Accounting Kernel (QACC-001, QACC-002, QACC-003)

-- 1. Extend Chart of Accounts with group and frozen capabilities (QACC-001)
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT FALSE;

-- Automatically mark parent accounts as group accounts
UPDATE chart_of_accounts SET is_group = TRUE WHERE id IN (SELECT DISTINCT parent_id FROM chart_of_accounts WHERE parent_id IS NOT NULL);

-- 2. Fiscal Years and Accounting Periods (QACC-002)
CREATE TABLE IF NOT EXISTS fiscal_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    year_name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    closed_at TIMESTAMPTZ,
    closed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fiscal_year_company_name UNIQUE (company_id, year_name)
);

CREATE TABLE IF NOT EXISTS accounting_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
    period_name VARCHAR(50) NOT NULL,
    period_number INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    closed_at TIMESTAMPTZ,
    closed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_accounting_period_year_num UNIQUE (fiscal_year_id, period_number)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_years_company ON fiscal_years(company_id);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_dates ON accounting_periods(start_date, end_date);

-- 3. Immutable General Ledger Entries (QACC-003)
CREATE TABLE IF NOT EXISTS gl_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    posting_date DATE NOT NULL,
    posting_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    party_type VARCHAR(50),
    party_id UUID,
    cost_center_id UUID,
    project_id UUID,
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1.000000,
    debit NUMERIC(20,4) NOT NULL DEFAULT 0.0000,
    credit NUMERIC(20,4) NOT NULL DEFAULT 0.0000,
    debit_in_account_currency NUMERIC(20,4) NOT NULL DEFAULT 0.0000,
    credit_in_account_currency NUMERIC(20,4) NOT NULL DEFAULT 0.0000,
    voucher_type VARCHAR(50) NOT NULL,
    voucher_no VARCHAR(100) NOT NULL,
    voucher_id UUID NOT NULL,
    is_reversal BOOLEAN NOT NULL DEFAULT FALSE,
    reversal_source_id UUID REFERENCES gl_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID
);

-- Performance and Audit indexes for GL Reports (QACC-006)
CREATE INDEX IF NOT EXISTS idx_gl_entries_company_account_date ON gl_entries(company_id, account_id, posting_date);
CREATE INDEX IF NOT EXISTS idx_gl_entries_voucher ON gl_entries(voucher_type, voucher_id);
CREATE INDEX IF NOT EXISTS idx_gl_entries_posting_date ON gl_entries(posting_date);

-- Trigger to prevent UPDATE or DELETE on immutable gl_entries (QACC-003 Append-Only Enforcement)
CREATE OR REPLACE FUNCTION prevent_gl_entries_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'QACC-003 Immutability Violation: gl_entries is append-only. Updates and deletes are forbidden. Use reversing entries instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_gl_mutation ON gl_entries;
CREATE TRIGGER trg_prevent_gl_mutation
BEFORE UPDATE OR DELETE ON gl_entries
FOR EACH ROW EXECUTE FUNCTION prevent_gl_entries_mutation();
