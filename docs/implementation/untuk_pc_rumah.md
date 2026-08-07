FASE 2: Saat Tiba & Memulai Kerja di PC Rumah (Linux)

1. Pull Kode Terbaru di PC Rumah
Di terminal Linux PC Rumah Anda:

bash
cd ~/projects/erp-system   # Atau direktori project di Linux rumah Anda

# Ambil perubahan terbaru dari kantor

git pull origin master
2. Sinkronkan Environment (.env)
Pastikan file .env di PC Rumah sudah sesuai dengan .env.example:

bash
cp .env.example .env
3. Jalankan Skrip Otomatis (./start-dev.sh)
Skrip ./start-dev.sh yang sudah kita buat akan secara otomatis:

Memulai Docker Container PostgreSQL (mgmt-db) & Redis (mgmt-redis).
Menjalankan seluruh Database Migrations (migrations/*.sql) terbaru secara otomatis.
Menjalankan Backend Rust & Frontend Vite React.
bash
chmod +x start-dev.sh
./start-dev.sh
4. Restore Data Uji Coba (Jika Menggunakan Backup SQL)
Jika Anda membawa file erpqu_backup_latest.sql dari kantor, jalankan perintah ini di Linux rumah:

bash
docker exec -e PGPASSWORD=postgres -i mgmt-db psql -U postgres -d management_system < erpqu_backup_latest.sql
🤖 FASE 3: Tips Agar Agen Antigravity Memahami Konteks Secara Otomatis di PC Mana pun
Agar Agen Antigravity di PC Linux Rumah langsung memiliki pemahaman proyek yang sama persis seperti di Kantor:

Customizations di .agents/ Project Root: Semua instruksi khusus, aturan pengkodean (Rules), dan Skills yang kita buat disimpan di folder .agents/ di dalam direktori project. Karena folder ini masuk ke dalam Git, Agen Antigravity di PC Linux Rumah akan langsung membaca dan menerapkan aturan proyek secara otomatis!

Perintah Cepat Saat Pertama Membuka Chat di PC Rumah: Saat pertama kali membuka Antigravity di PC Rumah, Anda cukup mengetikkan pesan pembuka seperti ini:

"Bro, saya baru pindah dari PC kantor dan sudah git pull versi terbaru master. Coba cek status aplikasi dan verifikasi apakah semua service (backend Rust & frontend React) sudah berjalan dengan lancar."

Agen akan langsung mendeteksi repositori, memeriksa database, dan melanjutkan pekerjaan tepat dari titik terakhir kita berhenti di kantor! 🚀

File

HANDOVER.md
 telah berhasil dibuat dan seluruh perubahan terbaru telah di-commit serta di-push 100% ke repositori Remote Git (origin/master)! 🚀

📝 Ringkasan Yang Telah Diselesaikan & Di-Push:
Memori Proyek (docs/HANDOVER.md):
Berisi status service terakhir, daftar migrasi database (0001, 0002, 0003), ringkasan fitur baru (DocPerm RBAC, Workflow Engine, Data Import Engine), serta panduan cepat untuk Agen Antigravity di PC Rumah.
Git Synchronization:
Seluruh perubahan kode backend Rust, frontend React, file migrasi database SQL, serta dokumen pembersihan telah aman tersimpan di repositori GitHub master.
🏠 Saat Anda Membuka PC Linux Rumah Nanti:
Jalankan git pull origin master di PC Rumah.
Jalankan ./start-dev.sh.
Sapa Agen Antigravity di PC Rumah dengan kalimat:
"Bro, baca docs/HANDOVER.md dan lanjutkan pekerjaan kita dari kantor."

Agen Antigravity di PC Rumah akan langsung membaca file memori tersebut dan siap melanjutkan pekerjaan bersama Anda secara mulus! Selamat beristirahat dan sampai jumpa di PC Rumah! 👋😊
