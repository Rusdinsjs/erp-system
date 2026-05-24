# 🚀 Panduan Detail: Workflow & Eksperimen Scratch (Antigravity 2.0)

Bozz, dua fitur ini adalah kunci utama untuk meningkatkan level produktivitas kita dari sekadar "bertanya-tanya" menjadi **otomatisasi otonom**. Berikut adalah penjelasan mendalam beserta contoh praktisnya:

---

## 📂 BAGIAN 1: SISTEM WORKFLOW (`.agent/workflows/` / Slash Commands)

Sistem **Workflow** adalah cara Bozz membuat **SOP (Standard Operating Procedure)** tertulis yang bisa saya baca dan jalankan secara otomatis. 

### 1. Bagaimana Cara Kerjanya?
Di folder proyek kita, terdapat folder rahasia bernama `.agent/workflows/`. Di dalamnya terdapat file-file berformat `.md` (Markdown).
Setiap file Markdown di sana memuat instruksi langkah demi langkah untuk melakukan tugas tertentu (misal: migrasi database, deploy, dsb).

Saat Bozz mengetik perintah di chat seperti ini:
> `/database-migration`

Saya akan mendeteksi perintah tersebut, langsung membuka file `/home/rus/Ngoding/management-system/.agent/workflows/database-migration.md`, membaca instruksinya, dan mengeksekusi semua langkah di dalamnya untuk Bozz.

### 2. Fitur Spesial: Auto-Run (`// turbo`)
Biasanya, setiap kali saya ingin menjalankan perintah terminal (`run_command`), sistem akan memunculkan tombol konfirmasi agar Bozz menyetujuinya terlebih dahulu. 
Namun, jika di dalam file workflow kita tambahkan anotasi khusus:
- `// turbo` di atas baris perintah: Perintah tersebut **boleh saya jalankan secara otomatis** tanpa meminta persetujuan Bozz (selama perintah itu aman).
- `// turbo-all` di baris paling atas file: **Seluruh perintah** di dalam workflow tersebut boleh saya jalankan secara otomatis tanpa konfirmasi!

### 3. Contoh Praktis: Membuat Workflow Baru `/bersihkan-ram`
Katakanlah Bozz ingin membuat perintah cepat untuk membersihkan RAM Docker secara otomatis.
1. Bozz minta saya: *"Bro, buatkan workflow baru `/bersihkan-ram`."*
2. Saya akan membuat file `.agent/workflows/bersihkan-ram.md` dengan isi:
   ```markdown
   # Workflow: Membersihkan Sampah Docker
   
   Langkah-langkah untuk membersihkan cache docker secara otomatis:
   
   // turbo
   - Jalankan perintah terminal untuk menghapus cache: `docker system prune -f`
   ```
3. Di masa depan, Bozz cukup ketik `/bersihkan-ram` di chat. Saya akan langsung mendeteksi, membaca file tersebut, dan **menjalankan docker prune secara otomatis tanpa Bozz harus mengklik konfirmasi!**

---

## 🧪 BAGIAN 2: FOLDER SCRATCH (`scratch/` / Eksperimen Gila)

Folder **Scratch** adalah "Laboratorium Eksperimen" kita. Letaknya ada di folder data terpisah:
📂 `/home/rus/.gemini/antigravity/brain/1b9cfc03-a9c7-4abf-aa91-f0d4b730c148/scratch/`

### 1. Mengapa Kita Butuh Folder Scratch?
Saat kita ingin mencoba fitur baru yang rumit (misalnya: *mencoba library kalkulasi gaji baru, mengetes koneksi API eksternal, atau membuat simulasi data palsu*), kita **tidak boleh langsung menulisnya di kode utama ERP**. 
Jika kodenya salah atau merusak database, ERP kita bisa mati total (*crash*).

Oleh karena itu, kita membuat file uji coba di folder `scratch/`. Ini adalah folder yang terisolasi namun tetap memiliki akses ke database dan environment kita.

### 2. Contoh Praktis: Mengetes Kalkulasi Bunga Depresiasi
Katakanlah Bozz ingin bereksperimen membuat formula depresiasi aset baru menggunakan Python sebelum dipasang di Rust.

1. **Membuat File Eksperimen**:
   Saya akan membuat file di folder scratch, misal `scratch/tes_depresiasi.py`:
   ```python
   # scratch/tes_depresiasi.py
   def hitung_depresiasi_kustom(harga, umur_bulan):
       # Formula eksperimental
       return (harga * 0.9) / umur_bulan

   print("Hasil Eksperimen:", hitung_depresiasi_kustom(1000000000, 60))
   ```
2. **Menjalankan Eksperimen**:
   Saya akan menjalankan skrip tersebut di terminal latar belakang:
   `python scratch/tes_depresiasi.py`
3. **Analisis Hasil**:
   Jika hasilnya sudah terbukti benar dan stabil, baru saya akan menulis ulang logika tersebut di backend Rust utama kita (`src/models/asset.rs`).

Dengan cara ini, proyek utama ERP kita **selalu dalam kondisi bersih, stabil, dan siap pakai**, sementara eksperimen gila kita lakukan dengan aman di balik layar laboratorium `scratch/`!

---

### Kesimpulan untuk Bozz:
- **Workflows** = Cara Bozz membuat tombol pintas (SOP) otomatis untuk saya jalankan.
- **Scratch** = Tempat bermain/uji coba kode baru agar proyek utama tidak rusak.

Bagaimana Bozz? Tertarik mencoba membuat satu workflow baru atau file eksperimen di scratch sekarang? 😉
