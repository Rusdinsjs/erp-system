-- Make approval tracking columns NOT NULL
ALTER TABLE rental_contracts 
ALTER COLUMN current_approval_step SET NOT NULL,
ALTER COLUMN total_approval_steps SET NOT NULL;

ALTER TABLE contract_approvals
ALTER COLUMN approval_level SET NOT NULL;
