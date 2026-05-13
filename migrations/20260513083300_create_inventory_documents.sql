-- Migration: 054_create_inventory_documents
-- Description: Add document support for inventory items (Photos, Manuals, etc.)
-- Created: 2026-05-13

CREATE TABLE IF NOT EXISTS inventory_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- PHOTO, MANUAL, INVOICE, etc.
    file_path TEXT NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    expiry_date DATE,
    notes TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER update_inventory_documents_updated_at
BEFORE UPDATE ON inventory_documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_inv_docs_item ON inventory_documents(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_docs_type ON inventory_documents(type);
