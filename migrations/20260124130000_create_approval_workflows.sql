-- Create approval_workflows table
CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'contract', 'rental', etc.
    approval_levels INTEGER NOT NULL DEFAULT 2,
    level_1_role VARCHAR(50),
    level_2_role VARCHAR(50),
    level_3_role VARCHAR(50),
    level_4_role VARCHAR(50),
    level_5_role VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for entity_type
CREATE INDEX idx_approval_workflows_entity_type ON approval_workflows(entity_type);

-- Trigger to update updated_at
CREATE TRIGGER update_approval_workflows_modtime
    BEFORE UPDATE ON approval_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
