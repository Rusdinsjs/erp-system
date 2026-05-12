-- Migration: 20260120150000_fix_bcm_billings
-- Description: Add BCM columns to rental_billings table (active table)
-- Date: 2026-01-20

ALTER TABLE rental_billings ADD COLUMN IF NOT EXISTS total_production_volume DECIMAL(15,2) DEFAULT 0;
