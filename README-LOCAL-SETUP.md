# CertCheck Local Development Setup

## 🚀 Quick Start

### Prerequisites
- Docker Desktop running
- SSH access to EC2 instance
- AWS credentials

### 1. Local Development Setup

```bash
# 1. Copy environment files
cp env.local.example .env.local
cp env.production.example .env.production

# 2. Edit .env.local with your credentials
nano .env.local

# 3. Start local development
./start-local.sh
```

### 2. Production Deployment

```bash
# 1. Edit production credentials
nano .env.production

# 2. Deploy to production
./deploy-prod.sh
```

## 🔧 Manual Steps

### Local Development

1. **Start SSH tunnel to Valkey:**
```bash
ssh -i /Users/arqivus1/Desktop/Arq_CC/certcheck/Conf_det/t2-xlarge-certcheck.pem \
    -L 6379:localhost:6379 \
    -N -f \
    ubuntu@ec2-54-159-160-253.compute-1.amazonaws.com
```

2. **Start Docker services:**
```bash
docker-compose up -d
```

3. **Access applications:**
- Frontend: http://localhost:3000
- Admin: http://localhost:3001
- API: http://localhost:8080

### Production Deployment

1. **SSH to EC2:**
```bash
ssh -i /Users/arqivus1/Desktop/Arq_CC/certcheck/Conf_det/t2-xlarge-certcheck.pem \
    ubuntu@ec2-54-159-160-253.compute-1.amazonaws.com
```

2. **Clone and deploy:**
```bash
git clone <your-repo>
cd certcheck-ver1.0
cp env.production.example .env.production
# Edit .env.production
nano .env.production
./deploy-prod.sh
```

## 🛠️ Environment Variables

### Local (.env.local)
- `VITE_API_URL=http://localhost:8080`
- `CELERY_BROKER_URL=redis://localhost:6379/0`
- `WS_ENDPOINT=wss://brd-customer-hl_241b1c92-zone-cscs_bd_browser_api-country-gb:ldt9c6wx9ir8@brd.superproxy.io:9222`

### Production (.env.production)
- `VITE_API_URL=http://54.159.160.253:8080`
- `CELERY_BROKER_URL=redis://54.159.160.253:6379/0`
- `WS_ENDPOINT=wss://brd-customer-hl_241b1c92-zone-cscs_bd_browser_api-country-gb:ldt9c6wx9ir8@brd.superproxy.io:9222`

## 🔍 Troubleshooting

### SSH Tunnel Issues
```bash
# Check if tunnel is working
nc -z localhost 6379

# Kill existing tunnels
pkill -f "ssh.*6379.*ec2-54-159-160-253"
```

### Docker Issues
```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart
```

### Port Conflicts
- Frontend: 3000
- Admin: 3001
- API: 8080
- Valkey: 6379 (tunneled)
