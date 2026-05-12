-- Migration: 044_add_work_order_parts
-- Description: Add table for Work Order Parts (missing from initial schema)
-- Created: 2026-01-18

CREATE TABLE IF NOT EXISTS maintenance_work_order_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES maintenance_work_orders(id) ON DELETE CASCADE,
    part_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_cost DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(18, 2) NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wo_parts_wo_id ON maintenance_work_order_parts(work_order_id);
