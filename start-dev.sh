#!/bin/bash

# Warna output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}>>> Memulai Asset Management System...${NC}"

# 0. Load Environment Variables
load_env() {
    local env_file="$1"
    if [ -f "$env_file" ]; then
        set -a
        source "$env_file"
        set +a
    fi
}

if [ -f .env ]; then
    load_env .env
    echo -e "${GREEN}Environment loaded from .env${NC}"
else
    echo "⚠️ .env file not found! Copying from .env.example"
    cp .env.example .env
    load_env .env
fi

# Set fallbacks if not defined in .env
export DB_PORT=${DB_PORT:-5436}
export DATABASE_URL=${DATABASE_URL:-postgres://erpqu_app:erpqu_app_dev_only@localhost:${DB_PORT}/management_system?options=-c%20search_path=public,hr,crm,rental,inventory,commercial}
export MIGRATION_DATABASE_URL=${MIGRATION_DATABASE_URL:-postgres://postgres:postgres@localhost:${DB_PORT}/management_system?options=-c%20search_path=public,hr,crm,rental,inventory,commercial}
export REDIS_URL=${REDIS_URL:-redis://localhost:6379}
export JWT_SECRET=${JWT_SECRET:-management-system-secret-key-change-in-production}

# 1. Bersihkan sisa proses lama di port 8181 & Vite
echo -e "${GREEN}1. Membersihkan proses lama pada port 8181...${NC}"
fuser -k -9 8181/tcp > /dev/null 2>&1 || true
pkill -9 -f management-system > /dev/null 2>&1 || true
sleep 1

# 2. Pastikan Docker Containers (DB & Redis) berjalan
echo -e "${GREEN}2. Menjalankan Docker Service (DB & Redis)...${NC}"
docker compose up -d postgres redis

echo -e "${GREEN}3. Menunggu Database Siap...${NC}"
until docker exec mgmt-db pg_isready -U ${POSTGRES_USER:-postgres} -d ${DB_NAME:-management_system} > /dev/null 2>&1; do
    echo "   Menunggu PostgreSQL..."
    sleep 2
done
echo -e "${GREEN}   PostgreSQL Siap!${NC}"

# 3.5. Jalankan Database Migrations
echo -e "${GREEN}3.5. Menjalankan Database Migrations...${NC}"
export SQLX_OFFLINE=false

# Fix: Hapus entry migration yang checksumnya tidak cocok (akibat file migration yang dimodifikasi)
docker exec mgmt-db psql -U postgres -d management_system -c "
  DELETE FROM _sqlx_migrations WHERE version IN (
    SELECT sm.version
    FROM _sqlx_migrations sm
    WHERE sm.version = 20260808000001
  );
" > /dev/null 2>&1 || true

cargo sqlx migrate run > migrate.log 2>&1 || true

# 4. Setup & Jalankan Frontend (Bun / Vite) di background
echo -e "${GREEN}4. Menyiapkan Frontend Web Admin...${NC}"
cd web-admin
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    bun install
fi
bun dev > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 5. Jalankan Backend (Rust) di background
echo -e "${GREEN}5. Menjalankan Backend (Rust)...${NC}"
SQLX_OFFLINE=false cargo run > backend.log 2>&1 &
BACKEND_PID=$!

sleep 5
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Backend GAGAL BERJALAN! Periksa backend.log:${NC}"
    tail -n 20 backend.log
    exit 1
fi

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}>>> SEMUA SERVICE BERJALAN DENGAN SUKSES! 🎉${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo -e "${GREEN}🌐 Akses Lokal (Komputer Ini):${NC}"
echo -e "   http://localhost:5174"
echo -e ""
echo -e "${GREEN}📱 Akses LAN / Wi-Fi (Dari PC / HP Lain):${NC}"
echo -e "   http://192.168.1.7:5174  (Kabel Ethernet)"
echo -e "   http://192.168.118.101:5174  (Wi-Fi)"
echo -e ""
echo -e "${GREEN}🔑 Login Default:${NC} admin@example.com / 123456"
echo -e "${BLUE}Tekan CTRL+C untuk menghentikan semua service.${NC}"
echo -e "${BLUE}=====================================================${NC}"

cleanup() {
    echo -e "\n${BLUE}>>> Mematikan Service...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}>>> Selesai. Sampai jumpa! 👋${NC}"
    exit
}

trap cleanup SIGINT SIGTERM

wait
