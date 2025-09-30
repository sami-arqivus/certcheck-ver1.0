-- Enhanced Authentication Schema for CertCheck
-- This file contains the database schema for token management, rate limiting, and audit logging

-- =============================================
-- TOKEN BLACKLIST TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS token_blacklist (
    jti VARCHAR(36) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('user', 'admin')),
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    reason VARCHAR(100) DEFAULT 'logout'
);

-- Index for fast cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_user ON token_blacklist(user_id, user_type);

-- =============================================
-- REFRESH TOKENS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('user', 'admin')),
    token_hash VARCHAR(255) NOT NULL, -- bcrypt hashed refresh token
    jti VARCHAR(36) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_used BOOLEAN DEFAULT FALSE,
    last_used_at TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Foreign key constraints (will be added after table creation)
-- FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
-- FOREIGN KEY (user_id) REFERENCES admins(admin_id) ON DELETE CASCADE

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id, user_type, expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- =============================================
-- RATE LIMITING TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- IP address or user_id
    endpoint VARCHAR(100) NOT NULL,
    attempt_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(identifier, endpoint, window_start)
);

-- Indexes for fast rate limit checks
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at);

-- =============================================
-- AUDIT LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS auth_audit_log (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_type VARCHAR(10) CHECK (user_type IN ('user', 'admin')),
    action VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON auth_audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON auth_audit_log(action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_success ON auth_audit_log(success, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON auth_audit_log(created_at);

-- =============================================
-- UPDATE EXISTING TABLES
-- =============================================

-- Update users table to support new auth features
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

-- Update admins table to support new auth features and fix password field size
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

-- Fix admin password field size to accommodate bcrypt hashes
ALTER TABLE admins ALTER COLUMN password TYPE VARCHAR(255);

-- =============================================
-- CLEANUP FUNCTIONS
-- =============================================

-- Function to clean up expired tokens and rate limits
CREATE OR REPLACE FUNCTION cleanup_expired_auth_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Clean up expired blacklisted tokens
    DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up expired refresh tokens
    DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up expired rate limit records
    DELETE FROM rate_limits WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up old audit logs (keep last 90 days)
    DELETE FROM auth_audit_log WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Add updated_at triggers for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column to refresh_tokens if it doesn't exist
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create trigger for refresh_tokens
DROP TRIGGER IF EXISTS update_refresh_tokens_updated_at ON refresh_tokens;
CREATE TRIGGER update_refresh_tokens_updated_at
    BEFORE UPDATE ON refresh_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA AND TESTING
-- =============================================

-- Insert sample rate limit configurations (optional)
-- These can be managed through application configuration
INSERT INTO rate_limits (identifier, endpoint, attempt_count, window_start, expires_at) 
VALUES 
    ('127.0.0.1', 'user-login', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 hour'),
    ('127.0.0.1', 'admin-login', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 hour'),
    ('127.0.0.1', 'user-register', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 hour')
ON CONFLICT (identifier, endpoint, window_start) DO NOTHING;

-- =============================================
-- GRANTS AND PERMISSIONS
-- =============================================

-- Grant necessary permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON token_blacklist TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON refresh_tokens TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO your_app_user;
-- GRANT SELECT, INSERT ON auth_audit_log TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE token_blacklist_jti_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE refresh_tokens_token_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE rate_limits_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE auth_audit_log_log_id_seq TO your_app_user;
