#!/bin/bash
set -e
cd /home/rus/projects/erp-system

TOKEN=$(curl -s -X POST http://localhost:8181/api/auth/login \
  -H 'Content-Type: application/json' \
  --data-raw '{"email":"admin@example.com","password":"123456"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')

echo "Token: ${TOKEN:0:20}..."

# Test 1: Upload langsung ke backend (8181) - harusnya OK
echo ""
echo "=== Test 1: Upload langsung ke backend port 8181 ==="
curl -s -X POST http://localhost:8181/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F 'file=@/etc/hostname;type=image/png' \
  -w "\nHTTP_STATUS: %{http_code}\n"

# Test 2: Upload via Vite proxy (5174) - ini yang user pakai
echo ""
echo "=== Test 2: Upload via Vite proxy port 5174 ==="
curl -s -X POST http://localhost:5174/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F 'file=@/etc/hostname;type=image/png' \
  -w "\nHTTP_STATUS: %{http_code}\n"
