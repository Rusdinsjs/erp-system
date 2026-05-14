-- Add tax_renewal_warning_days setting
INSERT INTO settings (key, value, description) VALUES
('tax_renewal_warning_days', '30', 'Days before expiry to trigger renewal warning')
ON CONFLICT (key) DO NOTHING;
