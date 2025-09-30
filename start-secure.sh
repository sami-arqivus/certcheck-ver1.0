#!/bin/bash

# Secure Docker Startup Script for CertCheck
# This script starts the Docker environment with security features enabled

set -e

echo "🔒 Starting CertCheck with Security Features"
echo "=============================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Set environment variables for security
export SECRET_KEY="your_very_long_and_secure_jwt_secret_key_here_minimum_32_characters_change_this_in_production"
export DB_PASSWORD="7622"
export CORS_ORIGINS="https://localhost,http://localhost"
export RATE_LIMIT_ENABLED="true"
export AUDIT_LOG_ENABLED="true"
export ENABLE_SECURITY_HEADERS="true"

echo "📋 Environment variables set:"
echo "   - SECRET_KEY: Set"
echo "   - DB_PASSWORD: Set"
echo "   - CORS_ORIGINS: Set"
echo "   - RATE_LIMIT_ENABLED: true"
echo "   - AUDIT_LOG_ENABLED: true"
echo "   - ENABLE_SECURITY_HEADERS: true"

# Build and start containers
echo ""
echo "🏗️  Building Docker containers..."
docker-compose build --no-cache

echo ""
echo "🚀 Starting containers..."
docker-compose up -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check if containers are running
echo ""
echo "📊 Container Status:"
docker-compose ps

# Test if services are responding
echo ""
echo "🔍 Testing service health..."

# Test PostgreSQL
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "   ✅ PostgreSQL: Ready"
else
    echo "   ❌ PostgreSQL: Not ready"
fi

# Test Login Register Service
if curl -k -s https://localhost/user/me > /dev/null 2>&1; then
    echo "   ✅ Login Register Service: Responding"
else
    echo "   ⚠️  Login Register Service: Not responding (may need more time)"
fi

echo ""
echo "🎉 CertCheck with Security Features is starting!"
echo ""
echo "📝 Next steps:"
echo "   1. Wait a few more seconds for all services to fully start"
echo "   2. Run security tests: python3 test_docker_security.py"
echo "   3. Access the application at: https://localhost"
echo ""
echo "🔒 Security features enabled:"
echo "   - Rate limiting on authentication endpoints"
echo "   - Enhanced file upload validation"
echo "   - Security headers (CSP, HSTS, etc.)"
echo "   - Password strength validation"
echo "   - SQL injection protection"
echo "   - Audit logging"
echo ""
echo "📋 To view logs:"
echo "   docker-compose logs -f login_register_user"
echo ""
echo "🛑 To stop:"
echo "   docker-compose down"
