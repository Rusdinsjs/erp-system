---
description: Guide on creating custom categories and importing assets using dynamic templates
---

# Panduan Import Aset Massal (Bulk Import via CSV)

Dokumen ini menjelaskan cara bagi Spesialis Aset (seperti Admin Alat Berat atau Kendaraan) untuk memasukkan ratusan data aset baru secara massal dalam hitungan detik tanpa harus mengklik tombol satu-satu di browser.

## Prasyarat

Pastikan kategori aset (misal: "Excavator", "Truk Tambang") sudah dibuat terlebih dahulu. Jika kategori tersebut belum ada di database produksi VPS, Manager atau Spesialis harus membuatnya terlebih dahulu (via UI atau via API).

## Langkah 1: Siapkan Template CSV

Buat file CSV (misal di Excel lalu di-Save As -> CSV) dengan header standar berikut.
Kunci utamanya adalah kolom **`category_code`**, pastikan kode ini *sama persis* dengan kode kategori yang ada di sistem (misal: `EXC` atau `TRK`).

Contoh format `scratch/template_bulk_import_aset.csv`:
```csv
asset_code,name,category_code,brand,model,status,notes
EXC-PROD-01,Excavator PC200 Super,EXC,Komatsu,PC200,draft,Aset Produksi Baru 1
EXC-PROD-02,Excavator Zaxis 200,EXC,Hitachi,Zaxis,draft,Aset Produksi Baru 2
TRK-PROD-01,Hino Dutro Dump,TRK,Hino,Dutro,draft,Truk Tambang Baru
TRK-PROD-02,Mitsubishi Fuso,TRK,Mitsubishi,Fuso,draft,Truk Tambang 2
```

## Langkah 2: Jalankan Script Importer

Gunakan `bun` untuk mengeksekusi script *importer* yang otomatis akan login, mencocokkan kode kategori dengan ID aslinya, lalu menembakkannya ke `/api/assets/bulk`.

```bash
bun scratch/bulk_importer.js <email_spesialis> <password> <lokasi_file_csv>
```

**Contoh (Untuk Admin Alat Berat di lokal):**
// turbo
```bash
bun scratch/bulk_importer.js berat@sjs.com admin123 scratch/template_bulk_import_aset.csv
```

**Contoh (Jika ingin menembak langsung ke VPS Produksi):**
Edit nilai `BASE_URL` di dalam `scratch/bulk_importer.js` menjadi `https://apl.sjsgroup.site`, lalu jalankan kembali skripnya.

## Langkah 3: Persetujuan Manager (L1 & L2)

Setelah skrip di atas berhasil (muncul pesan sukses ter-import sebagai Draft/Pending Approval), aset tersebut belum langsung aktif.
**Manager Aset** (`manager@sjs.com`) harus masuk dan melakukan persetujuan (Approve L1 & L2). Begitu status mencapai `APPROVED_L2`, sistem secara otomatis akan mengaktifkan aset tersebut dan departemennya dijamin sesuai dengan hak akses Spesialis yang menginput!
