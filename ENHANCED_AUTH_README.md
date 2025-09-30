# 🔐 Enhanced Authentication System for CertCheck

This enhanced authentication system provides enterprise-grade security features including token blacklisting, refresh tokens, rate limiting, and comprehensive audit logging - all using PostgreSQL as the backend.

## ✨ Features Implemented

### 1. **Token Blacklisting/Revocation** ✅
- JWT tokens can be blacklisted and revoked
- Stored in PostgreSQL `token_blacklist` table
- Automatic cleanup of expired blacklisted tokens
- Support for logout and forced token revocation

### 2. **Token Refresh System** ✅
- Secure refresh token generation and storage
- Refresh tokens are hashed before database storage
- Token rotation on refresh for enhanced security
- Automatic cleanup of expired and used tokens

### 3. **Rate Limiting** ✅
- Sliding window rate limiting using PostgreSQL
- Configurable limits per endpoint
- Different limits for users vs admins
- IP-based and user-based rate limiting
- Automatic cleanup of expired rate limit records

### 4. **Audit Logging** ✅
- Comprehensive logging of all authentication events
- JSONB storage for flexible data structure
- Configurable retention policy (default: 90 days)
- Query capabilities for security analysis
- Automatic cleanup of old audit logs

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   FastAPI App    │    │   PostgreSQL    │
│                 │    │                  │    │                 │
│ - AuthContext   │◄──►│ - TokenManager   │◄──►│ - token_blacklist│
│ - Token Storage │    │ - RateLimiter    │    │ - refresh_tokens│
│ - Auto Refresh  │    │ - AuditLogger    │    │ - rate_limits   │
└─────────────────┘    └──────────────────┘    │ - auth_audit_log│
                                               └─────────────────┘
```

## 📁 File Structure

```
certcheck-ver1.0/
├── auth/
│   ├── token_manager.py      # JWT token management
│   ├── rate_limiter.py       # Rate limiting system
│   ├── audit_logger.py       # Audit logging system
│   └── cleanup_jobs.py       # Maintenance and cleanup
├── database/
│   └── enhanced_auth_schema.sql  # Database schema
├── login_register/
│   └── enhanced_user_login_and_register.py  # Enhanced auth endpoints
├── setup_enhanced_auth.py    # Setup script
├── auth_config.env.example   # Configuration template
└── ENHANCED_AUTH_README.md   # This file
```

## 🚀 Quick Start

### 1. Run Setup Script
```bash
cd /Users/arqivus1/Desktop/Arq_CC/certcheck/certcheck-ver1.0
python setup_enhanced_auth.py
```

### 2. Configure Environment
```bash
# Copy and edit configuration
cp auth_config.env.example .env
# Edit .env with your actual values
```

### 3. Start Enhanced Authentication Service
```bash
./start_enhanced_auth.sh
```

### 4. Start Cleanup Jobs (Separate Terminal)
```bash
./start_cleanup.sh
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token expiry | 15 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token expiry | 7 |
| `AUDIT_LOG_RETENTION_DAYS` | Audit log retention | 90 |
| `ACCOUNT_LOCKOUT_ATTEMPTS` | Failed attempts before lockout | 5 |
| `ACCOUNT_LOCKOUT_DURATION_MINUTES` | Lockout duration | 15 |

### Rate Limiting Configuration

| Endpoint | Limit | Window |
|----------|-------|--------|
| `user-login` | 5 attempts | 15 minutes |
| `admin-login` | 3 attempts | 15 minutes |
| `user-register` | 3 attempts | 60 minutes |
| `forgot-password` | 3 attempts | 60 minutes |
| `refresh-token` | 10 attempts | 15 minutes |

## 📊 Database Schema

### Token Blacklist Table
```sql
CREATE TABLE token_blacklist (
    jti VARCHAR(36) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(10) NOT NULL,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    reason VARCHAR(100) DEFAULT 'logout'
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(10) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    jti VARCHAR(36) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_used BOOLEAN DEFAULT FALSE,
    last_used_at TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);
```

### Rate Limits Table
```sql
CREATE TABLE rate_limits (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    attempt_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Audit Log Table
```sql
CREATE TABLE auth_audit_log (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_type VARCHAR(10),
    action VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔌 API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/user-register` | Register new user |
| `POST` | `/user-login` | User login |
| `POST` | `/refresh-token` | Refresh access token |
| `POST` | `/logout` | Logout and revoke tokens |
| `POST` | `/forgot-password/` | Request password reset |
| `POST` | `/reset-password/` | Reset password |

### Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/cleanup-expired-tokens` | Manual cleanup |
| `GET` | `/user/me` | Get current user info |

## 🛡️ Security Features

### 1. Token Security
- **JWT with JTI**: Each token has a unique identifier for tracking
- **Token Blacklisting**: Revoked tokens are stored and checked
- **Refresh Token Rotation**: New refresh token on each refresh
- **Secure Storage**: Refresh tokens are hashed before storage

### 2. Rate Limiting
- **Sliding Window**: More accurate than fixed windows
- **Per-Endpoint Limits**: Different limits for different operations
- **IP + User Tracking**: Both IP and user-based limiting
- **Automatic Cleanup**: Expired rate limits are automatically removed

### 3. Account Security
- **Account Lockout**: Lock after failed attempts
- **Password Requirements**: Strong password validation
- **Audit Trail**: Complete logging of all activities
- **Suspicious Activity Detection**: Logging of unusual patterns

### 4. Audit Logging
- **Comprehensive Events**: All auth events are logged
- **Flexible Data**: JSONB for additional context
- **Retention Policy**: Configurable data retention
- **Query Interface**: Easy analysis of security events

## 🔍 Monitoring and Maintenance

### Cleanup Jobs
The system includes automated cleanup jobs:

- **Quick Cleanup**: Every 15 minutes (tokens, rate limits, account unlocks)
- **Full Cleanup**: Every hour (all cleanup operations)
- **Audit Cleanup**: Every 6 hours (old audit logs)

### Manual Cleanup
```bash
# Run full cleanup
python auth/cleanup_jobs.py --mode run --type full

# Run quick cleanup
python auth/cleanup_jobs.py --mode run --type quick

# Show cleanup statistics
python auth/cleanup_jobs.py --mode stats
```

### Monitoring Queries

#### Failed Login Attempts
```sql
SELECT username, COUNT(*) as attempts, MAX(created_at) as last_attempt
FROM auth_audit_log 
WHERE action = 'login_failed' 
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY username
ORDER BY attempts DESC;
```

#### Rate Limit Violations
```sql
SELECT identifier, endpoint, COUNT(*) as violations
FROM auth_audit_log 
WHERE action = 'rate_limit_exceeded'
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY identifier, endpoint
ORDER BY violations DESC;
```

#### Token Usage Statistics
```sql
SELECT 
    DATE(created_at) as date,
    COUNT(*) as tokens_created,
    COUNT(CASE WHEN is_used = TRUE THEN 1 END) as tokens_used
FROM refresh_tokens
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🚨 Security Considerations

### 1. Secret Key Management
- Use a strong, random secret key (minimum 32 characters)
- Store securely and rotate regularly
- Never commit to version control

### 2. Database Security
- Use connection pooling for production
- Implement proper access controls
- Regular backups of audit logs
- Monitor for unusual database activity

### 3. Rate Limiting
- Adjust limits based on your traffic patterns
- Monitor for abuse patterns
- Consider implementing progressive delays

### 4. Audit Logs
- Regular analysis of audit logs
- Set up alerts for suspicious activities
- Implement log retention policies
- Consider log aggregation for large deployments

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check database credentials in `.env`
   - Ensure PostgreSQL is running
   - Verify database exists

2. **Token Validation Failures**
   - Check SECRET_KEY configuration
   - Verify token hasn't expired
   - Check if token is blacklisted

3. **Rate Limit Issues**
   - Check rate limit configuration
   - Verify cleanup jobs are running
   - Monitor rate limit tables

4. **Audit Logging Issues**
   - Check database permissions
   - Verify JSONB support
   - Monitor disk space

### Debug Mode
Enable debug logging by setting:
```bash
LOG_LEVEL=DEBUG
```

## 📈 Performance Considerations

### Database Optimization
- Indexes are created for optimal query performance
- Regular VACUUM and ANALYZE operations
- Consider partitioning for large audit log tables

### Memory Usage
- Token manager uses minimal memory
- Rate limiter caches recent entries
- Audit logger batches writes when possible

### Scalability
- Stateless design allows horizontal scaling
- Database can be replicated for read scaling
- Consider Redis for high-traffic scenarios

## 🤝 Contributing

When contributing to the authentication system:

1. Follow security best practices
2. Add comprehensive tests
3. Update documentation
4. Consider backward compatibility
5. Test with different database configurations

## 📄 License

This enhanced authentication system is part of the CertCheck project and follows the same licensing terms.

---

**Need Help?** Check the troubleshooting section or create an issue in the project repository.
