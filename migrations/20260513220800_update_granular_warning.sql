-- Update tax_renewal_warning_days to be a JSON object for granular control
UPDATE settings 
SET value = '{"STNK": 30, "TAX": 30, "KIR": 30, "LAPOR_TIBA": 30, "HEAVY_EQUIPMENT_TAX": 30, "DEFAULT": 30}'::jsonb,
    description = 'Days before expiry to trigger renewal warning (Granular by type)'
WHERE key = 'tax_renewal_warning_days';

-- Ensure it exists if not already there
INSERT INTO settings (key, value, description) 
VALUES ('tax_renewal_warning_days', '{"STNK": 30, "TAX": 30, "KIR": 30, "LAPOR_TIBA": 30, "HEAVY_EQUIPMENT_TAX": 30, "DEFAULT": 30}'::jsonb, 'Days before expiry to trigger renewal warning (Granular by type)')
ON CONFLICT (key) DO NOTHING;
