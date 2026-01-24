-- Create settings table for dynamic configuration
CREATE TABLE settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Seed default settings
INSERT INTO settings (key, value, description) VALUES
('app_name', '"Asset Management System"', 'Application Name'),
('company_logo', 'null', 'URL to Company Logo'),
('tax_rate', '0.11', 'Default Tax Rate (11%)');
