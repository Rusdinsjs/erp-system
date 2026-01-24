-- Create contract_documents table for managing contract files
CREATE TABLE IF NOT EXISTS contract_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'contract', 'addendum', 'amendment', 'insurance', 'other'
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_contract_doc_version UNIQUE(contract_id, document_type, version)
);

-- Create indexes for better query performance
CREATE INDEX idx_contract_documents_contract_id ON contract_documents(contract_id);
CREATE INDEX idx_contract_documents_active ON contract_documents(contract_id, is_active) WHERE is_active = true;
CREATE INDEX idx_contract_documents_type ON contract_documents(contract_id, document_type);

-- Add comment
COMMENT ON TABLE contract_documents IS 'Stores contract documents with versioning support';
COMMENT ON COLUMN contract_documents.document_type IS 'Type of document: contract, addendum, amendment, insurance, other';
COMMENT ON COLUMN contract_documents.version IS 'Version number for document versioning';
COMMENT ON COLUMN contract_documents.is_active IS 'Only one version per document type should be active';
