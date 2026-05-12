-- Add delegation support to rental contracts
ALTER TABLE rental_contracts 
ADD COLUMN delegated_to UUID REFERENCES users(id);

-- Add delegated_to to approval history as well to track who it was delegated TO
ALTER TABLE contract_approvals
ADD COLUMN delegated_to UUID REFERENCES users(id);
