-- Fix: Ensure company_id columns exist on critical tables
-- This migration is idempotent and safe to apply multiple times

-- Add company_id to assets table (the column that was supposed to be added by 20260806000003)
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_assets_company_id ON public.assets(company_id);

-- Add company_id to maintenance_work_orders if missing
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_work_orders') THEN
        ALTER TABLE public.maintenance_work_orders ADD COLUMN IF NOT EXISTS company_id UUID;
    END IF;
END $$;

-- Add company_id to rental_contracts if missing (may be in public or rental schema)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rental_contracts') THEN
        ALTER TABLE public.rental_contracts ADD COLUMN IF NOT EXISTS company_id UUID;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rental' AND table_name = 'rental_contracts') THEN
        ALTER TABLE rental.rental_contracts ADD COLUMN IF NOT EXISTS company_id UUID;
    END IF;
END $$;

-- Ensure companies table is in public schema (not moved to crm)
-- The companies table is used by company_handler.rs via public.companies
DO $$
BEGIN
    -- If companies is in crm schema, create a view in public for compatibility
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'companies')
       AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
        -- Move it back to public
        ALTER TABLE crm.companies SET SCHEMA public;
    END IF;
END $$;

-- Ensure companies table has required columns for company_handler.rs
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS domain VARCHAR(100);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS parent_company_id UUID;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS incorporation_date DATE;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS registration_no VARCHAR(100);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS default_bank_account_id UUID;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS default_cash_account_id UUID;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS default_income_account_id UUID;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS default_expense_account_id UUID;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS default_receivable_account_id UUID;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS default_payable_account_id UUID;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS fiscal_year_start_month INT DEFAULT 1;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS establishment_deed_no VARCHAR(100);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS establishment_deed_date DATE;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS establishment_notary_name VARCHAR(255);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS establishment_approval_no VARCHAR(100);

-- Create company_amendment_deeds table if not exists
CREATE TABLE IF NOT EXISTS public.company_amendment_deeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    deed_no VARCHAR(100) NOT NULL,
    deed_date DATE,
    notary_name VARCHAR(255),
    approval_no VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default companies if none exist
INSERT INTO public.companies (
    id, tenant_id, code, name, legal_name, tax_id, base_currency, country,
    address, phone, email, website, domain, is_group, status
)
SELECT 
    'c0000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'SJS-HQ',
    'PT Sanjaya Solusindo Group',
    'PT Sanjaya Solusindo Utama Tbk',
    '01.234.567.8-012.000',
    'IDR', 'Indonesia',
    'Jl. Jendral Sudirman No. 88, Jakarta Selatan, DKI Jakarta 12190',
    '+62-21-555-0100', 'info@sanjayagroup.co.id',
    'https://sanjayagroup.co.id', 'Heavy Equipment & Fleet Management',
    TRUE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM public.companies WHERE code = 'SJS-HQ');

INSERT INTO public.companies (
    id, tenant_id, code, name, legal_name, tax_id, base_currency, country,
    address, phone, email, website, domain, parent_company_id, is_group, status
)
SELECT
    'c0000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'SJS-RENT', 'PT Sanjaya Heavy Fleet Rental', 'PT Sanjaya Fleet Services',
    '01.234.567.8-012.001', 'IDR', 'Indonesia',
    'Jl. Raya Balikpapan KM 13, Balikpapan, Kalimantan Timur 76115',
    '+62-542-888-0200', 'rental@sanjayagroup.co.id',
    'https://rental.sanjayagroup.co.id', 'Heavy Equipment Rental',
    'c0000000-0000-0000-0000-000000000001'::uuid, FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM public.companies WHERE code = 'SJS-RENT');

INSERT INTO public.companies (
    id, tenant_id, code, name, legal_name, tax_id, base_currency, country,
    address, phone, email, website, domain, parent_company_id, is_group, status
)
SELECT
    'c0000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'SJS-OPS', 'PT Sanjaya Teknik & Field Services', 'PT Sanjaya Field Maintenance',
    '01.234.567.8-012.002', 'IDR', 'Indonesia',
    'Kawasan Industri Kariangau Blok B5, Balikpapan, Kaltim 76134',
    '+62-542-888-0300', 'service@sanjayagroup.co.id',
    'https://service.sanjayagroup.co.id', 'Field Maintenance & Engineering',
    'c0000000-0000-0000-0000-000000000001'::uuid, FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM public.companies WHERE code = 'SJS-OPS');
