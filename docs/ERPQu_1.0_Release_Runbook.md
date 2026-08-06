# Panduan Operasional Rilis ERPQu 1.0 (ERPQu 1.0 Release Runbook)

Dokumen ini berisi prosedur operasional rilis, mitigasi risiko, uji coba migrasi (*Migration Rehearsal*), dan prosedur darurat pemulihan (*Rollback & Disaster Recovery*) untuk peluncuran **ERPQu 1.0 Trust Milestone**.

---

## 1. Daftar Periksa Pra-Rilis (*Pre-Release Checklist*)

Sebelum rilis produksi ERPQu 1.0 disetujui, pastikan seluruh kriteria berikut terpenuhi:

- [x] **20 Golden Invariants Lulus 100%**: SELURUH pengujian di `golden_invariants_suite_tests.rs` lulus tanpa celah.
- [x] **Zero P0/P1 Security Vulnerabilities**: Audit ketergantungan (*dependency audit*) dan penyensoran rahasia (*secret redaction*) lulus.
- [x] **Isolasi Tenant & Perusahaan**: Tidak ada data yang dapat dibaca antar tenant/company tanpa otorisasi eksplisit.
- [x] **Imutabilitas Buku Besar**: Dokumen posted & GL entries tidak dapat ditimpa/dihapus secara destruktif.
- [x] **Uji Pemulihan Bencana (*Backup & Restore Drill*)**: Restore drill berhasil diverifikasi pada database staging.

---

## 2. Prosedur Migrasi & Cutover Rilis (*Staged Cutover Sequence*)

1. **Pemicuan Mode Maintenance**: Aktifkan pemberitahuan pemeliharaan sistem pada antarmuka pengguna.
2. **Penciptaan Checkpoint Snapshot DB**: Ambil *Point-In-Time Restoration (PITR)* snapshot pada PostgreSQL produksi.
3. **Eksekusi Migrasi Skema SQL**: Jalankan migrasi terurut dari `20260806000001` hingga `20260806000022`.
4. **Verifikasi Rekonsiliasi Otomatis**: Jalankan verifikasi saldo awal:
   $$\text{Stock Ledger Sum} = \text{Bin Balances}$$
   $$\sum \text{Debit} = \sum \text{Credit}$$
5. **Pencopotan Mode Maintenance**: Alihkan lalu lintas pengguna ke rilis biner ERPQu 1.0 baru.

---

## 3. Prosedur Pemulihan Darurat (*Emergency Rollback Plan*)

Jika terjadi hambatan kritis pada tahap cutover (misal: kesalahan data atau kegagalan migrasi):

1. Hentikan seluruh worker proses `api-server` dan *Transactional Outbox Workers*.
2. Lakukan pemulihan (*restore*) database dari PITR snapshot checkpoint pra-rilis.
3. Jalankan pengujian verifikasi data pasca-restorasi untuk memastikan saldo akun & stok kembali 100% konsisten.
4. Laporkan insiden ke tim enginering dan catat pada backlog terversi.
