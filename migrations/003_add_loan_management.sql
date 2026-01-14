-- Migration: 003_add_loan_management
-- Description: Add asset loan management tables
-- Created: 2026-01-07

-- Asset Loans table
CREATE TABLE IF NOT EXISTS asset_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_number VARCHAR(50) UNIQUE NOT NULL,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    borrower_id UUID NOT NULL REFERENCES users(id),
    approver_id UUID REFERENCES users(id),
    
    -- Dates
    loan_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    actual_return_date DATE,
    
    -- Status: requested, approved, rejected, checked_out, in_use, overdue, returned, damaged, lost
    status VARCHAR(50) NOT NULL DEFAULT 'requested',
    
    -- Condition tracking
    condition_before TEXT,
    condition_after TEXT,
    damage_description TEXT,
    damage_photos TEXT[],
    
    -- Agreement
    terms_accepted BOOLEAN DEFAULT false,
    agreement_document VARCHAR(500),
    
    -- Financial
    deposit_amount DECIMAL(18, 2),
    deposit_returned BOOLEAN DEFAULT false,
    penalty_amount DECIMAL(18, 2),
    penalty_paid BOOLEAN DEFAULT false,
    
    -- Checkout/Checkin
    checked_out_by UUID REFERENCES users(id),
    checked_in_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_asset_loans_asset ON asset_loans(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_loans_borrower ON asset_loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_asset_loans_status ON asset_loans(status);
CREATE INDEX IF NOT EXISTS idx_asset_loans_dates ON asset_loans(loan_date, expected_return_date);
CREATE INDEX IF NOT EXISTS idx_asset_loans_overdue ON asset_loans(expected_return_date) 
    WHERE actual_return_date IS NULL AND status NOT IN ('returned', 'lost', 'rejected');

-- Trigger for updated_at
CREATE TRIGGER update_asset_loans_updated_at
    BEFORE UPDATE ON asset_loans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
