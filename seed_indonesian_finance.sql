-- Reset Finance Data
TRUNCATE journal_lines CASCADE;
TRUNCATE journal_entries CASCADE;
DELETE FROM chart_of_accounts;

-- ---------------------------------------------------------
-- 1. ASSETS (ASET)
-- ---------------------------------------------------------
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id, description)
VALUES ('00000000-0000-4000-a001-000000000001', '10000', 'Aset', 'asset', 'debit', NULL, 'Klasifikasi Utama Aset');

-- 1.1 Current Assets (Aset Lancar)
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a001-000000000011', '11000', 'Aset Lancar', 'asset', 'debit', '00000000-0000-4000-a001-000000000001');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a001-000000000111', '11100', 'Kas & Bank', 'asset', 'debit', '00000000-0000-4000-a001-000000000011');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '11110', 'Kas Tunai IDR', 'asset', 'debit', '00000000-0000-4000-a001-000000000111');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a001-000000000112', '11120', 'Bank BCA', 'asset', 'debit', '00000000-0000-4000-a001-000000000111');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '11130', 'Bank Mandiri', 'asset', 'debit', '00000000-0000-4000-a001-000000000111');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a001-000000000121', '11210', 'Piutang Usaha', 'asset', 'debit', '00000000-0000-4000-a001-000000000011');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '11310', 'Persediaan Barang Dagang', 'asset', 'debit', '00000000-0000-4000-a001-000000000011');

-- 1.2 Fixed Assets (Aset Tetap)
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a001-000000000012', '12000', 'Aset Tetap', 'asset', 'debit', '00000000-0000-4000-a001-000000000001');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '12100', 'Tanah', 'asset', 'debit', '00000000-0000-4000-a001-000000000012');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '12200', 'Bangunan', 'asset', 'debit', '00000000-0000-4000-a001-000000000012');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '12201', 'Akumulasi Penyusutan Bangunan', 'asset', 'credit', '00000000-0000-4000-a001-000000000012');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '12300', 'Kendaraan', 'asset', 'debit', '00000000-0000-4000-a001-000000000012');

-- ---------------------------------------------------------
-- 2. LIABILITIES (KEWAJIBAN)
-- ---------------------------------------------------------
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a002-000000000001', '20000', 'Kewajiban', 'liability', 'credit', NULL);

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '21100', 'Utang Usaha', 'liability', 'credit', '00000000-0000-4000-a002-000000000001');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '21200', 'Utang Gaji', 'liability', 'credit', '00000000-0000-4000-a002-000000000001');

-- ---------------------------------------------------------
-- 3. EQUITY (EKUITAS)
-- ---------------------------------------------------------
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a003-000000000001', '30000', 'Ekuitas', 'equity', 'credit', NULL);

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a003-000000000100', '31000', 'Modal Disetor', 'equity', 'credit', '00000000-0000-4000-a003-000000000001');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '32000', 'Laba Ditahan', 'equity', 'credit', '00000000-0000-4000-a003-000000000001');

-- ---------------------------------------------------------
-- 4. REVENUE (PENDAPATAN)
-- ---------------------------------------------------------
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a004-000000000001', '40000', 'Pendapatan', 'revenue', 'credit', NULL);

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a004-000000000100', '41100', 'Pendapatan Penjualan', 'revenue', 'credit', '00000000-0000-4000-a004-000000000001');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a004-000000000200', '41200', 'Pendapatan Rental', 'revenue', 'credit', '00000000-0000-4000-a004-000000000001');

-- ---------------------------------------------------------
-- 5. EXPENSES (BEBAN)
-- ---------------------------------------------------------
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a005-000000000001', '50000', 'Beban Pokok & Operasional', 'expense', 'debit', NULL);

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a005-000000000100', '51000', 'Beban Pokok Penjualan', 'expense', 'debit', '00000000-0000-4000-a005-000000000001');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a005-000000000200', '61000', 'Beban Gaji', 'expense', 'debit', '00000000-0000-4000-a005-000000000001');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a005-000000000300', '62000', 'Beban Listrik, Air & Internet', 'expense', 'debit', '00000000-0000-4000-a005-000000000001');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4000-a005-000000000400', '63000', 'Beban Penyusutan', 'expense', 'debit', '00000000-0000-4000-a005-000000000001');


-- ---------------------------------------------------------
-- DUMMY JOURNAL ENTRIES
-- ---------------------------------------------------------

-- 1. Modal Awal (Cash 500jt, Equity 500jt)
INSERT INTO journal_entries (id, transaction_number, date, description, status)
VALUES ('00000000-0000-4000-b001-000000000001', 'JE-202601-0001', '2026-01-01', 'Setoran Modal Awal Pemilik', 'posted');

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-4000-b001-000000000001', '00000000-0000-4000-a001-000000000112', 'Debit Kas Bank BCA', 500000000, 0);

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-4000-b001-000000000001', '00000000-0000-4000-a003-000000000100', 'Kredit Modal Disetor', 0, 500000000);

-- 2. Terima Pendapatan Rental (Cash 25jt, Revenue 25jt)
INSERT INTO journal_entries (id, transaction_number, date, description, status)
VALUES ('00000000-0000-4000-b001-000000000002', 'JE-202601-0002', '2026-01-05', 'Pendapatan Rental Alat Berat - Project A', 'posted');

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-4000-b001-000000000002', '00000000-0000-4000-a001-000000000112', 'Penerimaan di BCA', 25000000, 0);

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-4000-b001-000000000002', '00000000-0000-4000-a004-000000000200', 'Pendapatan Rental', 0, 25000000);

-- 3. Bayar Gaji Karyawan (Expense 15jt, Cash 15jt)
INSERT INTO journal_entries (id, transaction_number, date, description, status)
VALUES ('00000000-0000-4000-b001-000000000003', 'JE-202601-0003', '2026-01-10', 'Pembayaran Gaji Karyawan Januari', 'posted');

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-4000-b001-000000000003', '00000000-0000-4000-a005-000000000200', 'Beban Gaji', 15000000, 0);

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-4000-b001-000000000003', '00000000-0000-4000-a001-000000000112', 'Pembayaran via BCA', 0, 15000000);

-- 4. Bayar Biaya Internet (Expense 1.5jt, Cash 1.5jt)
INSERT INTO journal_entries (id, transaction_number, date, description, status)
VALUES ('00000000-0000-4000-b001-000000000004', 'JE-202601-0004', '2026-01-12', 'Bayar Tagihan Biznet', 'posted');

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-4000-b001-000000000004', '00000000-0000-4000-a005-000000000300', 'Beban Internet', 1500000, 0);

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-4000-b001-000000000004', '00000000-0000-4000-a001-000000000112', 'Pembayaran via BCA', 0, 1500000);
