-- Migration: 009_add_reports
-- Description: Add report definitions and saved reports
-- Created: 2026-01-07

-- Report definitions
CREATE TABLE IF NOT EXISTS report_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Report type
    report_type VARCHAR(50) NOT NULL,  -- asset, maintenance, loan, depreciation, custom
    output_format VARCHAR(20) DEFAULT 'pdf',  -- pdf, excel, csv
    
    -- Query/template
    query_template TEXT,
    parameters JSONB,  -- { "param_name": { "type": "date", "required": true, "default": "today" } }
    
    -- Layout
    layout_config JSONB,
    
    -- Access
    is_public BOOLEAN DEFAULT false,
    organization_id UUID REFERENCES organizations(id),
    created_by UUID REFERENCES users(id),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Saved/generated reports
CREATE TABLE IF NOT EXISTS saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID REFERENCES report_definitions(id),
    name VARCHAR(255) NOT NULL,
    
    -- Parameters used
    parameters JSONB,
    
    -- Output
    file_path VARCHAR(500),
    file_size INTEGER,
    output_format VARCHAR(20),
    
    -- Generation
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    generation_time_ms INTEGER,
    
    -- Scheduling
    is_scheduled BOOLEAN DEFAULT false,
    schedule_cron VARCHAR(100),
    next_run_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(50) DEFAULT 'completed',  -- pending, generating, completed, failed
    error_message TEXT
);

-- Report access log
CREATE TABLE IF NOT EXISTS report_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES saved_reports(id),
    definition_id UUID REFERENCES report_definitions(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,  -- view, download, generate
    ip_address INET,
    accessed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert default report definitions
INSERT INTO report_definitions (code, name, report_type, description, parameters) VALUES
    ('asset_inventory', 'Asset Inventory Report', 'asset', 
     'Complete inventory of all assets with current values',
     '{"category_id": {"type": "uuid", "required": false}, "location_id": {"type": "uuid", "required": false}, "status": {"type": "string", "required": false}}'),
    
    ('asset_depreciation', 'Asset Depreciation Report', 'depreciation',
     'Depreciation schedule for all assets',
     '{"as_of_date": {"type": "date", "required": true, "default": "today"}, "category_id": {"type": "uuid", "required": false}}'),
    
    ('maintenance_summary', 'Maintenance Summary Report', 'maintenance',
     'Summary of maintenance activities and costs',
     '{"start_date": {"type": "date", "required": true}, "end_date": {"type": "date", "required": true}, "asset_id": {"type": "uuid", "required": false}}'),
    
    ('loan_status', 'Loan Status Report', 'loan',
     'Current status of all asset loans',
     '{"include_returned": {"type": "boolean", "default": false}, "overdue_only": {"type": "boolean", "default": false}}'),
    
    ('asset_lifecycle', 'Asset Lifecycle Report', 'asset',
     'Asset status changes and lifecycle events',
     '{"asset_id": {"type": "uuid", "required": false}, "start_date": {"type": "date", "required": true}, "end_date": {"type": "date", "required": true}}')
ON CONFLICT (code) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_report_definitions_type ON report_definitions(report_type);
CREATE INDEX IF NOT EXISTS idx_report_definitions_org ON report_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_definition ON saved_reports(definition_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_user ON saved_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_report_access_log_report ON report_access_log(report_id);
CREATE INDEX IF NOT EXISTS idx_report_access_log_user ON report_access_log(user_id);

-- Trigger
CREATE TRIGGER update_report_definitions_updated_at
    BEFORE UPDATE ON report_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
