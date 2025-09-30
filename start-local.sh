#!/bin/bash

# CertCheck Local Development Startup Script

echo "🚀 Starting CertCheck Local Development..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from template..."
    cp env.local.example .env.local
    echo "⚠️  Please edit .env.local with your actual credentials"
fi

# Check if frontend .env.development exists
if [ ! -f "frontend/certcheck-v1/.env.development" ]; then
    echo "📝 Creating frontend .env.development from template..."
    cp frontend/certcheck-v1/env.development.example frontend/certcheck-v1/.env.development
fi

# Start SSH tunnel to Valkey
echo "🔗 Starting SSH tunnel to Valkey..."
ssh -i /Users/arqivus1/Desktop/Arq_CC/certcheck/Conf_det/t2-xlarge-certcheck.pem \
    -L 6379:master.celery-mqb-disabled.crs459.use1.cache.amazonaws.com:6379 \
    -N -f \
    ubuntu@ec2-54-159-160-253.compute-1.amazonaws.com

# Wait a moment for tunnel to establish
sleep 3

# Check if tunnel is working
if nc -z localhost 6379; then
    echo "✅ SSH tunnel to Valkey established"
else
    echo "❌ Failed to establish SSH tunnel to Valkey"
    exit 1
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker compose up -d --build

echo "✅ Local development environment started!"
echo "🌐 Frontend: http://localhost:3000"
echo "🌐 Admin: http://localhost:3001"
echo "🌐 API: http://localhost:8080"
echo ""
echo "To stop: ./stop-local.sh"
