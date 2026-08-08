-- Migration: Add Frappe/ERPNext Company Module fields & seed default Companies
-- Description: Supports multi-company setup, parent/subsidiary hierarchy, financial defaults, and corporate profile

ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS domain VARCHAR(100),
    ADD COLUMN IF NOT EXISTS website VARCHAR(255),
    ADD COLUMN IF NOT EXISTS parent_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS incorporation_date DATE,
    ADD COLUMN IF NOT EXISTS registration_no VARCHAR(100),
    ADD COLUMN IF NOT EXISTS default_cash_account_id UUID,
    ADD COLUMN IF NOT EXISTS default_income_account_id UUID,
    ADD COLUMN IF NOT EXISTS default_expense_account_id UUID,
    ADD COLUMN IF NOT EXISTS default_receivable_account_id UUID,
    ADD COLUMN IF NOT EXISTS default_payable_account_id UUID,
    ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure default seed companies exist (ERPNext style holding & operating companies)
DO $$
DECLARE
    v_tenant_id UUID := '00000000-0000-0000-0000-000000000001';
    v_parent_id UUID;
BEGIN
    -- 1. Create Holding Company
    INSERT INTO public.companies (
        id, tenant_id, code, name, legal_name, tax_id, base_currency, country,
        address, phone, email, website, domain, is_group, status
    ) VALUES (
        'c0000000-0000-0000-0000-000000000001',
        v_tenant_id,
        'SJS-HQ',
        'PT Sanjaya Solusindo Group',
        'PT Sanjaya Solusindo Utama Tbk',
        '01.234.567.8-012.000',
        'IDR',
        'Indonesia',
        'Jl. Jendral Sudirman No. 88, Jakarta Selatan, DKI Jakarta 12190',
        '+62-21-555-0100',
        'info@sanjayagroup.co.id',
        'https://sanjayagroup.co.id',
        'Heavy Equipment & Fleet Management',
        TRUE,
        'ACTIVE'
    ) ON CONFLICT (tenant_id, code) DO UPDATE SET
        name = EXCLUDED.name,
        legal_name = EXCLUDED.legal_name,
        is_group = TRUE;

    v_parent_id := 'c0000000-0000-0000-0000-000000000001';

    -- 2. Create Operating Subsidiary 1: Fleet & Heavy Machinery Rental
    INSERT INTO public.companies (
        id, tenant_id, code, name, legal_name, tax_id, base_currency, country,
        address, phone, email, website, domain, parent_company_id, is_group, status
    ) VALUES (
        'c0000000-0000-0000-0000-000000000002',
        v_tenant_id,
        'SJS-RENT',
        'PT Sanjaya Heavy Fleet Rental',
        'PT Sanjaya Fleet Services',
        '01.234.567.8-012.001',
        'IDR',
        'Indonesia',
        'Jl. Raya Balikpapan KM 13, Balikpapan, Kalimantan Timur 76115',
        '+62-542-888-0200',
        'rental@sanjayagroup.co.id',
        'https://rental.sanjayagroup.co.id',
        'Heavy Equipment Rental',
        v_parent_id,
        FALSE,
        'ACTIVE'
    ) ON CONFLICT (tenant_id, code) DO UPDATE SET
        parent_company_id = v_parent_id;

    -- 3. Create Operating Subsidiary 2: Maintenance & Technical Services
    INSERT INTO public.companies (
        id, tenant_id, code, name, legal_name, tax_id, base_currency, country,
        address, phone, email, website, domain, parent_company_id, is_group, status
    ) VALUES (
        'c0000000-0000-0000-0000-000000000003',
        v_tenant_id,
        'SJS-OPS',
        'PT Sanjaya Teknik & Field Services',
        'PT Sanjaya Field Maintenance',
        '01.234.567.8-012.002',
        'IDR',
        'Indonesia',
        'Kawasan Industri Kariangau Blok B5, Balikpapan, Kaltim 76134',
        '+62-542-888-0300',
        'service@sanjayagroup.co.id',
        'https://service.sanjayagroup.co.id',
        'Field Maintenance & Engineering',
        v_parent_id,
        FALSE,
        'ACTIVE'
    ) ON CONFLICT (tenant_id, code) DO UPDATE SET
        parent_company_id = v_parent_id;
END $$;
