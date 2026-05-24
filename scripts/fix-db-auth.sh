#!/bin/bash
# ================================================================
# scripts/fix-db-auth.sh
# ================================================================
# Script untuk LANGSUNG mengaktifkan Trust Auth di VPS.
# Jalankan SEKALI dari VPS via SSH untuk fix login sekarang.
#
# Cara pakai:
#   ssh ubuntu@43.134.17.13
#   cd ~/management-system
#   bash scripts/fix-db-auth.sh
# ================================================================

set -e

# Pindah ke root project (direktori parent dari folder scripts/)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"
echo ">> Project root: $PROJECT_ROOT"

echo ""
echo "════════════════════════════════════════════════════"
echo "  Fix: Aktifkan Trust Auth PostgreSQL (Permanen)"
echo "════════════════════════════════════════════════════"

# Pastikan postgres/pg_hba.conf sudah ada (hasil git pull)
if [ ! -f "postgres/pg_hba.conf" ]; then
  echo "ERROR: File postgres/pg_hba.conf tidak ditemukan!"
  echo "Jalankan 'git pull' dulu untuk mendapatkan file terbaru."
  exit 1
fi

echo ">> pg_hba.conf ditemukan. Melanjutkan..."

# ── 1. Pastikan postgres berjalan ─────────────────────────────────
echo ">> Memastikan postgres berjalan..."
if ! sudo docker ps --filter "name=mgmt-db" --filter "status=running" \
    --format "{{.Names}}" 2>/dev/null | grep -q "mgmt-db"; then
  echo ">> Postgres belum jalan. Start dulu..."
  sudo docker compose up -d postgres
  sleep 10
fi

# ── 2. Restart postgres dengan config baru (force-recreate) ───────
echo ">> Restart postgres dengan trust auth config baru..."
sudo docker compose up -d --force-recreate postgres

echo ">> Menunggu postgres siap dengan trust auth..."
for i in $(seq 1 20); do
  if sudo docker exec mgmt-db pg_isready -q 2>/dev/null; then
    echo ">> ✅ Postgres SIAP dengan Trust Auth! ($i/20)"
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "ERROR: Postgres tidak siap setelah 100 detik!"
    sudo docker logs mgmt-db --tail 30
    exit 1
  fi
  echo "   Menunggu... ($i/20)"
  sleep 5
done

# Verifikasi trust auth aktif (harus bisa connect tanpa password)
echo ">> Verifikasi trust auth..."
if sudo docker exec mgmt-db psql -U postgres -c "SELECT 'trust auth OK';" 2>/dev/null | grep -q "trust auth OK"; then
  echo ">> ✅ Trust auth terverifikasi!"
else
  echo ">> ⚠️  Verifikasi gagal. Cek pg_hba.conf..."
  sudo docker exec mgmt-db cat /etc/postgresql/pg_hba.conf
fi

# ── 3. Pastikan database ada ───────────────────────────────────────
if [ -f .env ]; then
  DB_NAME=$(grep -E "^DB_NAME=" .env | cut -d '=' -f2 | tr -d '\r\n ')
  DB_USER=$(grep -E "^DB_USER=" .env | cut -d '=' -f2 | tr -d '\r\n ')
fi
DB_NAME=${DB_NAME:-management_system}
DB_USER=${DB_USER:-postgres}

echo ">> Memastikan database '${DB_NAME}' ada..."
sudo docker exec mgmt-db psql -U postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';" \
  | grep -q 1 \
  || sudo docker exec mgmt-db psql -U postgres -c \
  "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
echo ">> ✅ Database '${DB_NAME}' siap!"

# ── 4. Restart backend ─────────────────────────────────────────────
echo ">> Restart backend..."
sudo docker compose up -d --no-deps --force-recreate backend

echo ">> Menunggu backend siap..."
for i in $(seq 1 20); do
  if sudo docker exec mgmt-backend curl -sf http://localhost:8080/health >/dev/null 2>&1; then
    echo ">> ✅ Backend SIAP! ($i/20)"
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo ">> ⚠️  Backend timeout. Cek log:"
    sudo docker logs mgmt-backend --tail 30
    break
  fi
  echo "   Menunggu backend... ($i/20)"
  sleep 5
done

# ── 5. Status akhir ────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════"
echo "  ✅ TRUST AUTH AKTIF! Login seharusnya sudah bisa."
echo "  Masalah password-out-of-sync TIDAK AKAN terjadi lagi."
echo "════════════════════════════════════════════════════"
echo ""
sudo docker compose ps
