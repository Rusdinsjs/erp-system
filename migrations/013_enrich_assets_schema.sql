-- Migration: 013_enrich_assets_schema
-- Description: Add tables requested for Asset Management (Insurances, Documents, Vehicle Details)
-- Created: 2026-01-09

-- 1. INSURANCES (Asuransi)
CREATE TABLE IF NOT EXISTS insurances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    policy_number VARCHAR(100) NOT NULL,
    insurance_provider VARCHAR(255) NOT NULL,
    coverage_type VARCHAR(100), -- All Risk, TLO, etc.
    coverage_amount DECIMAL(18, 2),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    premium_amount DECIMAL(18, 2),
    status VARCHAR(50) DEFAULT 'active', -- active, expired, claimed
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ASSET DOCUMENTS (Dokumen & Foto)
CREATE TABLE IF NOT EXISTS asset_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- BPKB, STNK, SERTIFIKAT, INVOICE, MANUAL, PHOTO
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    expiry_date DATE, -- For STNK, KIR, Tax, etc.
    notes TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VEHICLE DETAILS (Spesifik untuk Kendaraan - Relational)
-- User explicitly requested this table
CREATE TABLE IF NOT EXISTS vehicle_details (
    asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
    license_plate VARCHAR(20) UNIQUE,
    brand VARCHAR(100), -- Redundant but fast access if needed, or rely on assets.brand
    model VARCHAR(100), -- Redundant
    color VARCHAR(50),
    vin VARCHAR(100), -- Chassis Number
    engine_number VARCHAR(100),
    bpkb_number VARCHAR(100),
    stnk_expiry DATE,
    kir_expiry DATE,
    tax_expiry DATE,
    fuel_type VARCHAR(50), -- Diesel, Petrol
    transmission VARCHAR(50), -- Manual, Automatic
    capacity VARCHAR(50), -- 2000cc, 10 Ton
    odometer_last BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HEAVY EQUIPMENT DETAILS (Spesifik Alat Berat)
-- Opting to use JSONB for typical schema flexibility but creating view or table if strictly needed.
-- Since the user provided a strict schema for "ASET ALAT BERAT", let's map it to specific table OR using specific columns in assets + specifications.
-- Given existing `assets` table has brand, model, serial_number... 
-- Let's stick to using `specifications` JSONB for the others to avoid table explosion, 
-- BUT `vehicle_details` is special because of Tax/STNK expiry which needs alerts.

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurances_asset ON insurances(asset_id);
CREATE INDEX IF NOT EXISTS idx_insurances_expiry ON insurances(end_date);
CREATE INDEX IF NOT EXISTS idx_asset_documents_asset ON asset_documents(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_documents_expiry ON asset_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_details_plate ON vehicle_details(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicle_details_expiry ON vehicle_details(tax_expiry);

-- Function to update timestamps
CREATE TRIGGER update_insurances_updated_at BEFORE UPDATE ON insurances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_documents_updated_at BEFORE UPDATE ON asset_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_details_updated_at BEFORE UPDATE ON vehicle_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
