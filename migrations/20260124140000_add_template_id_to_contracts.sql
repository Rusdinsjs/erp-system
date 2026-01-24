-- Add template_id to rental_contracts table
ALTER TABLE rental_contracts 
ADD COLUMN template_id UUID REFERENCES contract_templates(id) ON DELETE SET NULL;

-- Index for searching contracts by template
CREATE INDEX idx_contracts_template ON rental_contracts(template_id);
