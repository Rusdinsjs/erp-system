-- Migration: 20260131160000_add_tax_payable
-- Description: Add specific payable account for Vehicle Legal Documents (STNK, KIR, Tax)

-- 2-1140 Utang Biaya Legal Armada (Vehicle Legal Payable)
-- Parent: 2-1100 (Kewajiban Lancar) -> 2-1000? 
-- Based on previous migration, 2-1000 is Kewajiban Lancar (Liability).
-- We will use 2-1140 to sit alongside 2-1130 (Hutang BBM).

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id, description)
VALUES 
(
    '00000000-0000-4002-a114-000000000000', 
    '2-1140', 
    'Utang Biaya Legal Armada', 
    'liability', 
    'credit', 
    '00000000-0000-4002-a100-000000000000',
    'Kewajiban pembayaran Pajak, STNK, KIR, dan dokumen legal armada lainnya'
)
ON CONFLICT (code) DO NOTHING;
