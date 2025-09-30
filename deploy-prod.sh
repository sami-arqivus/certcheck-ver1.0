#!/bin/bash

# CertCheck Production Deployment Script
# This script prepares and deploys the application to production

set -e  # Exit on any error

echo "🚀 Deploying CertCheck to Production..."

# Function to check if file exists and create if not
check_and_create_env() {
    local env_file=$1
    local template_file=$2
    local service_name=$3
    
    if [ ! -f "$env_file" ]; then
        echo "📝 Creating $service_name production environment file..."
        if [ -f "$template_file" ]; then
            cp "$template_file" "$env_file"
            echo "✅ Created $env_file from template"
        else
            echo "⚠️  Template file $template_file not found"
        fi
    else
        echo "✅ $service_name environment file already exists"
    fi
}

# Check and create environment files
echo "🔧 Setting up production environment files..."
check_and_create_env ".env.production" "env.production.example" "main"
check_and_create_env "frontend/certcheck-v1/.env.production" "frontend/certcheck-v1/env.production.example" "frontend"
check_and_create_env "login_register/env.production" "login_register/.env" "login_register"

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down || true

# Clean up old images (optional - uncomment if needed)
# echo "🧹 Cleaning up old Docker images..."
# docker system prune -f

# Build and deploy to production
echo "🐳 Building and deploying to production..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Health check
echo "🏥 Performing health checks..."
echo "Checking frontend..."
if curl -f -s http://localhost:8080 > /dev/null; then
    echo "✅ Frontend is responding"
else
    echo "❌ Frontend health check failed"
fi

echo "Checking API endpoints..."
if curl -f -s https://localhost/user/me -k > /dev/null; then
    echo "✅ API endpoints are responding"
else
    echo "⚠️  API endpoints may not be ready yet (this is normal during startup)"
fi

echo ""
echo "🎉 Production deployment completed!"
echo "🌐 Application URL: https://54.159.160.253"
echo "🔧 Frontend URL: http://54.159.160.253:8080"
echo ""
echo "📋 Next steps:"
echo "1. Verify all services are running: docker-compose ps"
echo "2. Check logs if needed: docker-compose logs [service_name]"
echo "3. Test the application endpoints"
echo ""
echo "📝 Important notes:"
echo "- Make sure your EC2 security groups allow traffic on ports 80, 443, and 8080"
echo "- SSL certificates should be configured in nginx for HTTPS"
echo "- Monitor the application logs for any issues"
