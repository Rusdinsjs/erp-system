#!/bin/bash

# Warna output untuk keindahan
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}>>> Memulai Asset Management System...${NC}"

# Function to load env vars ignoring comments and empty lines
load_env() {
    local env_file="$1"
    if [ -f "$env_file" ]; then
        export $(grep -v '^#' "$env_file" | grep -v '^\s*$' | xargs)
    fi
}

# 0. Load Environment Variables & Construct URLs
if [ -f .env ]; then
    load_env .env
    # Construct URLs for local cargo run
    export DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}
    export REDIS_URL=redis://localhost:${REDIS_PORT}
    
    echo -e "${GREEN}Environment loaded from .env${NC}"
    echo "DB Port: ${DB_PORT}"
    echo "Redis Port: ${REDIS_PORT}"
else
    echo "⚠️ .env file not found! Copying from .env.example"
    cp .env.example .env
    load_env .env
    export DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}
    export REDIS_URL=redis://localhost:${REDIS_PORT}
fi

# 1. Pastikan Docker Containers (DB & Redis) berjalan
echo -e "${GREEN}1. Menjalankan Docker Service (DB & Redis)...${NC}"
# Hanya jalankan postgres dan redis, jangan build backend/frontend
# Kita paksa recreate container jika ada isu port
docker compose up -d postgres redis

echo -e "${GREEN}2. Menunggu Database Siap...${NC}"
sleep 5 # Tunggu sebentar agar port binding ready

# 2. Setup & Jalankan Frontend (Bun) di background
echo -e "${GREEN}3. Menyiapkan Frontend Web Admin...${NC}"
cd web-admin
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    bun install
fi
echo "Starting Frontend..."
bun dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend running with PID: $FRONTEND_PID"
cd ..

# 3. Jalankan Backend (Cargo) di background
echo -e "${GREEN}4. Menjalankan Backend (Rust)...${NC}"
# Jalankan cargo run di background & simpan PID nya
cargo run > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend running with PID: $BACKEND_PID"

echo -e "${BLUE}>>> SEMUA SERVICE BERJALAN! 🚀${NC}"
echo -e "${GREEN}Frontend URL: http://localhost:5173 (or 5174)${NC}"
echo -e "${GREEN}Backend URL:  http://localhost:8080${NC}"
echo -e "Backend Logs: tail -f backend.log"
echo -e "Frontend Logs: tail -f web-admin/frontend.log"
echo -e "${BLUE}Tekan CTRL+C untuk menghentikan semua service.${NC}"

# Handler untuk mematikan semua proses saat script di-stop (CTRL+C)
cleanup() {
    echo -e "\n${BLUE}>>> Mematikan Service...${NC}"
    kill $BACKEND_PID
    kill $FRONTEND_PID
    # Optional: Stop docker containers if you want a clean slate
    # docker compose stop postgres redis
    echo -e "${GREEN}>>> Selesai. Sampai jumpa! 👋${NC}"
    exit
}

trap cleanup SIGINT

# Keep script running
wait
