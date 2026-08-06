-- Migration 20260806000017: Phase 10 Reporting, Print and API Platform (QRPT-001, QPRT-001, QINT-001)

-- 1. Report Definitions Table (QRPT-001)
CREATE TABLE IF NOT EXISTS report_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    report_type VARCHAR(50) NOT NULL DEFAULT 'FINANCIAL', -- "FINANCIAL", "STOCK", "CUSTOM"
    query_provider VARCHAR(100) NOT NULL, -- e.g. "TRIAL_BALANCE_PROVIDER", "STOCK_LEDGER_PROVIDER"
    options_json JSONB DEFAULT '{}'::jsonb,
    permission_scope VARCHAR(100) NOT NULL DEFAULT 'FINANCE_READ',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Print Templates Table (QPRT-001)
CREATE TABLE IF NOT EXISTS print_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type_id UUID REFERENCES entity_types(id),
    document_type VARCHAR(100) NOT NULL, -- e.g. "SALES_INVOICE", "PURCHASE_ORDER"
    template_name VARCHAR(100) NOT NULL,
    html_template TEXT NOT NULL,
    css_styles TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_print_template_doc_name UNIQUE (document_type, template_name)
);

-- 3. Integration API Credentials Table (QINT-001)
CREATE TABLE IF NOT EXISTS api_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    company_id UUID,
    client_name VARCHAR(100) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL UNIQUE,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_cred_tenant ON api_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_cred_hash ON api_credentials(api_key_hash);
