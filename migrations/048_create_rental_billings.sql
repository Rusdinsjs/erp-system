-- Create rental_billings table with granular columns
CREATE TABLE rental_billings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
    
    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) DEFAULT 'monthly', -- monthly, weekly, etc.
    
    -- Accumulated hours
    total_operating_hours DECIMAL(10, 2) DEFAULT 0,
    total_standby_hours DECIMAL(10, 2) DEFAULT 0,
    total_overtime_hours DECIMAL(10, 2) DEFAULT 0,
    total_breakdown_hours DECIMAL(10, 2) DEFAULT 0,
    total_hm_km_usage DECIMAL(10, 2) DEFAULT 0,
    working_days INT DEFAULT 0,

    -- Rate configuration snapshot (to preserve history)
    rate_basis VARCHAR(20) DEFAULT 'hourly',
    hourly_rate DECIMAL(15, 2) DEFAULT 0,
    minimum_hours DECIMAL(10, 2) DEFAULT 200,
    overtime_multiplier DECIMAL(5, 2) DEFAULT 1.25,
    standby_multiplier DECIMAL(5, 2) DEFAULT 0.50,
    breakdown_penalty_per_day DECIMAL(15, 2) DEFAULT 0,

    -- Calculation
    billable_hours DECIMAL(10, 2) DEFAULT 0,
    shortfall_hours DECIMAL(10, 2) DEFAULT 0, -- (Min - Actual)

    -- Financial breakdown
    base_amount DECIMAL(15, 2) DEFAULT 0,
    standby_amount DECIMAL(15, 2) DEFAULT 0,
    overtime_amount DECIMAL(15, 2) DEFAULT 0,
    breakdown_penalty_amount DECIMAL(15, 2) DEFAULT 0,
    
    mobilization_fee DECIMAL(15, 2) DEFAULT 0,
    demobilization_fee DECIMAL(15, 2) DEFAULT 0,
    other_charges DECIMAL(15, 2) DEFAULT 0,
    other_charges_description TEXT,

    -- Totals
    subtotal DECIMAL(15, 2) DEFAULT 0,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    tax_percentage DECIMAL(5, 2) DEFAULT 11.0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,

    -- Status & Invoice Info
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_rental_billings_rental_id ON rental_billings(rental_id);
CREATE INDEX idx_rental_billings_period ON rental_billings(period_start, period_end);
CREATE INDEX idx_rental_billings_status ON rental_billings(status);
