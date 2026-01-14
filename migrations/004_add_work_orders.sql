-- Migration: 004_add_work_orders
-- Description: Add maintenance work orders and checklists
-- Created: 2026-01-07

-- Maintenance Work Orders
CREATE TABLE IF NOT EXISTS maintenance_work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_number VARCHAR(50) UNIQUE NOT NULL,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    
    -- Type: preventive, corrective, predictive, calibration
    wo_type VARCHAR(50) NOT NULL DEFAULT 'corrective',
    -- Priority: low, medium, high, critical
    priority VARCHAR(20) DEFAULT 'medium',
    -- Status: pending, approved, assigned, in_progress, on_hold, completed, cancelled
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    
    -- Scheduling
    scheduled_date DATE,
    due_date DATE,
    actual_start_date TIMESTAMPTZ,
    actual_end_date TIMESTAMPTZ,
    
    -- Resources
    assigned_technician UUID REFERENCES users(id),
    vendor_id UUID REFERENCES vendors(id),
    estimated_hours DECIMAL(8, 2),
    actual_hours DECIMAL(8, 2),
    
    -- Costs
    estimated_cost DECIMAL(18, 2),
    actual_cost DECIMAL(18, 2),
    parts_cost DECIMAL(18, 2),
    labor_cost DECIMAL(18, 2),
    
    -- Details
    problem_description TEXT,
    work_performed TEXT,
    recommendations TEXT,
    
    -- Safety
    safety_requirements TEXT[],
    lockout_tagout_required BOOLEAN DEFAULT false,
    
    -- Completion
    completion_notes TEXT,
    customer_signoff VARCHAR(255),
    technician_signoff VARCHAR(255),
    
    -- System
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    completed_by UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Checklists
CREATE TABLE IF NOT EXISTS maintenance_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES maintenance_work_orders(id) ON DELETE CASCADE,
    task_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT,
    expected_result TEXT,
    
    -- Status: pending, in_progress, completed, skipped, failed
    status VARCHAR(50) DEFAULT 'pending',
    completed_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    actual_result TEXT,
    
    -- Verification
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    
    -- Attachments
    photos TEXT[],
    readings JSONB,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_asset ON maintenance_work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON maintenance_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON maintenance_work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician ON maintenance_work_orders(assigned_technician);
CREATE INDEX IF NOT EXISTS idx_work_orders_dates ON maintenance_work_orders(scheduled_date, due_date);
CREATE INDEX IF NOT EXISTS idx_checklists_work_order ON maintenance_checklists(work_order_id);

-- Triggers
CREATE TRIGGER update_maintenance_work_orders_updated_at
    BEFORE UPDATE ON maintenance_work_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
