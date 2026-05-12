-- Add payment_date to asset_tax_renewals
ALTER TABLE asset_tax_renewals ADD COLUMN payment_date DATE;
