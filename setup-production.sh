#!/bin/bash

# CertCheck Production Setup Script
# This script sets up the production environment

set -e  # Exit on any error

echo "🔧 Setting up CertCheck for Production..."

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p nginx/ssl

# Make scripts executable
echo "🔐 Making scripts executable..."
chmod +x deploy-prod.sh
chmod +x setup-production.sh

# Create production environment files if they don't exist
echo "📝 Creating production environment files..."

# Main production env file
if [ ! -f ".env.production" ]; then
    echo "Creating .env.production..."
    cat > .env.production << EOF
# Production Environment Configuration for CertCheck
NODE_ENV=production
APP_ENV=production

# Database Configuration
DB_HOST=postgres_container
DB_PORT=5432
DB_NAME=certcheck
DB_USER=postgres
DB_PASSWORD=7622

# JWT Configuration
SECRET_KEY=9c4c7744ba5d678ce17862a8b38cf0ee6fe77b96a3508462a7c96de9f066bbed
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# AWS Configuration
AWS_ACCESS_KEY=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-1
BUCKET_NAME=certcheck-users

# Celery Configuration - Production Redis
CELERY_BROKER_URL=rediss://celery-admin:Celery_admin_12345@master.celery-mqb-disabled.crs459.use1.cache.amazonaws.com:6379/0?ssl_cert_reqs=required&ssl_ca_certs=/etc/ssl/certs/aws-global-bundle.pem&ssl_check_hostname=false
CELERY_RESULT_BACKEND=rediss://celery-admin:Celery_admin_12345@master.celery-mqb-disabled.crs459.use1.cache.amazonaws.com:6379/0?ssl_cert_reqs=required&ssl_ca_certs=/etc/ssl/certs/aws-global-bundle.pem&ssl_check_hostname=false

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
SENDGRID_API_KEY=your_sendgrid_api_key_here

# WebSocket for Playwright
WS_ENDPOINT=wss://brd-customer-hl_241b1c92-zone-cscs_bd_browser_api-country-gb:ldt9c6wx9ir8@brd.superproxy.io:9222

# Security Settings
CORS_ORIGINS=https://54.159.160.253,http://54.159.160.253
RATE_LIMIT_ENABLED=true
MAX_LOGIN_ATTEMPTS=5
LOGIN_LOCKOUT_DURATION=300

# File Upload Security
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,json
SCAN_UPLOADS_FOR_MALWARE=true

# Audit Logging
AUDIT_LOG_ENABLED=true
AUDIT_LOG_LEVEL=INFO
AUDIT_LOG_FILE=/app/logs/audit.log

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_LOGIN_ATTEMPTS_PER_MINUTE=5
RATE_LIMIT_REGISTRATION_ATTEMPTS_PER_5_MINUTES=3

# Security Headers
ENABLE_SECURITY_HEADERS=true
ENABLE_CSP=true
ENABLE_HSTS=true

# Production Settings
DEBUG=false
LOG_LEVEL=INFO
EOF
    echo "✅ Created .env.production"
else
    echo "✅ .env.production already exists"
fi

# Frontend production env file
if [ ! -f "frontend/certcheck-v1/.env.production" ]; then
    echo "Creating frontend .env.production..."
    cat > frontend/certcheck-v1/.env.production << EOF
# Production Environment Configuration for Frontend
VITE_API_URL=https://54.159.160.253
VITE_SERVER_HOST=54.159.160.253
VITE_SERVER_PORT=443
VITE_SERVER_PROTOCOL=https
VITE_APP_ENV=production
VITE_ALLOW_CLEARTEXT=false
VITE_ALLOW_MIXED_CONTENT=false
VITE_NODE_ENV=production
VITE_DEBUG=false
EOF
    echo "✅ Created frontend .env.production"
else
    echo "✅ Frontend .env.production already exists"
fi

# Create SSL certificates for testing (self-signed)
echo "🔐 Creating self-signed SSL certificates for testing..."
if [ ! -f "nginx/ssl/server.crt" ] || [ ! -f "nginx/ssl/server.key" ]; then
    mkdir -p nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/server.key \
        -out nginx/ssl/server.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=54.159.160.253"
    echo "✅ Created self-signed SSL certificates"
else
    echo "✅ SSL certificates already exist"
fi

echo ""
echo "🎉 Production setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Review and update the environment files if needed"
echo "2. Run: ./deploy-prod.sh to deploy to production"
echo "3. Configure your domain and SSL certificates for production use"
echo ""
echo "⚠️  Important notes:"
echo "- The SSL certificates are self-signed for testing only"
echo "- For production, use proper SSL certificates from a trusted CA"
echo "- Make sure your EC2 security groups are configured correctly"
echo "- Update the SECRET_KEY and other sensitive values for production"
