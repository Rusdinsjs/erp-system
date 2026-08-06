-- ================================================================
-- Create Companies Table for Multi-Company Master (QTEN-004)
-- ================================================================

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_id VARCHAR(100),
    base_currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
    country VARCHAR(100) NOT NULL DEFAULT 'Indonesia',
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    default_bank_account_id UUID,
    fiscal_year_start_month INT DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uk_companies_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
