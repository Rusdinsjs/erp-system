# 🔐 Panduan Setup GitHub Secrets untuk CI/CD Deploy

## Secrets yang WAJIB dikonfigurasi di GitHub

Buka: **GitHub Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Nilai | Keterangan |
|---|---|---|
| `VPS_HOST` | `api.sjsgroup.site` atau IP VPS | Hostname/IP VPS |
| `VPS_USERNAME` | `root` atau nama user SSH | Username untuk SSH ke VPS |
| `VPS_SSH_KEY` | Private key SSH | Isi konten file `~/.ssh/id_rsa` |
| `DB_USER` | `postgres` | Username database postgres |
| `DB_PASSWORD` | **password kamu** | Password database - HARUS KONSISTEN! |
| `DB_NAME` | `management_system` | Nama database |
| `JWT_SECRET` | **random string panjang** | Secret untuk JWT token |

## ⚠️ Penyebab Error "password authentication failed"

Error ini terjadi karena:
1. `.env` di VPS berisi password lama/berbeda dari yang dipakai postgres container
2. Postgres volume sudah ada dengan password lama, tapi env var baru diabaikan
3. Deploy script membaca `.env` yang mungkin tidak ada atau salah

## ✅ Cara Fix Sekarang (Manual di VPS)

SSH ke VPS dulu, lalu jalankan:

```bash
cd ~/management-system

# 1. Cek password yang sekarang dipakai postgres container
sudo docker exec mgmt-db psql -U postgres -c "\du"

# 2. Reset password postgres secara paksa
# Ganti 'PASSWORD_BARU' dengan password yang kamu mau pakai
sudo docker exec mgmt-db psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'PASSWORD_BARU';"

# 3. Update .env di VPS agar sinkron
nano .env
# Ubah DB_PASSWORD=PASSWORD_BARU

# 4. Restart backend
sudo docker compose restart backend

# 5. Cek log backend
sudo docker logs mgmt-backend --tail 20
```

## 🔄 Cara Kerja Deploy Baru (Setelah Fix)

Setiap kali push ke master/main:
1. `.env` di VPS **di-regenerate** dari GitHub Secrets → tidak ada mismatch lagi
2. Password postgres **di-sync paksa** sebelum backend start
3. Backend restart setelah password sync → koneksi fresh

## 📝 Catatan Penting

- **JANGAN** pernah commit file `.env` ke git
- Password di GitHub Secret dan di postgres volume **harus sama**
- Jika volume postgres pernah dibuat dengan password berbeda, jalankan fix manual di atas
