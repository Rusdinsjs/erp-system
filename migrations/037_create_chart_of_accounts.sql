CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
CREATE TYPE normal_balance AS ENUM ('debit', 'credit');

CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    account_type account_type NOT NULL,
    normal_balance normal_balance NOT NULL,
    parent_id UUID REFERENCES chart_of_accounts(id),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    currency VARCHAR(10) DEFAULT 'IDR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coa_parent_id ON chart_of_accounts(parent_id);
CREATE INDEX idx_coa_code ON chart_of_accounts(code);

CREATE TRIGGER update_chart_of_accounts_updated_at
BEFORE UPDATE ON chart_of_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
