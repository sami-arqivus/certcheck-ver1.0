# CertCheck Production Deployment Guide

This guide provides step-by-step instructions for deploying CertCheck to your EC2 production instance.

## 🚀 Quick Start

1. **Setup Production Environment**
   ```bash
   chmod +x setup-production.sh
   ./setup-production.sh
   ```

2. **Deploy to Production**
   ```bash
   chmod +x deploy-prod.sh
   ./deploy-prod.sh
   ```

## 📋 Prerequisites

### EC2 Instance Requirements
- **OS**: Ubuntu 20.04 LTS or later
- **Instance Type**: t3.medium or larger (recommended)
- **Storage**: At least 20GB free space
- **Memory**: At least 4GB RAM

### Software Requirements
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- OpenSSL (for SSL certificate generation)

### Network Configuration
Ensure your EC2 security groups allow:
- **Port 22**: SSH access
- **Port 80**: HTTP traffic
- **Port 443**: HTTPS traffic
- **Port 8080**: Frontend application (if needed)

## 🔧 Production Configuration

### Environment Variables
The production setup includes the following key configurations:

#### Main Environment (`.env.production`)
- Database connection settings
- JWT secret keys
- AWS credentials
- Celery/Redis configuration
- Security settings

#### Frontend Environment (`frontend/certcheck-v1/.env.production`)
- API URLs pointing to production
- HTTPS configuration
- Production build settings

### SSL Configuration
- Self-signed certificates are created for testing
- For production, replace with certificates from a trusted CA

## 📁 File Structure

```
certcheck-ver1.0/
├── .env.production                    # Main production environment
├── docker-compose.prod.yml           # Production Docker Compose override
├── deploy-prod.sh                    # Production deployment script
├── setup-production.sh               # Production setup script
├── frontend/certcheck-v1/.env.production  # Frontend production config
├── login_register/env.production     # Login service production config
├── nginx/
│   ├── nginx-prod.conf.template      # Production nginx config
│   └── ssl/                          # SSL certificates
└── logs/                             # Application logs
```

## 🚀 Deployment Process

### 1. Initial Setup (First Time Only)
```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd certcheck-ver1.0

# Run production setup
./setup-production.sh
```

### 2. Deploy Application
```bash
# Deploy to production
./deploy-prod.sh
```

### 3. Verify Deployment
```bash
# Check container status
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

## 🌐 Accessing the Application

- **Main Application**: `https://54.159.160.253`
- **Admin Panel**: `https://54.159.160.253/admin/`
- **API Health Check**: `https://54.159.160.253/health`

## 🔒 Security Considerations

### SSL Certificates
- Replace self-signed certificates with proper SSL certificates
- Use Let's Encrypt or a trusted CA for production

### Environment Variables
- Update `SECRET_KEY` with a strong, unique value
- Rotate AWS credentials regularly
- Use environment-specific API keys

### Firewall Configuration
- Restrict access to necessary ports only
- Use AWS Security Groups effectively
- Consider using a VPN for admin access

## 📊 Monitoring and Maintenance

### Health Checks
```bash
# Check application health
curl -f https://54.159.160.253/health

# Check specific services
curl -f https://54.159.160.253/user/me -H "Authorization: Bearer <token>"
```

### Log Management
```bash
# View application logs
docker-compose logs -f [service_name]

# View specific service logs
docker-compose logs -f login_register_user
docker-compose logs -f backend
```

### Backup Strategy
- Regular database backups
- Application state backups
- SSL certificate backups

## 🔄 Updates and Maintenance

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and deploy
./deploy-prod.sh
```

### Scaling
- Monitor resource usage
- Scale containers as needed
- Consider load balancing for high traffic

## 🐛 Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   docker-compose logs [service_name]
   ```

2. **Database connection issues**
   - Check database credentials
   - Verify network connectivity
   - Check PostgreSQL logs

3. **SSL certificate errors**
   - Verify certificate paths
   - Check certificate validity
   - Ensure proper permissions

4. **API endpoint not responding**
   - Check nginx configuration
   - Verify service routing
   - Check service logs

### Performance Optimization
- Enable gzip compression
- Configure caching headers
- Optimize database queries
- Monitor resource usage

## 📞 Support

For issues or questions:
1. Check the application logs
2. Review this documentation
3. Check the GitHub issues
4. Contact the development team

## 🔄 Rollback Procedure

If issues occur after deployment:
```bash
# Stop current deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

# Rollback to previous version
git checkout <previous-commit>
./deploy-prod.sh
```

---

**Note**: This is a production deployment guide. Always test changes in a staging environment before deploying to production.
