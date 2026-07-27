#!/bin/bash

# Warna output
GREEN='[0;32m'
BLUE='[0;34m'
RED='[0;31m'
NC='[0m' # No Color

echo -e "${BLUE}>>> Memulai Asset Management System...${NC}"

# 0. Load Environment Variables & Construct URLs
load_env() {
    local env_file="$1"
    if [ -f "$env_file" ]; then
        export $(grep -v '^#' "$env_file" | grep -v '^\s*$' | xargs)
    fi
}

if [ -f .env ]; then
    load_env .env
    export DATABASE_URL=postgres://${DB_USER:-postgres}:${DB_PASSWORD:-postgres}@localhost:${DB_PORT:-5434}/${DB_NAME:-management_system}
    export REDIS_URL=redis://localhost:${REDIS_PORT:-6382}
    export JWT_SECRET=${JWT_SECRET:-management-system-secret-key-change-in-production}
    echo -e "${GREEN}Environment loaded from .env${NC}"
else
    echo "?? .env file not found! Copying from .env.example"
    cp .env.example .env
    load_env .env
    export DATABASE_URL=postgres://${DB_USER:-postgres}:${DB_PASSWORD:-postgres}@localhost:${DB_PORT:-5434}/${DB_NAME:-management_system}
    export REDIS_URL=redis://localhost:${REDIS_PORT:-6382}
    export JWT_SECRET=${JWT_SECRET:-management-system-secret-key-change-in-production}
fi

# 1. Bersihkan sisa proses lama di port 8080 & Vite
echo -e "${GREEN}1. Membersihkan proses lama pada port 8080...${NC}"
fuser -k 8080/tcp > /dev/null 2>&1 || pkill -f management-system > /dev/null 2>&1 || true

# 2. Pastikan Docker Containers (DB & Redis) berjalan
echo -e "${GREEN}2. Menjalankan Docker Service (DB & Redis)...${NC}"
docker compose up -d postgres redis

echo -e "${GREEN}3. Menunggu Database Siap...${NC}"
until docker exec mgmt-db pg_isready -U ${DB_USER:-postgres} -d ${DB_NAME:-management_system} > /dev/null 2>&1; do
    echo "   Menunggu PostgreSQL..."
    sleep 2
done
echo -e "${GREEN}   PostgreSQL Siap!${NC}"

# 3. Setup & Jalankan Frontend (Bun) di background
echo -e "${GREEN}4. Menyiapkan Frontend Web Admin...${NC}"
cd web-admin
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    bun install
fi
bun dev > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 4. Jalankan Backend (Rust) di background
echo -e "${GREEN}5. Menjalankan Backend (Rust)...${NC}"
if [ -f "./target/debug/management-system" ]; then
    ./target/debug/management-system > backend.log 2>&1 &
else
    cargo run > backend.log 2>&1 &
fi
BACKEND_PID=$!

sleep 3
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}? Backend GAGAL BERJALAN! Periksa backend.log:${NC}"
    tail -n 20 backend.log
    exit 1
fi

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}>>> SEMUA SERVICE BERJALAN DENGAN SUKSES! ??${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo -e "${GREEN}?? Akses Lokal (Komputer Ini):${NC}"
echo -e "   http://localhost:5174"
echo -e ""
echo -e "${GREEN}?? Akses LAN / Wi-Fi (Dari PC / HP Lain):${NC}"
echo -e "   http://192.168.1.7:5174  (Kabel Ethernet)"
echo -e "   http://192.168.118.101:5174  (Wi-Fi)"
echo -e ""
echo -e "${GREEN}?? Login Default:${NC} admin@example.com / 123456"
echo -e "${BLUE}Tekan CTRL+C untuk menghentikan semua service.${NC}"
echo -e "${BLUE}=====================================================${NC}"

cleanup() {
    echo -e "
${BLUE}>>> Mematikan Service...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}>>> Selesai. Sampai jumpa! ??${NC}"
    exit
}

trap cleanup SIGINT SIGTERM

wait
