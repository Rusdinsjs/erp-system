-- Migration: 022_enhance_rental_module
-- Description: Add timesheet, billing periods, and enhanced rate configuration
-- Date: 2026-01-12

-- =============================================================================
-- 1. ENHANCE RENTAL_RATES TABLE
-- =============================================================================
ALTER TABLE rental_rates ADD COLUMN IF NOT EXISTS rate_basis VARCHAR(20) DEFAULT 'hourly';
-- rate_basis: 'hourly', 'daily', 'monthly'

ALTER TABLE rental_rates ADD COLUMN IF NOT EXISTS minimum_hours DECIMAL(10,2) DEFAULT 200;
-- Minimum jam per bulan (default 200 jam)

ALTER TABLE rental_rates ADD COLUMN IF NOT EXISTS overtime_multiplier DECIMAL(5,2) DEFAULT 1.25;
-- Overtime rate multiplier (default 125%)

ALTER TABLE rental_rates ADD COLUMN IF NOT EXISTS standby_multiplier DECIMAL(5,2) DEFAULT 0.50;
-- Standby rate multiplier (default 50%)

ALTER TABLE rental_rates ADD COLUMN IF NOT EXISTS breakdown_penalty_per_day DECIMAL(15,2) DEFAULT 0;
-- Penalty per day for breakdown (custom per contract)

ALTER TABLE rental_rates ADD COLUMN IF NOT EXISTS hours_per_day DECIMAL(5,2) DEFAULT 8;
-- Standard working hours per day

ALTER TABLE rental_rates ADD COLUMN IF NOT EXISTS days_per_month INTEGER DEFAULT 25;
-- Working days per month (for monthly calculation)

-- =============================================================================
-- 2. CLIENT CONTACTS TABLE (PIC per Client)
-- =============================================================================
CREATE TABLE IF NOT EXISTS client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Authorization levels
    can_approve_timesheet BOOLEAN DEFAULT false,
    can_approve_billing BOOLEAN DEFAULT false,
    approval_limit DECIMAL(18,2),  -- Max amount can approve
    
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Digital signature
    signature_specimen TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. RENTAL TIMESHEETS TABLE (Daily Log)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rental_timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    
    -- Operating Hours
    start_time TIME,
    end_time TIME,
    operating_hours DECIMAL(5,2) DEFAULT 0,
    standby_hours DECIMAL(5,2) DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    breakdown_hours DECIMAL(5,2) DEFAULT 0,
    
    -- Hour Meter / Kilometer tracking
    hm_km_start DECIMAL(12,2),
    hm_km_end DECIMAL(12,2),
    hm_km_usage DECIMAL(12,2),
    
    -- Operation Status
    operation_status VARCHAR(30) NOT NULL DEFAULT 'operating',
    -- 'operating', 'standby', 'breakdown', 'off', 'maintenance'
    
    breakdown_reason TEXT,  -- If breakdown
    work_description TEXT,
    work_location VARCHAR(255),
    
    -- Documentation
    photos JSONB DEFAULT '[]'::jsonb,
    
    -- Checker (Field recorder)
    checker_id UUID REFERENCES users(id),
    checker_at TIMESTAMPTZ,
    checker_notes TEXT,
    
    -- Verifier (Supervisor)
    verifier_id UUID REFERENCES users(id),
    verifier_at TIMESTAMPTZ,
    verifier_status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'approved', 'rejected', 'revision'
    verifier_notes TEXT,
    
    -- Client PIC approval
    client_pic_id UUID REFERENCES client_contacts(id),
    client_approved_at TIMESTAMPTZ,
    client_signature TEXT,
    client_notes TEXT,
    
    -- Overall status
    status VARCHAR(20) DEFAULT 'draft',
    -- 'draft', 'submitted', 'verified', 'approved', 'disputed', 'revised'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(rental_id, work_date)
);

-- =============================================================================
-- 4. RENTAL BILLING PERIODS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS rental_billing_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
    
    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
    -- 'daily', 'weekly', 'biweekly', 'monthly'
    
    -- Accumulated Hours
    total_operating_hours DECIMAL(10,2) DEFAULT 0,
    total_standby_hours DECIMAL(10,2) DEFAULT 0,
    total_overtime_hours DECIMAL(10,2) DEFAULT 0,
    total_breakdown_hours DECIMAL(10,2) DEFAULT 0,
    total_hm_km_usage DECIMAL(12,2) DEFAULT 0,
    working_days INTEGER DEFAULT 0,
    
    -- Rate configuration snapshot (copied from rental_rates at billing time)
    rate_basis VARCHAR(20),
    hourly_rate DECIMAL(15,2),
    minimum_hours DECIMAL(10,2),
    overtime_multiplier DECIMAL(5,2),
    standby_multiplier DECIMAL(5,2),
    breakdown_penalty_per_day DECIMAL(15,2),
    
    -- Calculation
    billable_hours DECIMAL(10,2),        -- MAX(actual, minimum)
    shortfall_hours DECIMAL(10,2) DEFAULT 0,  -- minimum - actual (if less)
    
    -- Financial breakdown
    base_amount DECIMAL(18,2) DEFAULT 0,
    standby_amount DECIMAL(18,2) DEFAULT 0,
    overtime_amount DECIMAL(18,2) DEFAULT 0,
    breakdown_penalty_amount DECIMAL(18,2) DEFAULT 0,
    
    mobilization_fee DECIMAL(18,2) DEFAULT 0,
    demobilization_fee DECIMAL(18,2) DEFAULT 0,
    other_charges DECIMAL(18,2) DEFAULT 0,
    other_charges_description TEXT,
    
    subtotal DECIMAL(18,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(18,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 11,  -- PPN 11%
    tax_amount DECIMAL(18,2) DEFAULT 0,
    total_amount DECIMAL(18,2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',
    -- 'draft', 'calculated', 'pending_approval', 'approved', 'invoiced', 'paid', 'disputed'
    
    invoice_number VARCHAR(50),
    invoice_date DATE,
    due_date DATE,
    
    -- Approval
    calculated_by UUID REFERENCES users(id),
    calculated_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(rental_id, period_start, period_end)
);

-- =============================================================================
-- 5. INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_active ON client_contacts(is_active);

CREATE INDEX IF NOT EXISTS idx_rental_timesheets_rental ON rental_timesheets(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_timesheets_date ON rental_timesheets(work_date);
CREATE INDEX IF NOT EXISTS idx_rental_timesheets_status ON rental_timesheets(status);
CREATE INDEX IF NOT EXISTS idx_rental_timesheets_checker ON rental_timesheets(checker_id);
CREATE INDEX IF NOT EXISTS idx_rental_timesheets_verifier ON rental_timesheets(verifier_id);

CREATE INDEX IF NOT EXISTS idx_rental_billing_rental ON rental_billing_periods(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_billing_period ON rental_billing_periods(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_rental_billing_status ON rental_billing_periods(status);
CREATE INDEX IF NOT EXISTS idx_rental_billing_invoice ON rental_billing_periods(invoice_number);

-- =============================================================================
-- 6. TRIGGERS
-- =============================================================================
DROP TRIGGER IF EXISTS update_client_contacts_updated_at ON client_contacts;
CREATE TRIGGER update_client_contacts_updated_at BEFORE UPDATE ON client_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rental_timesheets_updated_at ON rental_timesheets;
CREATE TRIGGER update_rental_timesheets_updated_at BEFORE UPDATE ON rental_timesheets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rental_billing_updated_at ON rental_billing_periods;
CREATE TRIGGER update_rental_billing_updated_at BEFORE UPDATE ON rental_billing_periods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE client_contacts IS 'Contact persons (PIC) for each client';
COMMENT ON TABLE rental_timesheets IS 'Daily operation logs for rentals';
COMMENT ON TABLE rental_billing_periods IS 'Billing accumulation per period';

COMMENT ON COLUMN rental_rates.rate_basis IS 'Calculation basis: hourly, daily, monthly';
COMMENT ON COLUMN rental_rates.minimum_hours IS 'Minimum billable hours per month';
COMMENT ON COLUMN rental_rates.overtime_multiplier IS 'Multiplier for overtime hours (e.g. 1.25 = 125%)';
COMMENT ON COLUMN rental_rates.standby_multiplier IS 'Multiplier for standby hours (e.g. 0.5 = 50%)';
COMMENT ON COLUMN rental_rates.breakdown_penalty_per_day IS 'Penalty charged per day of equipment breakdown';
