-- Part 1: Vendors and Locations
INSERT INTO vendors (id, code, name, contact_person, email, phone, address, is_active) VALUES
('55555555-5555-5555-5555-555555555504', 'VEND-IT-001', 'Dell Indonesia', 'Andi Wijaya', 'sales@dell.co.id', '021-2992-1000', 'Menara Astra, Jakarta', true),
('55555555-5555-5555-5555-555555555505', 'VEND-IT-002', 'HP Indonesia', 'Sarah Lim', 'enterprise@hp.co.id', '021-2554-7000', 'AXA Tower, Jakarta', true),
('55555555-5555-5555-5555-555555555506', 'VEND-IT-003', 'Cisco Indonesia', 'Michael Tan', 'info@cisco.co.id', '021-2992-3000', 'Wisma 46, Jakarta', true),
('55555555-5555-5555-5555-555555555507', 'VEND-IT-004', 'Microsoft Indonesia', 'Linda Chen', 'sales@microsoft.com', '021-5795-7000', 'Menara Standard Chartered, Jakarta', true),
('55555555-5555-5555-5555-555555555508', 'VEND-FRN-001', 'IKEA Indonesia', 'Erik Johansson', 'b2b@ikea.co.id', '021-5021-5000', 'Alam Sutera, Tangerang', true),
('55555555-5555-5555-5555-555555555509', 'VEND-FRN-002', 'Atria Furniture', 'Bambang Sutrisno', 'cs@atria.co.id', '021-4682-2222', 'Kelapa Gading, Jakarta', true),
('55555555-5555-5555-5555-555555555510', 'VEND-FRN-003', 'Olympic Furniture', 'Dewi Kartika', 'info@olympic.co.id', '021-4600-4600', 'Sunter, Jakarta', true),
('55555555-5555-5555-5555-555555555511', 'VEND-VEH-001', 'Auto2000 (Toyota)', 'Agus Hermawan', 'fleet@auto2000.co.id', '021-3199-8888', 'TB Simatupang, Jakarta', true),
('55555555-5555-5555-5555-555555555512', 'VEND-VEH-002', 'Astra Honda Motor', 'Putri Anggraini', 'corporate@astra-honda.com', '021-4682-5000', 'Sunter, Jakarta', true),
('55555555-5555-5555-5555-555555555513', 'VEND-VEH-003', 'Indomobil (Mitsubishi)', 'Rudi Santoso', 'sales@indomobil.co.id', '021-4682-1234', 'Sunter, Jakarta', true),
('55555555-5555-5555-5555-555555555514', 'VEND-EQ-001', 'United Tractors (Komatsu)', 'Hendra Gunawan', 'rental@unitedtractors.com', '021-4605-1234', 'Cakung, Jakarta', true),
('55555555-5555-5555-5555-555555555515', 'VEND-EQ-002', 'Trakindo (Caterpillar)', 'Yanto Prasetyo', 'info@trakindo.co.id', '021-2856-1111', 'Cakung, Jakarta', true),
('55555555-5555-5555-5555-555555555516', 'VEND-EQ-003', 'Schneider Electric', 'Diana Kusuma', 'sales@schneider-electric.com', '021-2952-7000', 'SCBD, Jakarta', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO locations (id, code, name, type, parent_id) VALUES
('33333333-3333-3333-3333-333333333303', 'GEDUNG-C', 'Gedung C (IT Center)', 'Building', NULL),
('33333333-3333-3333-3333-333333333331', 'C-B1', 'Gedung C - Basement', 'Floor', '33333333-3333-3333-3333-333333333303'),
('33333333-3333-3333-3333-333333333332', 'C-LT1', 'Gedung C - Lantai 1', 'Floor', '33333333-3333-3333-3333-333333333303'),
('33333333-3333-3333-3333-333333333341', 'C-101', 'Ruang Data Center', 'Room', '33333333-3333-3333-3333-333333333332'),
('33333333-3333-3333-3333-333333333342', 'C-102', 'Ruang Network Operations', 'Room', '33333333-3333-3333-3333-333333333332'),
('33333333-3333-3333-3333-333333333343', 'C-B101', 'Workshop & Storage', 'Room', '33333333-3333-3333-3333-333333333331'),
('33333333-3333-3333-3333-333333333304', 'GEDUNG-D', 'Gedung D (Warehouse)', 'Building', NULL),
('33333333-3333-3333-3333-333333333351', 'D-LT1', 'Gedung D - Lantai 1', 'Floor', '33333333-3333-3333-3333-333333333304'),
('33333333-3333-3333-3333-333333333361', 'D-101', 'Gudang Utama', 'Room', '33333333-3333-3333-3333-333333333351'),
('33333333-3333-3333-3333-333333333362', 'D-102', 'Area Parkir Kendaraan', 'Room', '33333333-3333-3333-3333-333333333351'),
('33333333-3333-3333-3333-333333333305', 'GEDUNG-B-LT1', 'Gedung B - Lantai 1', 'Floor', '33333333-3333-3333-3333-333333333302'),
('33333333-3333-3333-3333-333333333371', 'B-101', 'Ruang Finance', 'Room', '33333333-3333-3333-3333-333333333305'),
('33333333-3333-3333-3333-333333333372', 'B-102', 'Ruang HR', 'Room', '33333333-3333-3333-3333-333333333305')
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, code, name, parent_id) VALUES
('44444444-4444-4444-4444-444444444416', 'ACCESSORY', 'Aksesoris IT', '44444444-4444-4444-4444-444444444401'),
('44444444-4444-4444-4444-444444444417', 'PROJECTOR', 'Proyektor', '44444444-4444-4444-4444-444444444401'),
('44444444-4444-4444-4444-444444444418', 'MOBILE', 'Smartphone & Tablet', '44444444-4444-4444-4444-444444444401'),
('44444444-4444-4444-4444-444444444431', 'CAR', 'Mobil', '44444444-4444-4444-4444-444444444403'),
('44444444-4444-4444-4444-444444444432', 'MOTORCYCLE', 'Motor', '44444444-4444-4444-4444-444444444403'),
('44444444-4444-4444-4444-444444444433', 'TRUCK', 'Truk', '44444444-4444-4444-4444-444444444403'),
('44444444-4444-4444-4444-444444444441', 'GENERATOR', 'Generator', '44444444-4444-4444-4444-444444444404'),
('44444444-4444-4444-4444-444444444442', 'POWER-TOOL', 'Power Tools', '44444444-4444-4444-4444-444444444404'),
('44444444-4444-4444-4444-444444444443', 'HVAC', 'AC & HVAC', '44444444-4444-4444-4444-444444444404')
ON CONFLICT (id) DO NOTHING;
