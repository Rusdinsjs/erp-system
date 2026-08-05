-- Migration: Add is_account_requested column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_account_requested BOOLEAN DEFAULT false;
