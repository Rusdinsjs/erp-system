-- Comprehesive Indonesian Chart of Accounts (Kledo-style)
-- Optimized for Asset Management and General Business

-- Clear existing data (keeping it clean)
TRUNCATE journal_lines CASCADE;
TRUNCATE journal_entries CASCADE;
DELETE FROM chart_of_accounts;

-- Helper UUIDs for Root Groups
-- Asset: 1000-0000
-- Liability: 2000-0000
-- Equity: 3000-0000
-- Revenue: 4000-0000
-- COGS: 5000-0000
-- Expense: 6000-0000
-- Other Income: 8000-0000
-- Other Expense: 9000-0000

-- =========================================================
-- 1. ASSETS (ASET)
-- =========================================================
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id, description)
VALUES ('00000000-0000-4001-a000-000000000000', '1-0000', 'Aset', 'asset', 'debit', NULL, 'Total Aset Perusahaan');

-- 1.1 Aset Lancar
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4001-a100-000000000000', '1-1000', 'Aset Lancar', 'asset', 'debit', '00000000-0000-4001-a000-000000000000');

-- 1.1.1 Kas & Bank
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4001-a110-000000000000', '1-1100', 'Kas & Bank', 'asset', 'debit', '00000000-0000-4001-a100-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4001-a111-000000000001', '1-1110', 'Kas Tunai', 'asset', 'debit', '00000000-0000-4001-a110-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4001-a112-000000000001', '1-1210', 'Bank BCA', 'asset', 'debit', '00000000-0000-4001-a110-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4001-a112-000000000002', '1-1220', 'Bank Mandiri', 'asset', 'debit', '00000000-0000-4001-a110-000000000000');

-- 1.1.2 Piutang
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4001-a120-000000000000', '1-1300', 'Piutang Usaha', 'asset', 'debit', '00000000-0000-4001-a100-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '1-1310', 'Piutang Belum Ditagih', 'asset', 'debit', '00000000-0000-4001-a120-000000000000');

-- 1.1.3 Persediaan
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4001-a130-000000000000', '1-1400', 'Persediaan', 'asset', 'debit', '00000000-0000-4001-a100-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '1-1410', 'Persediaan Barang Jadi', 'asset', 'debit', '00000000-0000-4001-a130-000000000000');

-- 1.1.4 Aset Lancar Lainnya
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '1-1510', 'Beban Dibayar Dimuka', 'asset', 'debit', '00000000-0000-4001-a100-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '1-1520', 'Uang Muka Pembelian', 'asset', 'debit', '00000000-0000-4001-a100-000000000000');


-- 1.2 Aset Tetap
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4001-a200-000000000000', '1-2000', 'Aset Tetap', 'asset', 'debit', '00000000-0000-4001-a000-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4001-a210-000000000000', '1-2100', 'Tanah & Bangunan', 'asset', 'debit', '00000000-0000-4001-a200-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '1-2110', 'Tanah', 'asset', 'debit', '00000000-0000-4001-a210-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '1-2120', 'Bangunan', 'asset', 'debit', '00000000-0000-4001-a210-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4001-a220-000000000000', '1-2200', 'Kendaraan', 'asset', 'debit', '00000000-0000-4001-a200-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4001-a230-000000000000', '1-2300', 'Mesin & Peralatan', 'asset', 'debit', '00000000-0000-4001-a200-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '1-2310', 'Peralatan Kantor', 'asset', 'debit', '00000000-0000-4001-a230-000000000000');

-- 1.2.9 Akumulasi Penyusutan (Contra-Asset)
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4001-a290-000000000000', '1-2900', 'Akumulasi Penyusutan', 'asset', 'credit', '00000000-0000-4001-a200-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '1-2910', 'Akum. Penyusutan Bangunan', 'asset', 'credit', '00000000-0000-4001-a290-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '1-2920', 'Akum. Penyusutan Kendaraan', 'asset', 'credit', '00000000-0000-4001-a290-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '1-2930', 'Akum. Penyusutan Mesin/Peralatan', 'asset', 'credit', '00000000-0000-4001-a290-000000000000');


-- =========================================================
-- 2. LIABILITIES (KEWAJIBAN)
-- =========================================================
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4002-a000-000000000000', '2-0000', 'Kewajiban', 'liability', 'credit', NULL);

-- 2.1 Utang Lancar
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4002-a100-000000000000', '2-1000', 'Kewajiban Lancar', 'liability', 'credit', '00000000-0000-4002-a000-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '2-1110', 'Utang Usaha', 'liability', 'credit', '00000000-0000-4002-a100-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '2-1120', 'Utang Belum Ditagih', 'liability', 'credit', '00000000-0000-4002-a100-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '2-1210', 'Utang Gaji', 'liability', 'credit', '00000000-0000-4002-a100-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '2-1310', 'Utang Pajak - PPN', 'liability', 'credit', '00000000-0000-4002-a100-000000000000');

-- 2.2 Utang Jangka Panjang
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4002-a200-000000000000', '2-2000', 'Kewajiban Jangka Panjang', 'liability', 'credit', '00000000-0000-4002-a000-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '2-2110', 'Utang Bank Jangka Panjang', 'liability', 'credit', '00000000-0000-4002-a200-000000000000');


-- =========================================================
-- 3. EQUITY (EKUITAS)
-- =========================================================
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4003-a000-000000000000', '3-0000', 'Ekuitas', 'equity', 'credit', NULL);

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4003-a110-000000000001', '3-1100', 'Modal Disetor', 'equity', 'credit', '00000000-0000-4003-a000-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4003-a120-000000000001', '3-1200', 'Saldo Laba Ditahan', 'equity', 'credit', '00000000-0000-4003-a000-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '3-1300', 'Prive / Pengambilan Pemilik', 'equity', 'debit', '00000000-0000-4003-a000-000000000000');


-- =========================================================
-- 4. REVENUE (PENDAPATAN)
-- =========================================================
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4004-a000-000000000000', '4-0000', 'Pendapatan Usaha', 'revenue', 'credit', NULL);

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4004-a110-000000000001', '4-1100', 'Pendapatan Penjualan', 'revenue', 'credit', '00000000-0000-4004-a000-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4004-a120-000000000001', '4-1200', 'Pendapatan Jasa / Rental', 'revenue', 'credit', '00000000-0000-4004-a000-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '4-1900', 'Diskon Penjualan', 'revenue', 'debit', '00000000-0000-4004-a000-000000000000');


-- =========================================================
-- 5. COST OF SALES (HPP)
-- =========================================================
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4005-a000-000000000000', '5-0000', 'Harga Pokok Penjualan', 'expense', 'debit', NULL);

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4005-a110-000000000001', '5-1100', 'Beban Pokok Penjualan (HPP)', 'expense', 'debit', '00000000-0000-4005-a000-000000000000');


-- =========================================================
-- 6. OPERATING EXPENSES (BEBAN OPERASIONAL)
-- =========================================================
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4006-a000-000000000000', '6-0000', 'Beban Operasional', 'expense', 'debit', NULL);

-- 6.1 Beban Personalia
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4006-a100-000000000000', '6-1000', 'Beban Gaji & Personalia', 'expense', 'debit', '00000000-0000-4006-a000-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4006-a110-000000000001', '6-1100', 'Gaji Pokok & Tunjangan', 'expense', 'debit', '00000000-0000-4006-a100-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '6-1200', 'Lembur & Komisi', 'expense', 'debit', '00000000-0000-4006-a100-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '6-1300', 'BPJS / Asuransi Pegawai', 'expense', 'debit', '00000000-0000-4006-a100-000000000000');

-- 6.2 Beban Umum & G&A
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4006-a200-000000000000', '6-2000', 'Beban Umum & Administrasi', 'expense', 'debit', '00000000-0000-4006-a000-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4006-a210-000000000001', '6-2100', 'Biaya Listrik, Air & Internet', 'expense', 'debit', '00000000-0000-4006-a200-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '6-2200', 'Biaya Keamanan & Kebersihan', 'expense', 'debit', '00000000-0000-4006-a200-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '6-2310', 'Biaya ATK / Perlengkapan', 'expense', 'debit', '00000000-0000-4006-a200-000000000000');

-- 6.3 Beban Pemasaran
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4006-a300-000000000000', '6-3000', 'Beban Pemasaran', 'expense', 'debit', '00000000-0000-4006-a000-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '6-3110', 'Iklan & Promosi Digital', 'expense', 'debit', '00000000-0000-4006-a300-000000000000');

-- 6.9 Beban Penyusutan
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4006-a900-000000000000', '6-9000', 'Beban Penyusutan Aset Tetap', 'expense', 'debit', '00000000-0000-4006-a000-000000000000');


-- =========================================================
-- 8. OTHER INCOME (PENDAPATAN LAINNYA)
-- =========================================================
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4008-a000-000000000000', '8-0000', 'Pendapatan Lain-lain', 'revenue', 'credit', NULL);

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '8-1100', 'Pendapatan Bunga Bank', 'revenue', 'credit', '00000000-0000-4008-a000-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '8-1200', 'Laba Pelepasan Aset Tetap', 'revenue', 'credit', '00000000-0000-4008-a000-000000000000');


-- =========================================================
-- 9. OTHER EXPENSES (BEBAN LAINNYA)
-- =========================================================
INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES ('00000000-0000-4009-a000-000000000000', '9-0000', 'Beban Lain-lain', 'expense', 'debit', NULL);

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '9-1100', 'Beban Bunga Pinjaman', 'expense', 'debit', '00000000-0000-4009-a000-000000000000');

INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id)
VALUES (gen_random_uuid(), '9-1200', 'Biaya Admin Bank', 'expense', 'debit', '00000000-0000-4009-a000-000000000000');


-- =========================================================
-- SAMPLE DUMMY TRANSACTIONS (Opening & Jan 2026)
-- =========================================================

-- 1. Saldo Awal (Modal 1 Milyar)
INSERT INTO journal_entries (id, transaction_number, date, description, status)
VALUES ('00000000-0000-400b-b001-000000000001', 'OP-20260101', '2026-01-01', 'Saldo Awal - Setoran Modal Saham', 'posted');

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-400b-b001-000000000001', '00000000-0000-4001-a112-000000000001', 'Bank BCA', 1000000000, 0);

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-400b-b001-000000000001', '00000000-0000-4003-a110-000000000001', 'Modal Disetor', 0, 1000000000);

-- 2. Pembelian Laptop Kantor (Asset Purchase)
INSERT INTO journal_entries (id, transaction_number, date, description, status)
VALUES ('00000000-0000-400b-b001-000000000002', 'JE-20260105', '2026-01-05', 'Beli MacBook Pro M3 untuk Marketing', 'posted');

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-400b-b001-000000000002', '00000000-0000-4001-a230-000000000000', 'Peralatan Kantor (Laptop)', 35000000, 0);

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-400b-b001-000000000002', '00000000-0000-4001-a112-000000000001', 'Bayar via Transfer BCA', 0, 35000000);

-- 3. Transaksi Penjualan Jasa Rental
INSERT INTO journal_entries (id, transaction_number, date, description, status)
VALUES ('00000000-0000-400b-b001-000000000003', 'INV-20260101', '2026-01-10', 'Rental Crane - Project MRT Jakarta', 'posted');

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-400b-b001-000000000003', '00000000-0000-4001-a120-000000000000', 'Tagihan Piutang MRT', 85000000, 0);

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-400b-b001-000000000003', '00000000-0000-4001-a110-000000000000', 'PPN Keluaran 11%', 0, 8423423); -- Conto pajak
-- Let's simplify and just do revenue for now
UPDATE journal_lines SET debit = 85000000 WHERE description = 'Tagihan Piutang MRT';
INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-400b-b001-000000000003', '00000000-0000-4004-a120-000000000001', 'Pendapatan Jasa Rental Crane', 0, 85000000);

-- 4. Bayar Gaji (Split with Tax deduction simplified)
INSERT INTO journal_entries (id, transaction_number, date, description, status)
VALUES ('00000000-0000-400b-b001-000000000004', 'PAY-202601-25', '2026-01-25', 'Payroll Karyawan Periode Januari', 'posted');

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-400b-b001-000000000004', '00000000-0000-4006-a110-000000000001', 'Biaya Gaji Karyawan', 45000000, 0);

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-400b-b001-000000000004', '00000000-0000-4001-a112-000000000001', 'Transfer via BCA Payroll', 0, 45000000);

-- 5. Bayar Biaya Cloud & Internet
INSERT INTO journal_entries (id, transaction_number, date, description, status)
VALUES ('00000000-0000-400b-b001-000000000005', 'JE-20260128', '2026-01-28', 'Bayar Langganan AWS & Telkom', 'posted');

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-400b-b001-000000000005', '00000000-0000-4006-a210-000000000001', 'Biaya Internet & Server', 4500000, 0);

INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit)
VALUES ('00000000-0000-400b-b001-000000000005', '00000000-0000-4001-a112-000000000001', 'Bayar via BCA', 0, 4500000);
