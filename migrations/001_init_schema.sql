-- ============================================
-- ASSET MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Version: 1.0.0 (MVP)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. LOOKUP TABLES (Tabel Referensi)
-- ============================================

-- Currencies (Mata Uang)
CREATE TABLE currencies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10)
);

-- Insert default currencies
INSERT INTO currencies (code, name, symbol) VALUES
('IDR', 'Rupiah Indonesia', 'Rp'),
('USD', 'US Dollar', '$'),
('EUR', 'Euro', '€');

-- Units (Satuan)
CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL
);

-- Insert default units
INSERT INTO units (code, name) VALUES
('UNIT', 'Unit'),
('SET', 'Set'),
('PCS', 'Pieces'),
('BOX', 'Box');

-- Asset Conditions (Kondisi Aset)
CREATE TABLE asset_conditions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20) -- untuk UI (e.g., 'green', 'yellow', 'red')
);

-- Insert default conditions
INSERT INTO asset_conditions (code, name, color) VALUES
('NEW', 'Baru', 'green'),
('GOOD', 'Baik', 'blue'),
('FAIR', 'Cukup', 'yellow'),
('POOR', 'Buruk', 'orange'),
('BROKEN', 'Rusak', 'red');

-- ============================================
-- 2. USERS & DEPARTMENTS
-- ============================================

-- Departments (Departemen)
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES departments(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (Pengguna)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'staff', -- admin, manager, staff
    department_id UUID REFERENCES departments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. VENDORS (Supplier)
-- ============================================

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. CATEGORIES (Kategori - Tree Structure)
-- ============================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES categories(id),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    attributes JSONB, -- custom attributes per category
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. LOCATIONS (Lokasi - Hierarki)
-- ============================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES locations(id),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50), -- Country, City, Building, Floor, Room
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. ASSETS (Aset Utama)
-- ============================================

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id),
    location_id UUID REFERENCES locations(id),
    department_id UUID REFERENCES departments(id),
    assigned_to UUID REFERENCES users(id),
    vendor_id UUID REFERENCES vendors(id),
    
    -- Klasifikasi
    is_rental BOOLEAN DEFAULT FALSE,
    asset_class VARCHAR(50), -- 'Fixed Asset', 'Inventory'
    
    -- Status
    status VARCHAR(50) DEFAULT 'available', -- available, in_use, maintenance, disposed
    condition_id INTEGER REFERENCES asset_conditions(id),
    
    -- Detail Identitas
    serial_number VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    year_manufacture INTEGER,
    
    -- Spesifikasi Dinamis (JSONB)
    specifications JSONB,
    
    -- Data Finansial
    purchase_date DATE,
    purchase_price DECIMAL(18, 2),
    currency_id INTEGER REFERENCES currencies(id) DEFAULT 1,
    unit_id INTEGER REFERENCES units(id) DEFAULT 1,
    quantity INTEGER DEFAULT 1,
    
    -- Depresiasi
    residual_value DECIMAL(18, 2),
    useful_life_months INTEGER,
    
    -- QR Code
    qr_code_url VARCHAR(500),
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. RENTAL DETAILS (Detail Sewa)
-- ============================================

CREATE TABLE rental_details (
    asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
    rate_per_hour DECIMAL(15, 2),
    rate_per_day DECIMAL(15, 2),
    rate_per_month DECIMAL(15, 2),
    minimum_rental_period INTEGER DEFAULT 1,
    operator_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. MAINTENANCE (Pemeliharaan)
-- ============================================

-- Maintenance Types (Jenis Pemeliharaan)
CREATE TABLE maintenance_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_preventive BOOLEAN DEFAULT false
);

INSERT INTO maintenance_types (code, name, is_preventive) VALUES
('ROUTINE', 'Pemeliharaan Rutin', true),
('REPAIR', 'Perbaikan', false),
('OVERHAUL', 'Overhaul', false),
('INSPECTION', 'Inspeksi', true);

-- Maintenance Records
CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id),
    maintenance_type_id INTEGER REFERENCES maintenance_types(id),
    
    -- Scheduling
    scheduled_date DATE,
    actual_date DATE,
    
    -- Details
    description TEXT,
    findings TEXT,
    actions_taken TEXT,
    
    -- Cost
    cost DECIMAL(15, 2),
    currency_id INTEGER REFERENCES currencies(id) DEFAULT 1,
    
    -- Technician
    performed_by VARCHAR(255),
    vendor_id UUID REFERENCES vendors(id),
    
    -- Status
    status VARCHAR(50) DEFAULT 'planned', -- planned, in_progress, completed, cancelled
    
    -- Next Service
    next_service_date DATE,
    odometer_reading INTEGER, -- untuk kendaraan/alat berat
    
    -- Timestamps
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. AUDIT TRAIL (Riwayat Perubahan)
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES users(id),
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. ASSET HISTORY (Riwayat Pergerakan)
-- ============================================

CREATE TABLE asset_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id),
    action VARCHAR(100) NOT NULL, -- 'assigned', 'transferred', 'maintenance', 'status_change'
    from_location_id UUID REFERENCES locations(id),
    to_location_id UUID REFERENCES locations(id),
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    notes TEXT,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES untuk Performance
-- ============================================

CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_location ON assets(location_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_code ON assets(asset_code);
CREATE INDEX idx_maintenance_asset ON maintenance_records(asset_id);
CREATE INDEX idx_maintenance_status ON maintenance_records(status);
CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_asset_history_asset ON asset_history(asset_id);

-- ============================================
-- TRIGGERS untuk updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON maintenance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
