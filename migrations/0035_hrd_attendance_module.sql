-- ===========================================
-- HRD & ATTENDANCE MODULE MIGRATION
-- ===========================================
-- Extends employees table with comprehensive HRD data
-- Adds attendance tracking, face recognition, work experience, evaluations

-- ===========================================
-- 1. EXTEND EMPLOYEES TABLE
-- ===========================================

-- Biodata
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ktp_number VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR(1) CHECK (gender IN ('L', 'P'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS place_of_birth VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS children_count INT DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS residence_status VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS religion VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS blood_type VARCHAR(5);

-- Emergency Contact
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(50);

-- Employment Details
ALTER TABLE employees ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS end_contract_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS resignation_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS resignation_reason TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES employees(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_evaluator BOOLEAN DEFAULT FALSE;

-- Education & Competency
ALTER TABLE employees ADD COLUMN IF NOT EXISTS education VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS grade VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS competencies TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS competency_attachments JSONB;

-- Payroll & Benefits
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS npwp VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_kesehatan VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_tenaga_kerja VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(15,2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_allowance BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowances JSONB;

-- Leave Management
ALTER TABLE employees ADD COLUMN IF NOT EXISTS leave_balance INT DEFAULT 12;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS leave_used INT DEFAULT 0;

-- Face Recognition
ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_embeddings JSONB;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_verification_status VARCHAR(20) DEFAULT 'none';

-- Office/Location Assignment for Attendance
ALTER TABLE employees ADD COLUMN IF NOT EXISTS office_location_id UUID REFERENCES locations(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowed_radius INT DEFAULT 50;

-- ===========================================
-- 2. EXTEND LOCATIONS TABLE FOR OFFICE SETTINGS
-- ===========================================

ALTER TABLE locations ADD COLUMN IF NOT EXISTS check_in_time TIME DEFAULT '08:00';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS check_out_time TIME DEFAULT '17:00';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS check_in_tolerance INT DEFAULT 30;  -- minutes
ALTER TABLE locations ADD COLUMN IF NOT EXISTS check_out_tolerance INT DEFAULT 15; -- minutes
ALTER TABLE locations ADD COLUMN IF NOT EXISTS radius INT DEFAULT 50; -- meters

-- ===========================================
-- 3. ATTENDANCE RECORDS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Check-in/out times
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    
    -- Location data
    check_in_location_id UUID REFERENCES locations(id),
    check_out_location_id UUID REFERENCES locations(id),
    check_in_lat DOUBLE PRECISION,
    check_in_long DOUBLE PRECISION,
    check_out_lat DOUBLE PRECISION,
    check_out_long DOUBLE PRECISION,
    
    -- Status
    check_in_status VARCHAR(20),  -- 'on_time', 'late'
    check_out_status VARCHAR(20), -- 'on_time', 'early'
    is_mock_location BOOLEAN DEFAULT FALSE,
    
    -- Device & Notes
    device_info VARCHAR(255),
    notes TEXT,
    
    -- Photos
    check_in_photo_url TEXT,
    check_out_photo_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for attendance queries
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(check_in_time);
-- Note: Date-based queries should use WHERE check_in_time >= date AND check_in_time < date+1

-- ===========================================
-- 4. FACE PHOTOS TABLE (for verification)
-- ===========================================

CREATE TABLE IF NOT EXISTS face_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    photo_path TEXT NOT NULL,
    photo_order INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_face_photos_employee ON face_photos(employee_id);

-- ===========================================
-- 5. WORK EXPERIENCE TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS work_experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    start_date DATE,
    end_date DATE,
    description TEXT,
    attachment_urls JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_exp_employee ON work_experiences(employee_id);

-- ===========================================
-- 6. EMPLOYEE EVALUATIONS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS employee_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    evaluator_id UUID REFERENCES users(id),
    year INT NOT NULL,
    period VARCHAR(20), -- 'H1', 'H2', 'ANNUAL'
    score VARCHAR(50),  -- 'Cukup', 'Baik', 'Sangat Baik', 'Istimewa'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evaluations_employee ON employee_evaluations(employee_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_year ON employee_evaluations(year);

-- ===========================================
-- 7. LEAVE REQUESTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL, -- 'annual', 'sick', 'unpaid', 'maternity', etc.
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INT NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);

-- ===========================================
-- 8. TRIGGERS
-- ===========================================

CREATE TRIGGER update_employee_evaluations_updated_at 
    BEFORE UPDATE ON employee_evaluations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at 
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
