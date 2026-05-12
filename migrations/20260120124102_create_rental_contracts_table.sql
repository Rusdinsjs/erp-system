-- Create rental contracts table for contract management and performance tracking
CREATE TABLE rental_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identification
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    
    -- Contract Period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Terms & Conditions
    auto_renew BOOLEAN DEFAULT FALSE,
    renewal_notice_days INTEGER DEFAULT 30,
    payment_terms VARCHAR(20) DEFAULT 'NET_30',
    -- Payment terms: 'NET_30', 'NET_45', 'NET_60', 'COD', 'PREPAID'
    
    -- Rate Management
    price_lock BOOLEAN DEFAULT TRUE,
    -- If true, rental rates cannot change during contract period
    
    -- Status Lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- 'draft', 'pending_approval', 'active', 'expiring', 'expired', 'renewed', 'terminated'
    
    -- Contract Performance Metrics (Aggregated from Timesheets)
    -- These will be calculated from all timesheets under rentals linked to this contract
    total_timesheets INTEGER DEFAULT 0,
    total_operating_hours DECIMAL(10, 2) DEFAULT 0,
    total_standby_hours DECIMAL(10, 2) DEFAULT 0,
    total_breakdown_hours DECIMAL(10, 2) DEFAULT 0,
    
    -- Contract-Level KPIs (Calculated from timesheet aggregation)
    mechanical_availability DECIMAL(5, 2), -- MA %
    physical_availability DECIMAL(5, 2),    -- PA %
    utilization_availability DECIMAL(5, 2), -- UA %
    effective_utilization DECIMAL(5, 2),    -- EU %
    
    -- Last KPI calculation timestamp
    kpi_calculated_at TIMESTAMPTZ,
    
    -- Documents & Notes
    contract_file_url TEXT,
    notes TEXT,
    
    -- Audit Trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    
    -- Approval Workflow
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    
    -- Termination
    terminated_at TIMESTAMPTZ,
    terminated_by UUID REFERENCES users(id),
    termination_reason TEXT,
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (end_date > start_date),
    CONSTRAINT valid_kpi_range CHECK (
        (mechanical_availability IS NULL OR (mechanical_availability >= 0 AND mechanical_availability <= 100)) AND
        (physical_availability IS NULL OR (physical_availability >= 0 AND physical_availability <= 100)) AND
        (utilization_availability IS NULL OR (utilization_availability >= 0 AND utilization_availability <= 100)) AND
        (effective_utilization IS NULL OR (effective_utilization >= 0 AND effective_utilization <= 100))
    )
);

-- Add contract reference to rentals table
ALTER TABLE rentals 
ADD COLUMN contract_id UUID REFERENCES rental_contracts(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_contracts_client ON rental_contracts(client_id);
CREATE INDEX idx_contracts_status ON rental_contracts(status);
CREATE INDEX idx_contracts_dates ON rental_contracts(start_date, end_date);
CREATE INDEX idx_contracts_expiring ON rental_contracts(end_date) 
    WHERE status IN ('active', 'expiring');
CREATE INDEX idx_rentals_contract ON rentals(contract_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contracts_timestamp
BEFORE UPDATE ON rental_contracts
FOR EACH ROW
EXECUTE FUNCTION update_contracts_updated_at();

-- Function to auto-update contract status based on dates
CREATE OR REPLACE FUNCTION update_contract_status()
RETURNS void AS $$
BEGIN
    -- Set to 'expiring' if within notice period
    UPDATE rental_contracts
    SET status = 'expiring'
    WHERE status = 'active'
      AND end_date - INTERVAL '1 day' * renewal_notice_days <= CURRENT_DATE
      AND end_date > CURRENT_DATE;
    
    -- Set to 'expired' if past end date
    UPDATE rental_contracts
    SET status = 'expired'
    WHERE status IN ('active', 'expiring')
      AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Comment documentation
COMMENT ON TABLE rental_contracts IS 'Rental contract management with lifecycle tracking and performance metrics';
COMMENT ON COLUMN rental_contracts.mechanical_availability IS 'MA % - Calculated from timesheets: (Available Hours / Total Hours) * 100';
COMMENT ON COLUMN rental_contracts.physical_availability IS 'PA % - Physical presence availability';
COMMENT ON COLUMN rental_contracts.utilization_availability IS 'UA % - Utilization rate during contract';
COMMENT ON COLUMN rental_contracts.effective_utilization IS 'EU % - Effective utilization including quality metrics';
