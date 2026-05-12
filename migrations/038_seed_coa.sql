-- Seed Standard Indonesian Chart of Accounts (PSAK Compatible)

-- 1. ASSETS
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id, description)
VALUES ('10000', 'Aset', 'asset', 'debit', NULL, 'Total Aset');

-- 1.1 Current Assets
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id, description)
SELECT '11000', 'Aset Lancar', 'asset', 'debit', id, 'Aset yang dapat dicairkan dalam < 1 tahun'
FROM chart_of_accounts WHERE code = '10000';

-- 1.1.1 Cash & Bank
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '11100', 'Kas & Bank', 'asset', 'debit', id
FROM chart_of_accounts WHERE code = '11000';

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '11110', 'Kas Kecil (Petty Cash)', 'asset', 'debit', id
FROM chart_of_accounts WHERE code = '11100';

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '11120', 'Bank BCA', 'asset', 'debit', id
FROM chart_of_accounts WHERE code = '11100';

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '11130', 'Bank Mandiri', 'asset', 'debit', id
FROM chart_of_accounts WHERE code = '11100';

-- 1.1.2 Receivables
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '11200', 'Piutang Usaha', 'asset', 'debit', id
FROM chart_of_accounts WHERE code = '11000';

-- 1.2 Fixed Assets
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '12000', 'Aset Tetap', 'asset', 'debit', id
FROM chart_of_accounts WHERE code = '10000';

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '12100', 'Peralatan Kantor', 'asset', 'debit', id
FROM chart_of_accounts WHERE code = '12000';

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '12200', 'Kendaraan', 'asset', 'debit', id
FROM chart_of_accounts WHERE code = '12000';

-- 2. LIABILITIES
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
VALUES ('20000', 'Kewajiban', 'liability', 'credit', NULL);

-- 2.1 Current Liabilities
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '21000', 'Kewajiban Lancar', 'liability', 'credit', id
FROM chart_of_accounts WHERE code = '20000';

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '21100', 'Utang Usaha', 'liability', 'credit', id
FROM chart_of_accounts WHERE code = '21000';

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '21200', 'Utang Gaji', 'liability', 'credit', id
FROM chart_of_accounts WHERE code = '21000';

-- 3. EQUITY
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
VALUES ('30000', 'Ekuitas', 'equity', 'credit', NULL);

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '31000', 'Modal Disetor', 'equity', 'credit', id
FROM chart_of_accounts WHERE code = '30000';

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '32000', 'Laba Ditahan', 'equity', 'credit', id
FROM chart_of_accounts WHERE code = '30000';

-- 4. REVENUE
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
VALUES ('40000', 'Pendapatan', 'revenue', 'credit', NULL);

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '41000', 'Pendapatan Usaha', 'revenue', 'credit', id
FROM chart_of_accounts WHERE code = '40000';

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '41100', 'Pendapatan Jasa', 'revenue', 'credit', id
FROM chart_of_accounts WHERE code = '41000';

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '41200', 'Pendapatan Rental', 'revenue', 'credit', id
FROM chart_of_accounts WHERE code = '41000';

-- 5. EXPENSE
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
VALUES ('50000', 'Beban', 'expense', 'debit', NULL);

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '51000', 'Beban Operasional', 'expense', 'debit', id
FROM chart_of_accounts WHERE code = '50000';

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '51100', 'Beban Gaji & Tunjangan', 'expense', 'debit', id
FROM chart_of_accounts WHERE code = '51000';

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '51200', 'Beban Sewa', 'expense', 'debit', id
FROM chart_of_accounts WHERE code = '51000';

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '51300', 'Beban Listrik, Air, & Internet', 'expense', 'debit', id
FROM chart_of_accounts WHERE code = '51000';

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, parent_id)
SELECT '51400', 'Beban Pemeliharaan', 'expense', 'debit', id
FROM chart_of_accounts WHERE code = '51000';
