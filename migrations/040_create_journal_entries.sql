-- Create Journal Entries Header Table
CREATE TYPE journal_status AS ENUM ('draft', 'posted');

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_number VARCHAR(50) NOT NULL UNIQUE,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    reference VARCHAR(100),
    status journal_status NOT NULL DEFAULT 'draft',
    created_by UUID, -- Potentially FK to users table if strictly enforced, but usually loose in MVPs
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching
CREATE INDEX idx_journal_date ON journal_entries(date);
CREATE INDEX idx_journal_number ON journal_entries(transaction_number);

-- Create Journal Lines (Detail) Table
CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    description TEXT,
    debit DECIMAL(20, 4) NOT NULL DEFAULT 0,
    credit DECIMAL(20, 4) NOT NULL DEFAULT 0,
    
    -- Constraints to enforce valid accounting data
    CONSTRAINT check_positive_amounts CHECK (debit >= 0 AND credit >= 0),
    CONSTRAINT check_at_least_one CHECK (debit > 0 OR credit > 0),
    CONSTRAINT check_one_side_only CHECK (NOT (debit > 0 AND credit > 0))
);

CREATE INDEX idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account ON journal_lines(account_id);

-- Trigger for updated_at
CREATE TRIGGER update_journal_entries_updated_at
BEFORE UPDATE ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
