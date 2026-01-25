# Penjelasan Detail Arsitektur Berlapis (Layered Architecture)

Arsitektur Berlapis (sering dikaitkan dengan *Clean Architecture* atau *Onion Architecture*) adalah pola desain perangkat lunak yang memisahkan kode menjad beberapa lapisan logis. Tujuannya adalah untuk membuat sistem yang:
1.  **Mudah Diuji (Testable)**: Logika bisnis bisa dites tanpa database atau server web.
2.  **Independen**: UI, Database, dan Framework bisa diganti tanpa mengubah aturan bisnis inti.
3.  **Terstruktur**: Setiap kode memiliki "rumah" yang jelas sesuai tanggung jawabnya.

Dalam proyek ini, arsitektur dibagi menjadi 4 lapisan utama:

---

## 1. Domain Layer (Inti Bisnis)
**Lokasi**: `src/domain`
Ini adalah jantung dari aplikasi. Lapisan ini berisi aturan bisnis murni dan **tidak boleh bergantung pada lapisan lain**. Ia tidak tahu apa itu database, HTTP, atau JSON.

*   **Isi Utama**:
    *   **Entities**: Objek bisnis utama yang memiliki ID dan siklus hidup (contoh: `Asset`, `Employee`, `WorkOrder`).
    *   **Value Objects**: Objek tanpa ID yang didefinisikan oleh nilainya (contoh: `Money`, `Address`).
    *   **Repository Interfaces (Traits)**: Kontrak/interface yang mendefinisikan *apa* yang bisa dilakukan (contoh: `save`, `find_by_id`), tapi bukan *bagaimana* caranya.
    *   **Domain Errors**: Jenis-jenis kesalahan bisnis (contoh: `InsufficentFunds`, `AssetNotAvailable`).
*   **Contoh di Proyek**: `src/domain/entities/asset.rs` mendefinisikan struktur struct `Asset` dan logika validasi internalnya.

## 2. Application Layer (Orkestrator)
**Lokasi**: `src/application`
Lapisan ini menjembatani dunia luar dengan Domain. Ia berisi "Use Cases" atau alur cerita pengguna.

*   **Tanggung Jawab**:
    *   Menerima input dari API (melalui DTO).
    *   Memanggil Repository (via interface) untuk mengambil data Domain.
    *   Mengeksekusi logika bisnis pada Domain Entity.
    *   Menyimpan kembali perubahan ke Repository.
    *   Mengirim notifikasi atau event.
*   **Isi Utama**:
    *   **Services**: Kelas yang mengelola alur kerja (contoh: `AssetService`, `LoanService`).
    *   **DTOs (Data Transfer Objects)**: Struktur data sederhana untuk input/output (contoh: `CreateAssetRequest`, `AssetResponse`).
*   **Contoh di Proyek**: `src/application/services/asset_service.rs` memiliki fungsi `create_asset` yang memanggil `repository.save()`.

## 3. Infrastructure Layer (Teknis & Tools)
**Lokasi**: `src/infrastructure`
Lapisan ini berisi detail teknis dan implementasi konkret dari interface yang didefinisikan di lapisan lain. Ini adalah "tukang" yang melakukan pekerjaan kotor.

*   **Tanggung Jawab**:
    *   Berbicara dengan Database (PostgreSQL/SQLx).
    *   Mengakses layanan eksternal (Email, PDF Generator, Storage).
    *   Implementasi konkret dari Repository Interface.
*   **Isi Utama**:
    *   **Repositories**: Implementasi SQL query (contoh: `PostgresAssetRepository`).
    *   **Adapters**: Wrapper untuk library pihak ketiga (contoh: `SmtpEmailService`, `GenPdfService`).
*   **Contoh di Proyek**: `src/infrastructure/repositories/asset_repository.rs` berisi query `INSERT INTO assets ...`.

## 4. API / Interface Layer (Pintu Gerbang)
**Lokasi**: `src/api`
Lapisan terluar yang berinteraksi langsung dengan pengguna atau sistem lain.

*   **Tanggung Jawab**:
    *   Menerima request HTTP (GET, POST, dll).
    *   Validasi input mentah (JSON).
    *   Memanggil Application Service.
    *   Mengembalikan response HTTP (200 OK, 400 Bad Request) dan JSON.
*   **Isi Utama**:
    *   **Routes**: Definisi URL endpoint (contoh: `/api/v1/assets`).
    *   **Handlers**: Fungsi controller yang menangani request.
    *   **Middleware**: Auth, Logging, CORS.
*   **Contoh di Proyek**: `src/api/handlers/asset_handler.rs` menerima JSON dari user lalu memanggil `asset_service.create(...)`.

---

## Matriks Perbandingan Lapisan

Berikut adalah tabel untuk memperjelas perbedaan dan hubungan antar lapisan:

| Fitur | **Domain Layer** | **Application Layer** | **Infrastructure Layer** | **API Layer** |
| :--- | :--- | :--- | :--- | :--- |
| **Fokus Utama** | Aturan & Logika Bisnis Murni | Alur Kerja (Flow) Aplikasi | Detail Teknis & External Tools | Interaksi User (HTTP/Web) |
| **Ketergantungan** | **Tidak ada** (Independen) | Bergantung pada **Domain** | Bergantung pada **Domain** & **Application** | Bergantung pada **Application** |
| **Pengetahuan** | Hanya tahu dirinya sendiri | Tahu Domain & Interface Repo | Tahu Database, File System, API External | Tahu HTTP, JSON, Web Socket |
| **Contoh Kode** | `struct Asset { ... }` | `fn approve_loan() { ... }` | `sqlx::query("SELECT...")` | `#[post("/login")]` |
| **Analogi** | **Hukum/Aturan Negara** | **Prosedur/Birokrasi** | **Infrastruktur Fisik (Jalan, Listrik)**| **Loket Pelayanan Publik** |
| **Apa yang diubah?**| Jika aturan bisnis berubah | Jika alur proses berubah | Jika database diganti (misal ke MySQL) | Jika framework web diganti |

---

## Alur Data (Flow)

Bayangkan User ingin membuat Aset baru:

1.  **API Layer** (`AssetHandler`): Menerima JSON dari frontend, cek format.
    ⬇️ *Memanggil*
2.  **Application Layer** (`AssetService`): Menerima perintah, validasi aturan bisnis ringkas.
    ⬇️ *Memanggil*
3.  **Domain Layer** (`Asset Entity`): Membuat objek Asset, pastikan status valid (misal: status awal harus "Draft").
    ⬇️ *Dikembalikan ke Service*
4.  **Application Layer** (`AssetService`): Minta Repository untuk simpan.
    ⬇️ *Memanggil Interface Repository*
5.  **Infrastructure Layer** (`PostgresAssetRepository`): Terjemahkan objek Asset jadi SQL `INSERT`, kirim ke DB.
    ⬇️ *Konfirmasi Sukses*
6.  **API Layer**: Kirim balasan `201 Created` ke User.

---

## Analogi Dunia Nyata: Restoran Modern

Bayangkan sistem ini adalah sebuah **Restoran Besar**:

### 1. API Layer = **Pelayan / Resepsionis (Front of House)**
*   **Tugas**: Menyambut tamu (Request), memberikan menu, mencatat pesanan, dan mengantar makanan ke meja (Response).
*   **Tanggung Jawab**: Mengerti bahasa pelanggan (Inggris, Indonesia, Isyarat), tapi **tidak memasak**. Mereka memastikan pesanan masuk akal (tidak pesan "Sop Batu").
*   **Interaksi**: Tamu tidak boleh langsung lari ke dapur, harus lewat Pelayan.

### 2. Application Layer = **Manager Dapur / Head Chef**
*   **Tugas**: Menerima pesanan dari pelayan, lalu meneriaki staf dapur ("Satu Nasi Goreng!"). Mengatur urutan masak (Service Workflow).
*   **Tanggung Jawab**: Memastikan semua pos bekerja sama. Cek stok bahan sebelum masak. Jika stok habis, lapor ke Pelayan.
*   **Interaksi**: Tidak memotong bawang sendiri setiap saat, tapi dia yang bertanggung jawab agar makanan jadi.

### 3. Domain Layer = **Resep Rahasia & Standar Operasional (SOP)**
*   **Tugas**: Menentukan *apa* itu "Nasi Goreng Spesial".
*   **Aturan Dasar**: Nasi goreng harus pakai nasi, kecap, dan telur. Tidak boleh pakai pasir. Ini adalah **Logika Bisnis**.
*   **Independensi**: Resep ini tetap sama, baik dimasak di kompor gas, kompor listrik, atau kayu bakar. Resep tidak peduli merk kompornya apa.

### 4. Infrastructure Layer = **Peralatan Dapur, Kulkas, & Suplier**
*   **Tugas**: Kompor (Database) untuk memanaskan. Kulkas (Cache) untuk simpan bahan. Truk Suplier (External API) yang antar sayur.
*   **Detail Teknis**: Ini adalah implementasi fisik. Head Chef (Application) bilang "Simpan daging ini", Kulkas (Infrastructure) yang melakukan pendinginan. Chef tidak perlu tahu freon jenis apa yang dipakai kulkas, asalkan dingin.

### Ringkasan Analogi

| Sistem | Restoran |
| :--- | :--- |
| **User Request** | **Pelanggan** datang lapar |
| **API Layer** | **Pelayan** catat pesanan |
| **Application Layer** | **Chef** orkestrasi tim masak |
| **Domain Layer** | **Buku Resep** standar rasa |
| **Infrastructure Layer** | **Kompor, Panci, Kulkas** |
