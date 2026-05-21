-- Migration: align_with_assets_txt
-- Description: Align schema with assets.txt reference document

-- 1. Modify assets table for missing general fields
ALTER TABLE assets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS acquisition_method VARCHAR(100);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS funding_source VARCHAR(100);

-- 2. Create land_details (Data Tanah)
CREATE TABLE IF NOT EXISTS land_details (
    asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
    certificate_number VARCHAR(100),
    land_area DECIMAL(18, 2),
    address TEXT,
    zoning VARCHAR(100),
    rights_status VARCHAR(100),
    rights_expiry DATE,
    pbb_number VARCHAR(100),
    njop_value DECIMAL(18, 2),
    gps_coordinates VARCHAR(255),
    boundaries TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create building_details (Data Bangunan)
CREATE TABLE IF NOT EXISTS building_details (
    asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
    land_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    building_area DECIMAL(18, 2),
    floor_count INTEGER,
    build_year INTEGER,
    renovation_year INTEGER,
    construction_type VARCHAR(100),
    building_function VARCHAR(100),
    capacity INTEGER,
    imb_number VARCHAR(100),
    slf_number VARCHAR(100),
    slf_expiry DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create heavy_equipment_details (Data Alat Berat)
CREATE TABLE IF NOT EXISTS heavy_equipment_details (
    asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
    equipment_type VARCHAR(100),
    operating_weight DECIMAL(18, 2),
    capacity VARCHAR(100),
    engine_model VARCHAR(100),
    hour_meter DECIMAL(18, 2),
    certification_number VARCHAR(100),
    certification_expiry DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create machine_details (Data Mesin)
CREATE TABLE IF NOT EXISTS machine_details (
    asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
    machine_type VARCHAR(100),
    technical_specs TEXT,
    installation_year INTEGER,
    operating_hours DECIMAL(18, 2),
    energy_source VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create inventory_details (Data Inventaris)
CREATE TABLE IF NOT EXISTS inventory_details (
    asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
    inventory_type VARCHAR(100),
    warranty_expiry DATE,
    os_license VARCHAR(100),
    mac_address VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create furniture_details (Data Meubelair)
CREATE TABLE IF NOT EXISTS furniture_details (
    asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
    furniture_type VARCHAR(100),
    material VARCHAR(100),
    dimensions VARCHAR(100),
    color VARCHAR(50),
    capacity VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_land_details_updated_at ON land_details;
CREATE TRIGGER update_land_details_updated_at BEFORE UPDATE ON land_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_building_details_updated_at ON building_details;
CREATE TRIGGER update_building_details_updated_at BEFORE UPDATE ON building_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_heavy_equip_details_updated_at ON heavy_equipment_details;
CREATE TRIGGER update_heavy_equip_details_updated_at BEFORE UPDATE ON heavy_equipment_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_machine_details_updated_at ON machine_details;
CREATE TRIGGER update_machine_details_updated_at BEFORE UPDATE ON machine_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_details_updated_at ON inventory_details;
CREATE TRIGGER update_inventory_details_updated_at BEFORE UPDATE ON inventory_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_furniture_details_updated_at ON furniture_details;
CREATE TRIGGER update_furniture_details_updated_at BEFORE UPDATE ON furniture_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
