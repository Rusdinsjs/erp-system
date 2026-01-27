-- Create Maintenance Templates table
CREATE TABLE IF NOT EXISTS maintenance_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    asset_category_id UUID REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Maintenance Template Tasks table
CREATE TABLE IF NOT EXISTS maintenance_template_tasks (
    id UUID PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES maintenance_templates(id) ON DELETE CASCADE,
    task_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT,
    expected_result TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX idx_maintenance_template_tasks_template_id ON maintenance_template_tasks(template_id);
CREATE INDEX idx_maintenance_templates_category ON maintenance_templates(asset_category_id);
