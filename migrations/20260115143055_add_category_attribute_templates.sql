-- Add category_attribute_templates table
CREATE TABLE IF NOT EXISTS category_attribute_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    attributes JSONB NOT NULL DEFAULT '[]', -- Array of strings e.g. ["RAM", "Color"]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_category_attribute_templates_updated_at
BEFORE UPDATE ON category_attribute_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
