#!/bin/bash

# Warna output untuk keindahan
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}>>> Memulai Asset Management System...${NC}"

# 1. Pastikan Docker Containers (DB & Redis) berjalan
echo -e "${GREEN}1. Menjalankan Docker Service (DB & Redis)...${NC}"
# Kita gunakan profile non-backend agar docker tidak menjalankan backend via container
# (karena kita mau jalankan via cargo run untuk dev)
# TAPI karena docker-compose kita sudah terlanjur bundling, kita start semua dulu -d
docker compose up -d

echo -e "${GREEN}2. Menunggu Database Siap...${NC}"
sleep 3 # Tunggu sebentar agar port binding ready

# 2. Jalankan Backend (Cargo) di background
echo -e "${GREEN}3. Menjalankan Backend (Rust)...${NC}"
# Jalankan cargo run di background & simpan PID nya
cargo run > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend running with PID: $BACKEND_PID"

# 3. Jalankan Frontend (Bun) di background
echo -e "${GREEN}4. Menjalankan Frontend Web Admin...${NC}"
cd web-admin
bun dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend running with PID: $FRONTEND_PID"
cd ..

echo -e "${BLUE}>>> SEMUA SERVICE BERJALAN! 🚀${NC}"
echo -e "Backend Logs: tail -f backend.log"
echo -e "Frontend Logs: tail -f web-admin/frontend.log"
echo -e "${BLUE}Tekan CTRL+C untuk menghentikan semua service.${NC}"

# Handler untuk mematikan semua proses saat script di-stop (CTRL+C)
cleanup() {
    echo -e "\n${BLUE}>>> Mematikan Service...${NC}"
    kill $BACKEND_PID
    kill $FRONTEND_PID
    docker compose stop
    echo -e "${GREEN}>>> Selesai. Sampai jumpa! 👋${NC}"
    exit
}

trap cleanup SIGINT

# Keep script running
wait
