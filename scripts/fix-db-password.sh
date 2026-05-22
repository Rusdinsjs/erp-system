#!/bin/bash
# ============================================================
# fix-db-password.sh
# Jalankan di VPS untuk reset password postgres secara paksa.
# Tidak perlu tahu password lama — pakai Unix socket peer auth.
# ============================================================

set -e
# Pindah ke root project (direktori parent dari folder scripts/)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"
echo ">> Project root: $PROJECT_ROOT"

echo ""
echo "══════════════════════════════════════════════════"
echo "  Fix: Sinkronisasi Password PostgreSQL"
echo "══════════════════════════════════════════════════"

# Baca password target dari .env
if [ ! -f .env ]; then
  echo "ERROR: File .env tidak ditemukan!"
  exit 1
fi

DB_USER=$(grep -E "^DB_USER=" .env | cut -d '=' -f2 | tr -d '\r\n')
DB_PASS=$(grep -E "^DB_PASSWORD=" .env | cut -d '=' -f2 | tr -d '\r\n')
DB_NAME=$(grep -E "^DB_NAME=" .env | cut -d '=' -f2 | tr -d '\r\n')
DB_USER=${DB_USER:-postgres}
DB_PASS=${DB_PASS:-postgres}
DB_NAME=${DB_NAME:-management_system}

echo ">> Target: DB_USER=${DB_USER}, DB_NAME=${DB_NAME}"
echo ""

# Pastikan postgres container jalan
if ! sudo docker ps --filter "name=mgmt-db" --filter "status=running" \
    --format "{{.Names}}" | grep -q "mgmt-db"; then
  echo ">> Postgres tidak jalan, start dulu..."
  sudo docker compose up -d postgres
  echo ">> Menunggu postgres siap..."
  sleep 15
fi

# Tunggu postgres benar-benar siap
for i in $(seq 1 12); do
  if sudo docker exec mgmt-db su -c "pg_isready -q" postgres 2>/dev/null; then
    echo ">> Postgres siap!"
    break
  fi
  echo "   Menunggu postgres... ($i/12)"
  sleep 5
done

# ── SINKRONISASI PASSWORD (via Unix socket, tidak butuh password lama) ──
echo ""
echo ">> Mereset password via Unix socket (peer auth)..."
sudo docker exec mgmt-db su -c \
  "psql -U postgres -c \"ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';\"" \
  postgres
echo ">> ✅ Password berhasil direset!"

# Pastikan database ada
echo ">> Memastikan database ${DB_NAME} ada..."
sudo docker exec mgmt-db su -c "
  psql -U postgres -tc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';\" \
  | grep -q 1 \
  || psql -U postgres -c \"CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};\"
" postgres
echo ">> ✅ Database ${DB_NAME} siap!"

# Restart backend
echo ""
echo ">> Restart backend..."
sudo docker compose restart backend

# Tunggu backend
echo ">> Menunggu backend siap..."
for i in $(seq 1 12); do
  if sudo docker exec mgmt-backend curl -sf http://localhost:8080/health >/dev/null 2>&1; then
    echo ">> ✅ Backend SIAP!"
    break
  fi
  if [ "$i" -eq 12 ]; then
    echo "⚠️  Backend tidak merespons, cek log:"
    sudo docker logs mgmt-backend --tail 30
  fi
  echo "   Menunggu backend... ($i/12)"
  sleep 5
done

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅ FIX SELESAI! Coba login kembali."
echo "══════════════════════════════════════════════════"
sudo docker compose ps
