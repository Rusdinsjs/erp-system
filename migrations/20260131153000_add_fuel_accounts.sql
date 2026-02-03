-- Migration: 20260131153000_add_fuel_accounts
-- Description: Add specific accounts for Fuel Management integration

-- 1. Hutang BBM (Fuel Payable) - Liability
-- Parent: 2-1100 (Kewajiban Lancar) -> 2-1000? Let's check parent.
-- In 047 migration (not relevant). In 001/027 COA migration:
-- 2-1000 is Kewajiban Lancar.
-- We will add 2-1130 Hutang BBM.

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id, description)
VALUES 
(
    '00000000-0000-4002-a113-000000000000', 
    '2-1130', 
    'Hutang BBM', 
    'liability', 
    'credit', 
    '00000000-0000-4002-a100-000000000000',
    'Kewajiban pembayaran BBM (Fuel Payable)'
)
ON CONFLICT (code) DO NOTHING;

-- 2. Biaya Bahan Bakar (Fuel Expense) - Expense
-- Parent: 5-1000 (Beban Pokok Pendapatan) or 6-2000 (Beban Umum)?
-- Usually Fuel for Heavy Equipment is COGS (5-1000).
-- We will add 5-1140 Biaya Bahan Bakar.

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id, description)
VALUES 
(
    '00000000-0000-4005-a114-000000000000', 
    '5-1140', 
    'Biaya Bahan Bakar', 
    'expense', 
    'debit', 
    '00000000-0000-4005-a100-000000000000',
    'Biaya operasional untuk bahan bakar (Fuel Expense)'
)
ON CONFLICT (code) DO NOTHING;
