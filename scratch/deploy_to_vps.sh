#!/bin/bash

# Deploy + Verify VPS Governance Fix
# Usage: bash scratch/deploy_to_vps.sh
# Pre-condition: git push already done (changes are in remote)

VPS_USER="ubuntu"
VPS_HOST="43.134.17.13"
REMOTE_DIR="/home/ubuntu/management-system"

echo "════════════════════════════════════════════════════"
echo "  🚀 Deploy Governance Fix ke VPS (No GUI)"
echo "════════════════════════════════════════════════════"
echo ""

echo "📦 [1/6] Pull latest code di VPS..."
ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} \
  "cd ${REMOTE_DIR} && git pull origin master"

echo ""
echo "🔨 [2/6] Rebuild containers di VPS..."
ssh ${VPS_USER}@${VPS_HOST} \
  "cd ${REMOTE_DIR} && sudo docker compose -f docker-compose.prod.yml up -d --build 2>&1 | tail -20"

echo ""
echo "⏳ [3/6] Menunggu backend siap (max 60s)..."
ssh ${VPS_USER}@${VPS_HOST} "
  for i in \$(seq 1 20); do
    response=\$(sudo docker exec mgmt-backend-prod curl -s http://localhost:8080/health 2>/dev/null)
    if echo \"\$response\" | grep -q 'ok'; then
      echo '✅ Backend SIAP! ('\$i'/20)'
      break
    fi
    echo '   Menunggu... ('\$i'/20)'
    sleep 3
  done
"

echo ""
echo "✅ [4/6] Cek kesehatan API (Internal)..."
ssh ${VPS_USER}@${VPS_HOST} "sudo docker exec mgmt-backend-prod curl -s http://localhost:8080/health && echo ''"

echo ""
echo "🌱 [5/6] Seeding Operational Scenario pada DB Prod..."
ssh ${VPS_USER}@${VPS_HOST} "
  sudo docker exec -i mgmt-db-prod psql -U postgres -d management_system < ${REMOTE_DIR}/scratch/setup_operational_scenario.sql
  echo '✅ Seed selesai!'
"

echo ""
echo "🔐 [6/6] Verifikasi Login Endpoint via Nginx..."
ssh ${VPS_USER}@${VPS_HOST} "
  curl -sf -X POST http://localhost:8888/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{\"email\":\"manager@sjs.com\",\"password\":\"admin123\"}' | python3 -c \"import sys,json; d=json.load(sys.stdin); print('✅ Manager login OK! Token:', d['token'][:40]+'...')\" 2>/dev/null || echo '❌ Login gagal via Nginx - cek konfigurasi nginx'
"

echo ""
echo "════════════════════════════════════════════════════"
echo "  ✅ Deployment & Verifikasi Selesai!"
echo "════════════════════════════════════════════════════"
