-- Migration: Frappe/ERPNext-Style Data Import & Export Engine for ERPQu 1.0

CREATE TABLE IF NOT EXISTS data_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctype_name VARCHAR(100) NOT NULL,
    import_type VARCHAR(20) NOT NULL DEFAULT 'Insert', -- 'Insert' or 'Update'
    file_name VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Validating', 'Success', 'Partial_Failed', 'Failed'
    total_rows INT NOT NULL DEFAULT 0,
    successful_rows INT NOT NULL DEFAULT 0,
    failed_rows INT NOT NULL DEFAULT 0,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_import_id UUID NOT NULL REFERENCES data_imports(id) ON DELETE CASCADE,
    row_number INT NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'Success', 'Failed'
    record_identifier VARCHAR(100), -- e.g. 'AST-101'
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    row_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_data_imports_doctype ON data_imports(doctype_name);
CREATE INDEX IF NOT EXISTS idx_data_import_logs_import_id ON data_import_logs(data_import_id);
