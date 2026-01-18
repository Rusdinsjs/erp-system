# Arsitektur Aplikasi & Alur Data (Studi Kasus: Fuel Module)

Dokumen ini menjelaskan secara rinci bagaimana setiap file dalam aplikasi ini saling terhubung dan bekerja sama. Aplikasi ini menggunakan **Clean Architecture** (Arsitektur Bersih) dengan pola **Layered Architecture** (Arsitektur Berlapis).

## 1. Konsep Utama: Arsitektur Berlapis

Bayangkan aplikasi ini seperti sebuah restoran:
1.  **Frontend (`FuelDashboard.tsx`)**: Adalah **Menu & Pelayan**. Tempat user melihat apa yang tersedia dan memesan (input data).
2.  **API Client (`fuel.ts`)**: Adalah **Sistem Order**. Menerjemahkan pesanan user menjadi format yang dimengerti dapur.
3.  **Routes (`fuel_routes.rs`)**: Adalah **Pintu Dapur**. Mengarahkan pesanan ke koki yang tepat (misal: pesanan dessert ke koki pastry).
4.  **Handler (`fuel_handler.rs`)**: Adalah **Kepala Koki (Head Chef)**. Menerima pesanan, mengecek kelengkapan bahan, dan menyuruh staf (Service) untuk memasak.
5.  **Service (`fuel_service.rs`)**: Adalah **Staf Masak (Line Cook)**. Melakukan proses memasak yang sebenarnya (logika bisnis, validasi, perhitungan).
6.  **Repository (`fuel_repository.rs`)**: Adalah **Petugas Gudang**. Mengambil atau menyimpan bahan (data) dari kulkas/gudang (Database).

---

## 2. Bedah File (Studi Kasus: Fuel / BBM)

Berikut adalah penjelasan mendalam untuk setiap file yang Anda tanyakan:

### A. Lapisan Frontend (Tampilan User)

#### 1. `FuelDashboard.tsx` (View / Tampilan)
*   **Fungsi**: Ini adalah halaman yang dilihat user di browser. Berisi grafik, tabel, tombol, dan form.
*   **Tugas Utama**:
    *   Menampilkan data (misal: "Sisa Kuota BBM").
    *   Menerima input user (misal: klik tombol "Request Fuel").
    *   **Tidak boleh ada logika berat di sini**. File ini hanya "bodoh" (hanya menampilkan apa yang diberikan).
*   **Implementasi**: Menggunakan React & Tailwind CSS. Ia memanggil fungsi dari `api/fuel.ts` untuk mengambil data.

#### 2. `fuel.ts` (API Client / Jembatan)
*   **Fungsi**: Jembatan penghubung antara Frontend (Browser) dengan Backend (Server).
*   **Tugas Utama**:
    *   Menyediakan fungsi-fungsi rapi seperti `listPending()`, `requestFuel()`.
    *   Melakukan HTTP Request (GET, POST, PUT) ke alamat server backend (misal: `http://localhost:8080/api/fuel/request`).
*   **Contoh flow**: Saat user klik "Submit" di Dashboard, `FuelDashboard.tsx` memanggil `fuelApi.requestFuel(...)` di file ini.

---

### B. Lapisan Backend (Server & Logika)

#### 3. `fuel_routes.rs` (Router / Penunjuk Jalan)
*   **Fungsi**: Peta jalan aplikasi backend.
*   **Tugas Utama**:
    *   Mendefinisikan URL apa saja yang tersedia.
    *   Menghubungkan URL dengan Handler yang tepat.
*   **Kode**:
    ```rust
    // Jika ada request GET ke "/api/fuel/pending",
    // panggil fungsi list_pending_fuel di handler
    .route("/api/fuel/pending", get(fuel_handler::list_pending_fuel))
    ```

#### 4. `fuel_handler.rs` (Controller / Gerbang Masuk)
*   **Fungsi**: Menerima request HTTP, membongkar paket datanya, dan memanggil Service.
*   **Tugas Utama**:
    *   **Parsing**: Mengubah data JSON dari frontend menjadi struct Rust (`CreateFuelRequest`).
    *   **Autentikasi**: Mengecek "Siapa yang request ini? (User ID)".
    *   **Delegasi**: Memanggil `fuel_service` untuk memproses data tersebut.
    *   **Response**: Mengembalikan hasil (JSON) ke frontend (misal: 200 OK atau 400 Error).
*   **Penting**: Handler tidak boleh tahu detail query SQL. Ia hanya tahu "terima request -> panggil service -> balas response".

#### 5. `fuel_service.rs` (Business Logic / Otak Aplikasi)
*   **Fungsi**: Pusat logika bisnis. Di sinilah aturan-aturan diterapkan.
*   **Tugas Utama**:
    *   **Validasi Bisnis**: "Apakah user ini boleh minta BBM?", "Apakah stok cukup?".
    *   **Logika Kompleks**: Menghitung kuota, generate kode kupon unik (`CPN-2601-XYZ`), memproses gambar.
    *   **Orkestrasi**: Jika satu proses butuh 3 langkah (simpan data -> update stok -> kirim notifikasi), Service yang mengaturnya.
*   **Keterkaitan**: Service memanggil `Repository` untuk urusan data mentah.

#### 6. `fuel_repository.rs` (Data Access / Gudang Data)
*   **Fungsi**: Satu-satunya file yang boleh bicara dengan Database (SQL).
*   **Tugas Utama**:
    *   Menjalankan query SQL murni (`SELECT * FROM fuel_requests...`, `INSERT INTO...`).
    *   Mapping data dari baris tabel database menjadi objek Rust (`FuelLog`).
*   **Prinsip**: Jika struktur tabel database berubah, hanya file ini yang perlu diedit. File lain (Service, Handler) tidak perlu tahu.

---

## 3. Alur Cerita: "Saya Mau Request BBM"

Mari kita telusuri perjalanan data saat Anda melakukan Request BBM, dari klik tombol sampai data tersimpan.

### Langkah 1: User Klik (Frontend)
1.  Di **`FuelDashboard.tsx`**, User mengisi form dan klik "Submit".
2.  File ini mengumpulkan data form (jumlah liter, foto odometer).
3.  Memanggil: `fuelApi.requestFuel(data)`.

### Langkah 2: Pengiriman Paket (API Client)
4.  **`fuel.ts`** menerima data tersebut.
5.  Melakukan request **POST** ke `http://localhost:8080/api/fuel/request` membawa data JSON.

### Langkah 3: Penunjuk Arah (Router)
6.  Request sampai di server Backend. **`fuel_routes.rs`** melihat URL `/api/fuel/request`.
7.  Router berkata: "Oh, ini urusan `fuel_handler` fungsi `request_fuel`."

### Langkah 4: Bongkar Muatan (Handler)
8.  **`fuel_handler.rs`** (fungsi `request_fuel`) berjalan.
9.  Ia mengambil JSON body dan User ID dari token login.
10. Ia memanggil: `state.fuel_service.request_fuel(...)`.

### Langkah 5: Proses Logika (Service)
11. **`fuel_service.rs`** (fungsi `request_fuel`) berjalan.
12. Ia mengecek: "Jenis request valid? (Volume/Amount)".
13. Ia membuat objek `FuelLog` baru.
14. Ia memanggil: `self.repo.create(&log)`.

### Langkah 6: Simpan ke Gudang (Repository)
15. **`fuel_repository.rs`** (fungsi `create`) berjalan.
16. Ia menjalankan perintah SQL: `INSERT INTO fuel_logs (...) VALUES (...)`.
17. Database PostgreSQL menyimpan data.
18. Repository mengembalikan data yang baru disimpan ke Service.

### Langkah 7: Perjalanan Pulang (Response)
19. **Service** menerima data sukses -> kembalikan ke Handler.
20. **Handler** membungkus data jadi JSON `{ "status": "success", "data": ... }` -> kirim ke Frontend.
21. **`fuel.ts`** menerima respon -> kembalikan ke Dashboard.
22. **`FuelDashboard.tsx`** menerima respon sukses -> Tampilkan notifikasi "Request Berhasil!" dan refresh tabel.

---

## 4. Kenapa Harus Dipisah-pisah?

Kenapa tidak jadikan satu file saja?

1.  **Kemudahan Maintenance**: Jika error di query database, Anda tahu pasti harus cek `repository`. Jika error di tampilan, cek `tsx`. Tidak perlu mencari jarum di tumpukan jerami.
2.  **Keamanan**: Frontend tidak pernah tahu password database.
3.  **Skalabilitas**: Jika tim bertambah, satu orang bisa kerjakan frontend, satu orang kerjakan backend (service), tanpa saling ganggu.
4.  **Kerapian**: Kode menjadi terstruktur, mudah dibaca, dan "Clean".
