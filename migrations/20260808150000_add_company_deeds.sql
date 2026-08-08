-- Migration: 20260808150000_add_company_deeds
-- Description: Adds Akta Pendirian fields to companies and creates company_amendment_deeds table for multiple Akta Perubahan

ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS establishment_deed_no VARCHAR(100),
    ADD COLUMN IF NOT EXISTS establishment_deed_date DATE,
    ADD COLUMN IF NOT EXISTS establishment_notary_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS establishment_approval_no VARCHAR(100);

CREATE TABLE IF NOT EXISTS public.company_amendment_deeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    deed_no VARCHAR(100) NOT NULL,
    deed_date DATE,
    notary_name VARCHAR(255),
    approval_no VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_amendment_deeds_company_id ON public.company_amendment_deeds(company_id);

-- Seed sample deeds data for default companies
UPDATE public.companies
SET 
    establishment_deed_no = 'No. 12',
    establishment_deed_date = '2010-01-15',
    establishment_notary_name = 'Hendra Wijaya, S.H., M.Kn.',
    establishment_approval_no = 'AHU-0012345.AH.01.01.Tahun 2010'
WHERE code = 'SJS-HQ';

UPDATE public.companies
SET 
    establishment_deed_no = 'No. 08',
    establishment_deed_date = '2015-05-20',
    establishment_notary_name = 'Budi Santoso, S.H., M.Kn.',
    establishment_approval_no = 'AHU-0056789.AH.01.01.Tahun 2015'
WHERE code = 'SJS-RENT';

UPDATE public.companies
SET 
    establishment_deed_no = 'No. 24',
    establishment_deed_date = '2018-09-10',
    establishment_notary_name = 'Anita Rahmawati, S.H., M.Kn.',
    establishment_approval_no = 'AHU-0099887.AH.01.01.Tahun 2018'
WHERE code = 'SJS-OPS';

-- Seed Akta Perubahan (Multiple for SJS-HQ)
INSERT INTO public.company_amendment_deeds (company_id, deed_no, deed_date, notary_name, approval_no, description)
VALUES 
(
    'c0000000-0000-0000-0000-000000000001',
    'No. 45',
    '2018-06-20',
    'Hendra Wijaya, S.H., M.Kn.',
    'AHU-0098765.AH.01.02.Tahun 2018',
    'Perubahan Susunan Modal Saham dan Anggota Direksi & Dewan Komisaris'
),
(
    'c0000000-0000-0000-0000-000000000001',
    'No. 88',
    '2023-03-10',
    'Anita Rahmawati, S.H., M.Kn.',
    'AHU-0044556.AH.01.02.Tahun 2023',
    'Penyesuaian Maksud dan Tujuan Perusahaan KBLI 2020 & Peningkatan Modal Disetor'
)
ON CONFLICT DO NOTHING;
