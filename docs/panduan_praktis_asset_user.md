# 📘 Panduan Praktis: Menjalankan Modul Aset & User Management

Panduan ini berisi *SOP (Standard Operating Procedure)* langkah demi langkah untuk mengelola User (Pengguna) dan mengoperasikan Modul Aset di SJS Group ERP, dengan mempertimbangkan sistem keamanan Role-Based Access Control (RBAC) yang membagi kewenangan untuk **Alat Berat, Kendaraan, dan Infrastruktur**.

---

## 👥 BAGIAN 1: USER MANAGEMENT (Mengelola Hak Akses)

Langkah ini dilakukan oleh **Super Admin** atau pihak HRD untuk memberikan akses ke karyawan baru.

### Langkah 1: Akses Menu Users
1. Login ke aplikasi menggunakan akun `admin` atau `super_admin`.
2. Di layar utama (Launchpad), klik menu **User Management** atau akses via sidebar menu `/users`.

### Langkah 2: Mendaftarkan Akun Baru
1. Klik tombol **Create User** di pojok kanan atas.
2. Isi data:
   - **Name**: Nama Lengkap Karyawan (Misal: *Budi Santoso*)
   - **Email**: Email untuk login (Misal: *budi.alatberat@sjs.com*)
   - **Password**: Buatkan password awal (Misal: *P@ssw0rd123*).
3. **PILIH ROLE YANG TEPAT (SANGAT PENTING)**:
   - Jika Budi bertugas mengurus Excavator/Dozer: Pilih **Admin Alat Berat**
   - Jika Budi bertugas mengurus Truk/Mobil: Pilih **Admin Kendaraan**
   - Jika Budi bertugas mengurus Gedung/Tanah: Pilih **Admin Infrastruktur**
   - Jika karyawan biasa yang hanya bisa melihat: Pilih **Staff / User**
4. Klik **Create User** untuk menyimpan.

> [!TIP]
> **Cara Cek Berhasil**: Di daftar user, lihat kolom `Access Scope`. Anda akan melihat tulisan **Spesialis Alat Berat / Kendaraan / Infrastruktur** sesuai pilihan Anda, dan tombol `Login Status` berwarna hijau (Allowed).

---

## 🗂️ BAGIAN 2: PERSIAPAN KATEGORI ASET

Langkah ini dilakukan oleh **Masing-masing Admin Spesialis** sebelum menginput data fisik aset.

### Langkah 1: Akses Menu Categories
1. Budi (Admin Alat Berat) login dengan akunnya.
2. Masuk ke Launchpad → **Asset Management** → tab menu **Categories**.
3. Di sisi kiri layar, Budi *hanya akan melihat* kategori yang diizinkan untuk rolenya. (Jika kosong, artinya belum ada kategori Alat Berat sama sekali).

### Langkah 2: Membuat Struktur Kategori Baru
1. Klik **New Root** (untuk kategori utama) atau ikon **[+]** (Plus) pada kategori yang ada untuk membuat sub-kategori.
2. Masukkan Detail **General**:
   - **Asset Group (Akses Admin)**: (Wajib!) Pilih `Alat Berat`.
   - **Code**: Singkatan kategori (Contoh: `EXC` untuk Excavator).
   - **Name**: Nama Kategori (Contoh: `Excavator 20 Ton`).
3. (Opsional) Masukkan Aturan Akuntansi di tab **Accounting**:
   - Pilih *Akun Debit OPEX* (Beban Penyusutan Alat Berat).
   - Pilih *Akun Kredit* (Akumulasi Penyusutan Alat Berat).
4. (Opsional) Di tab **Depreciation**, set Umur Ekonomis, misal `60` (Bulan) dan metode penyusutan `Straight Line`.
5. Klik **Create Category** (Save).

---

## 🚜 BAGIAN 3: MENGINPUT & MENGELOLA ASET FISIK

Setelah kategori dibuat, admin sekarang bisa menginput fisik aset (pembelian baru atau pendataan ulang).

### Langkah 1: Memasukkan Aset Baru
1. Tetap pakai akun Admin (Misal: Alat Berat), masuk ke menu **Assets**.
2. Klik tombol **Add Asset** di kanan atas (akan terbuka form di samping kanan/Drawer).
3. Isi kolom yang wajib:
   - **Asset Code**: Nomor lambung/inventaris (Misal: `EXC-001`).
   - **Name**: Nama aset (Misal: `Komatsu PC200-8`).
   - **Category**: Pilih dari dropdown. Karena Budi adalah Admin Alat Berat, opsi yang muncul **hanya** kategori Alat Berat.
   - **Purchase Information**: Harga Beli (Misal: 1 Milyar) dan Tanggal Beli.
   - **Location & Penanggung Jawab**: Tempat fisik aset dan siapa operator/supir yang memegangnya.
4. Klik tombol **Save**.

### Langkah 2: Mengelola Siklus Hidup Aset (Lifecycle)
1. Di tabel Assets, setiap baris aset punya kolom **Actions** (di paling kanan).
2. Arahkan mouse (hover) ke baris `EXC-001`, akan muncul ikon-ikon aksi.
3. Klik ikon **Refresh/Panah Melingkar** (Manage Lifecycle).
4. Di sini Anda bisa:
   - Mengubah status aset dari *In Use* menjadi *Under Maintenance* (Masuk Bengkel).
   - Melakukan serah terima (*Handover*) ke operator/penanggung jawab baru.
   - Mencetak form serah terima.

### Langkah 3: Melakukan Bulk Update (Update Massal)
Jika ada 10 dump truck yang harus dikirim ke satu lokasi tambang secara bersamaan:
1. Centang (Checkbox) di tabel Assets untuk ke-10 truk tersebut.
2. Di toolbar yang muncul di bawah/atas, klik **Location**.
3. Pilih lokasi tambang baru, lalu klik Update. Otomatis 10 truk berpindah lokasi di sistem.

---

## 🖨️ BAGIAN 4: REPORTING & EKSPOR

Bagi pimpinan atau manajer yang membutuhkan laporan fisik.

1. Buka menu **Assets**.
2. Jika butuh filter khusus, klik tombol **Filters** (di sebelah kotak Search). Anda bisa memfilter hanya aset yang statusnya `Rented Out` (Sedang disewakan) atau `Under Maintenance`.
3. Setelah difilter, klik tombol **Export PDF** (pojok kanan atas).
4. Browser akan mengunduh file dokumen PDF rapi yang siap di-print untuk rapat evaluasi.

---
> [!IMPORTANT]
> **Pemisahan Kekuasaan SJS Group:**
> Sistem secara ketat melindungi data dari ubahan tak sengaja. Jika *Admin Kendaraan* mencoba memaksa masuk lewat link URL ke daftar aset *Alat Berat*, sistem (secara Backend dan Frontend) akan melakukan blokir dan menampilkan daftar kosong karena filter `KENDARAAN` selalu mengikat (Bind) akunnya secara permanen selama ia belum mengganti status jabatannya di User Management.
