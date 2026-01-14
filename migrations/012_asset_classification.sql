-- Migration: 012_asset_classification
-- Description: Add asset classification schema based on diagram
-- Created: 2026-01-08

-- ============================================
-- ADD COLUMNS FOR CLASSIFICATION
-- ============================================

-- Add main_category column (ASET INTI, ASET OPERASIONAL, ASET TETAP INFRASTRUKTUR)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS main_category VARCHAR(100);

-- Add sub_category_letter column (A, B, C)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sub_category_letter VARCHAR(10);

-- Add example_assets as JSONB array
ALTER TABLE categories ADD COLUMN IF NOT EXISTS example_assets JSONB;

-- Add function_description for the purpose/function text
ALTER TABLE categories ADD COLUMN IF NOT EXISTS function_description TEXT;

-- Add display_order for sorting
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- ============================================
-- CREATE INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS idx_categories_main_category ON categories(main_category);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);

-- ============================================
-- CLEAR EXISTING CATEGORIES AND INSERT NEW DATA
-- ============================================

-- First, update assets to remove category references temporarily (for CASCADE)
-- We'll use ON CONFLICT for upsert approach instead

-- Insert Main Categories (Level 0)
INSERT INTO categories (id, code, name, main_category, display_order, description, function_description, parent_id)
VALUES
    ('c0000001-0000-0000-0000-000000000001', 'ASET-INTI', 'Aset Inti (Rental)', 'ASET INTI (RENTAL)', 1, 
     'Aset yang menghasilkan pendapatan langsung dari sewa', 
     'Aset Produktif Utama. Menghasilkan pendapatan langsung dari sewa. Nilai tinggi, usia ekonomis panjang.', 
     NULL),
    ('c0000002-0000-0000-0000-000000000002', 'ASET-OPS', 'Aset Operasional', 'ASET OPERASIONAL', 2, 
     'Aset untuk mendukung aktivitas perusahaan', 
     'Untuk Mendukung Aktivitas Perusahaan. Tidak untuk disewa, tetapi untuk transportasi internal, servis, dan logistik.', 
     NULL),
    ('c0000003-0000-0000-0000-000000000003', 'ASET-INFRA', 'Aset Tetap Infrastruktur', 'ASET TETAP INFRASTRUKTUR', 3, 
     'Aset infrastruktur dan properti perusahaan', 
     'Akomodasi Lokasi Usaha. Bisa sebagai tempat operasional atau investasi jangka panjang.', 
     NULL)
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    main_category = EXCLUDED.main_category,
    display_order = EXCLUDED.display_order,
    description = EXCLUDED.description,
    function_description = EXCLUDED.function_description;

-- ============================================
-- 1. ASET INTI (RENTAL) SUB-CATEGORIES
-- ============================================

INSERT INTO categories (id, code, name, main_category, sub_category_letter, display_order, description, function_description, example_assets, parent_id)
VALUES
    -- A. Alat Berat
    ('c0000001-0001-0000-0000-000000000001', 'INTI-ALAT-BERAT', 'Alat Berat (Heavy Equipment)', 'ASET INTI (RENTAL)', 'A', 11, 
     'Alat berat untuk konstruksi dan pertambangan',
     'Aset Produktif Utama. Menghasilkan pendapatan langsung dari sewa. Nilai tinggi, usia ekonomis panjang.',
     '["Excavator / Backhoe", "Bulldozer", "Wheel Loader", "Motor Grader", "Crane", "Vibratory Roller"]'::jsonb,
     'c0000001-0000-0000-0000-000000000001'),
    
    -- B. Truk Angkutan
    ('c0000001-0002-0000-0000-000000000001', 'INTI-TRUK', 'Truk Angkutan (Dump Truck)', 'ASET INTI (RENTAL)', 'B', 12, 
     'Truk untuk pengangkutan material',
     'Aset Produktif untuk Pengangkutan. Untuk proyek konstruksi, pertambangan, logistik material.',
     '["Dump Truck (HD/Biasa)", "Trailer / Lowbed", "Mixer Truck (Beton Molen)"]'::jsonb,
     'c0000001-0000-0000-0000-000000000001'),
    
    -- C. Kendaraan & Alat Ringan
    ('c0000001-0003-0000-0000-000000000001', 'INTI-RINGAN', 'Kendaraan & Alat Ringan', 'ASET INTI (RENTAL)', 'C', 13, 
     'Kendaraan dan alat pendukung ringan',
     'Aset Pendukung Rental. Melayani kebutuhan proyek yang lebih ringan atau spesifik.',
     '["Pick-Up / Truk Ringan", "Bus / Mobil Penumpang", "Genset", "Kompresor", "Concrete Vibrator"]'::jsonb,
     'c0000001-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    main_category = EXCLUDED.main_category,
    sub_category_letter = EXCLUDED.sub_category_letter,
    display_order = EXCLUDED.display_order,
    description = EXCLUDED.description,
    function_description = EXCLUDED.function_description,
    example_assets = EXCLUDED.example_assets;

-- ============================================
-- 2. ASET OPERASIONAL SUB-CATEGORIES
-- ============================================

INSERT INTO categories (id, code, name, main_category, sub_category_letter, display_order, description, function_description, example_assets, parent_id)
VALUES
    -- A. Kendaraan Dinas & Logistik
    ('c0000002-0001-0000-0000-000000000001', 'OPS-KENDARAAN', 'Kendaraan Dinas & Logistik', 'ASET OPERASIONAL', 'A', 21, 
     'Kendaraan untuk operasional internal',
     'Untuk Mendukung Aktivitas Perusahaan. Tidak untuk disewa, tetapi untuk transportasi internal, servis, dan logistik.',
     '["Mobil Dinas Manager/Operasional", "Kendaraan Servis/Mekanik (Service Truck)", "Mobil Tangki Bahan Bakar/Bensin", "Forklift Gudang"]'::jsonb,
     'c0000002-0000-0000-0000-000000000002'),
    
    -- B. Peralatan Bengkel & Servis
    ('c0000002-0002-0000-0000-000000000001', 'OPS-BENGKEL', 'Peralatan Bengkel & Servis', 'ASET OPERASIONAL', 'B', 22, 
     'Peralatan untuk pemeliharaan aset',
     'Untuk Pemeliharaan Aset Rental. Memastikan aset inti selalu dalam kondisi siap sewa.',
     '["Mesin Las", "Alat Ukur Teknis", "Tools Kit Mekanik", "Engine Analyzer", "Press Machine", "Mesin Bubut/Bor"]'::jsonb,
     'c0000002-0000-0000-0000-000000000002'),
    
    -- C. Peralatan Kantor & IT
    ('c0000002-0003-0000-0000-000000000001', 'OPS-KANTOR', 'Peralatan Kantor & IT', 'ASET OPERASIONAL', 'C', 23, 
     'Peralatan kantor dan teknologi informasi',
     'Untuk Administrasi dan Manajemen. Mendukung operasional bisnis, pelaporan, dan komunikasi.',
     '["Komputer, Laptop, Printer", "Server & Jaringan IT", "Software Manajemen Rental & Akuntansi", "Perabotan Kantor"]'::jsonb,
     'c0000002-0000-0000-0000-000000000002')
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    main_category = EXCLUDED.main_category,
    sub_category_letter = EXCLUDED.sub_category_letter,
    display_order = EXCLUDED.display_order,
    description = EXCLUDED.description,
    function_description = EXCLUDED.function_description,
    example_assets = EXCLUDED.example_assets;

-- ============================================
-- 3. ASET TETAP INFRASTRUKTUR SUB-CATEGORIES
-- ============================================

INSERT INTO categories (id, code, name, main_category, sub_category_letter, display_order, description, function_description, example_assets, parent_id)
VALUES
    -- A. Tanah
    ('c0000003-0001-0000-0000-000000000001', 'INFRA-TANAH', 'Tanah', 'ASET TETAP INFRASTRUKTUR', 'A', 31, 
     'Tanah milik perusahaan',
     'Akomodasi Lokasi Usaha. Bisa sebagai tempat operasional atau investasi jangka panjang.',
     '["Tanah Lokasi Kantor", "Tanah Lapangan Penyimpanan (Yard)", "Tanah untuk Bengkel"]'::jsonb,
     'c0000003-0000-0000-0000-000000000003'),
    
    -- B. Bangunan
    ('c0000003-0002-0000-0000-000000000001', 'INFRA-BANGUNAN', 'Bangunan', 'ASET TETAP INFRASTRUKTUR', 'B', 32, 
     'Bangunan milik perusahaan',
     'Fasilitas Operasional. Tempat bekerja, mereparasi, dan menyimpan inventaris.',
     '["Kantor Pusat/Cabang", "Bangunan Bengkel", "Gudang Sparepart", "Pos Security"]'::jsonb,
     'c0000003-0000-0000-0000-000000000003'),
    
    -- C. Infrastruktur Pendukung
    ('c0000003-0003-0000-0000-000000000001', 'INFRA-PENDUKUNG', 'Infrastruktur Pendukung', 'ASET TETAP INFRASTRUKTUR', 'C', 33, 
     'Infrastruktur pendukung operasional',
     'Penunjang Kegiatan di Lokasi. Membuat area operasional aman, tertib, dan efisien.',
     '["Pagar Keliling & Gerbang", "Jalan Hardscape di Yard", "Instalasi Listrik & Air", "Sistem Drainase", "Fuel Station Mini (SPBU Mini)"]'::jsonb,
     'c0000003-0000-0000-0000-000000000003')
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    main_category = EXCLUDED.main_category,
    sub_category_letter = EXCLUDED.sub_category_letter,
    display_order = EXCLUDED.display_order,
    description = EXCLUDED.description,
    function_description = EXCLUDED.function_description,
    example_assets = EXCLUDED.example_assets;
