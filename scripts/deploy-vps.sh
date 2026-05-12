#!/bin/bash

# Deployment Script for VPS
# Usage: ./deploy-vps.sh

echo "🚀 Starting deployment to VPS..."

# 1. Pull latest changes (assuming this is run on the server)
# git pull origin main

# 2. Check for .env file
if [ ! -f .env.prod ]; then
    echo "❌ Error: .env.prod file not found!"
    echo "Please create .env.prod with the following variables:"
    echo "DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, DOMAIN_NAME"
    exit 1
fi

# 3. Load environment variables
export $(cat .env.prod | xargs)

# 4. Build and start services
echo "📦 Building and starting Docker containers..."
docker-compose -f docker-compose.prod.yml up -d --build

echo "✅ Deployment complete!"
echo "Check status with: docker-compose -f docker-compose.prod.yml ps"
