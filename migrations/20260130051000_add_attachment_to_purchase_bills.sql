-- Migration: 20260130051000_add_attachment_to_purchase_bills
-- Description: Add attachment_url to purchase_bills for storing proof of purchase

ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS attachment_url TEXT;
