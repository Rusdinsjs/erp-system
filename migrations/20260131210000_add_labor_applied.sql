-- Migration: 20260131210000_add_labor_applied
-- Description: Add 'Labor Applied' contra-expense account for internal labor allocation

-- 6-1999 Alokasi Tenaga Kerja (Labor Applied)
-- Type: Expense
-- Normal Balance: Credit (Contra-Expense)
-- Parent: 6-1000 (Beban Operasional) -> Or closest Expense Parent

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id, description)
VALUES 
(
    '00000000-0000-4006-a199-000000000000', 
    '6-1999', 
    'Alokasi Tenaga Kerja', 
    'expense', 
    'credit', 
    '00000000-0000-4006-a100-000000000000', -- Assumed parent for Operational Expenses
    'Akun kontra untuk alokasi biaya tenaga kerja internal ke pemeliharaan aset'
)
ON CONFLICT (code) DO NOTHING;
