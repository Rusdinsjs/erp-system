-- Migration: 047_create_fuel_module
-- Description: Create fuel log module for tracking asset fuel usage
-- Date: 2026-01-18

CREATE TABLE IF NOT EXISTS fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number VARCHAR(50) UNIQUE NOT NULL,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    
    -- Requester Info
    requested_by UUID NOT NULL REFERENCES users(id),
    driver_id UUID REFERENCES users(id),
    
    -- Initial Request Data
    odometer_reading DECIMAL(12, 2) NOT NULL,
    odometer_image_url TEXT NOT NULL,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('volume', 'amount')),
    requested_value DECIMAL(15, 2) NOT NULL,
    
    -- Approval Data
    status VARCHAR(20) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'completed')),
    coupon_code VARCHAR(50), 
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Completion Data
    actual_filled_amount DECIMAL(15, 2),
    actual_volume DECIMAL(10, 2),
    receipt_image_url TEXT,
    completed_at TIMESTAMPTZ,
    
    -- System
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fuel_logs_asset ON fuel_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_requester ON fuel_logs(requested_by);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_status ON fuel_logs(status);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_coupon ON fuel_logs(coupon_code);

-- Check if trigger function exists before creating trigger (standard practice, but here we assume it exists from 001/004)
DROP TRIGGER IF EXISTS update_fuel_logs_updated_at ON fuel_logs;
CREATE TRIGGER update_fuel_logs_updated_at
    BEFORE UPDATE ON fuel_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
