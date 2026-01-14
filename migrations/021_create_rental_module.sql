-- Migration: 021_create_rental_module
-- Description: Create tables for Rented-Out (External Rental) module
-- Date: 2026-01-12

-- =============================================================================
-- 1. CLIENTS TABLE (External Customers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    contact_person VARCHAR(255),
    tax_id VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. RENTAL RATES TABLE (Pricing Configuration)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rental_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    rate_type VARCHAR(20) NOT NULL CHECK (rate_type IN ('daily', 'weekly', 'monthly')),
    rate_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'IDR',
    minimum_duration INTEGER DEFAULT 1,
    deposit_percentage DECIMAL(5,2) DEFAULT 0,
    late_fee_per_day DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. RENTALS TABLE (Main Rental Transactions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_number VARCHAR(50) UNIQUE NOT NULL,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    rental_rate_id UUID REFERENCES rental_rates(id) ON DELETE SET NULL,
    
    -- Status: requested, approved, rejected, rented_out, returned, overdue, cancelled
    status VARCHAR(30) NOT NULL DEFAULT 'requested',
    
    -- Dates
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE,
    expected_end_date DATE,
    actual_end_date DATE,
    
    -- Financial
    daily_rate DECIMAL(15,2),
    total_days INTEGER,
    subtotal DECIMAL(15,2),
    deposit_amount DECIMAL(15,2) DEFAULT 0,
    deposit_returned BOOLEAN DEFAULT false,
    penalty_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2),
    
    -- Approval workflow
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Dispatch workflow
    dispatched_by UUID REFERENCES users(id) ON DELETE SET NULL,
    dispatched_at TIMESTAMPTZ,
    
    -- Return workflow
    returned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    returned_at TIMESTAMPTZ,
    
    -- Documents
    agreement_document VARCHAR(500),
    delivery_note VARCHAR(500),
    invoice_number VARCHAR(100),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. RENTAL HANDOVERS TABLE (Condition Documentation)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rental_handovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
    handover_type VARCHAR(20) NOT NULL CHECK (handover_type IN ('dispatch', 'return')),
    
    -- Condition assessment
    condition_rating VARCHAR(20) CHECK (condition_rating IN ('excellent', 'good', 'fair', 'poor')),
    condition_notes TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    
    -- Damage tracking
    has_damage BOOLEAN DEFAULT false,
    damage_description TEXT,
    damage_photos JSONB DEFAULT '[]'::jsonb,
    
    -- Verification
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    signature_data TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 5. INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_code ON clients(client_code);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active);

CREATE INDEX IF NOT EXISTS idx_rental_rates_category ON rental_rates(category_id);
CREATE INDEX IF NOT EXISTS idx_rental_rates_asset ON rental_rates(asset_id);
CREATE INDEX IF NOT EXISTS idx_rental_rates_type ON rental_rates(rate_type);

CREATE INDEX IF NOT EXISTS idx_rentals_number ON rentals(rental_number);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_client ON rentals(client_id);
CREATE INDEX IF NOT EXISTS idx_rentals_asset ON rentals(asset_id);
CREATE INDEX IF NOT EXISTS idx_rentals_dates ON rentals(start_date, expected_end_date);
CREATE INDEX IF NOT EXISTS idx_rentals_overdue ON rentals(status, expected_end_date) 
    WHERE status = 'rented_out';

CREATE INDEX IF NOT EXISTS idx_rental_handovers_rental ON rental_handovers(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_handovers_type ON rental_handovers(handover_type);

-- =============================================================================
-- 6. ADD RENTED_OUT TO ASSET STATUS
-- =============================================================================
-- Note: If using CHECK constraint on assets.status, update it here
-- Otherwise, application code handles the new status value

COMMENT ON TABLE clients IS 'External customers/companies for asset rental';
COMMENT ON TABLE rental_rates IS 'Pricing configuration for asset rentals by category or specific asset';
COMMENT ON TABLE rentals IS 'Main rental transactions tracking the full lifecycle';
COMMENT ON TABLE rental_handovers IS 'Condition documentation during dispatch and return';
