"""
Audit Logging System for CertCheck
Comprehensive logging of authentication and security events
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import Request
import json
import os
from dotenv import load_dotenv

load_dotenv()

class AuditLogger:
    def __init__(self, db_connection):
        self.db_connection = db_connection
        self.retention_days = int(os.getenv("AUDIT_LOG_RETENTION_DAYS", 90))
    
    def _get_cursor(self):
        """Get database cursor with proper error handling"""
        try:
            return self.db_connection.cursor(cursor_factory=RealDictCursor)
        except psycopg2.Error as e:
            raise Exception(f"Database connection error: {e}")
    
    def _extract_client_info(self, request: Request) -> Dict[str, str]:
        """Extract client information from request"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        real_ip = request.headers.get("X-Real-IP")
        user_agent = request.headers.get("User-Agent", "")
        
        # Get client IP
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        elif real_ip:
            client_ip = real_ip
        else:
            client_ip = str(request.client.host) if request.client else "unknown"
        
        return {
            "ip_address": client_ip,
            "user_agent": user_agent,
            "host": request.headers.get("Host", ""),
            "referer": request.headers.get("Referer", ""),
            "origin": request.headers.get("Origin", "")
        }
    
    def _log_event(self, 
                   user_id: Optional[int], 
                   user_type: Optional[str], 
                   action: str, 
                   success: bool, 
                   request: Optional[Request] = None,
                   details: Optional[Dict[str, Any]] = None) -> int:
        """Log an audit event to the database"""
        cursor = self._get_cursor()
        try:
            client_info = self._extract_client_info(request) if request else {}
            
            # Prepare details JSON
            log_details = {
                "timestamp": datetime.utcnow().isoformat(),
                "client_info": client_info,
                "details": details or {}
            }
            
            cursor.execute("""
                INSERT INTO auth_audit_log (user_id, user_type, action, ip_address, user_agent, success, details)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING log_id
            """, (
                user_id,
                user_type,
                action,
                client_info.get("ip_address"),
                client_info.get("user_agent"),
                success,
                json.dumps(log_details)
            ))
            
            log_id = cursor.fetchone()['log_id']
            self.db_connection.commit()
            return log_id
            
        except psycopg2.Error as e:
            self.db_connection.rollback()
            raise Exception(f"Failed to log audit event: {e}")
        finally:
            cursor.close()
    
    # Authentication Events
    def log_login_attempt(self, username: str, user_type: str, success: bool, request: Request, 
                         user_id: Optional[int] = None, failure_reason: str = None) -> int:
        """Log login attempt"""
        details = {
            "username": username,
            "failure_reason": failure_reason
        }
        return self._log_event(user_id, user_type, "login_attempt", success, request, details)
    
    def log_successful_login(self, user_id: int, user_type: str, request: Request, 
                           username: str = None) -> int:
        """Log successful login"""
        details = {"username": username} if username else {}
        return self._log_event(user_id, user_type, "login_success", True, request, details)
    
    def log_failed_login(self, username: str, user_type: str, request: Request, 
                        reason: str = "invalid_credentials") -> int:
        """Log failed login attempt"""
        details = {
            "username": username,
            "reason": reason
        }
        return self._log_event(None, user_type, "login_failed", False, request, details)
    
    def log_logout(self, user_id: int, user_type: str, request: Request, 
                  username: str = None, logout_type: str = "manual") -> int:
        """Log logout event"""
        details = {
            "username": username,
            "logout_type": logout_type  # manual, automatic, forced
        }
        return self._log_event(user_id, user_type, "logout", True, request, details)
    
    def log_registration_attempt(self, username: str, user_type: str, success: bool, 
                               request: Request, user_id: Optional[int] = None, 
                               failure_reason: str = None) -> int:
        """Log registration attempt"""
        details = {
            "username": username,
            "failure_reason": failure_reason
        }
        return self._log_event(user_id, user_type, "registration_attempt", success, request, details)
    
    def log_successful_registration(self, user_id: int, user_type: str, request: Request, 
                                  username: str = None) -> int:
        """Log successful registration"""
        details = {"username": username} if username else {}
        return self._log_event(user_id, user_type, "registration_success", True, request, details)
    
    def log_failed_registration(self, username: str, user_type: str, request: Request, 
                              reason: str = "validation_failed") -> int:
        """Log failed registration attempt"""
        details = {
            "username": username,
            "reason": reason
        }
        return self._log_event(None, user_type, "registration_failed", False, request, details)
    
    # Password Events
    def log_password_change(self, user_id: int, user_type: str, request: Request, 
                          success: bool, username: str = None) -> int:
        """Log password change attempt"""
        details = {"username": username} if username else {}
        action = "password_change_success" if success else "password_change_failed"
        return self._log_event(user_id, user_type, action, success, request, details)
    
    def log_password_reset_request(self, username: str, user_type: str, request: Request, 
                                 success: bool) -> int:
        """Log password reset request"""
        details = {"username": username}
        action = "password_reset_request" if success else "password_reset_request_failed"
        return self._log_event(None, user_type, action, success, request, details)
    
    def log_password_reset_complete(self, user_id: int, user_type: str, request: Request, 
                                  success: bool, username: str = None) -> int:
        """Log password reset completion"""
        details = {"username": username} if username else {}
        action = "password_reset_success" if success else "password_reset_failed"
        return self._log_event(user_id, user_type, action, success, request, details)
    
    # Token Events
    def log_token_creation(self, user_id: int, user_type: str, request: Request, 
                         token_type: str = "access") -> int:
        """Log token creation"""
        details = {"token_type": token_type}
        return self._log_event(user_id, user_type, "token_created", True, request, details)
    
    def log_token_refresh(self, user_id: int, user_type: str, request: Request, 
                        success: bool) -> int:
        """Log token refresh attempt"""
        action = "token_refresh_success" if success else "token_refresh_failed"
        return self._log_event(user_id, user_type, action, success, request)
    
    def log_token_revocation(self, user_id: int, user_type: str, request: Request, 
                           reason: str = "logout") -> int:
        """Log token revocation"""
        details = {"reason": reason}
        return self._log_event(user_id, user_type, "token_revoked", True, request, details)
    
    def log_token_blacklist(self, jti: str, user_id: int, user_type: str, request: Request, 
                          reason: str = "logout") -> int:
        """Log token blacklisting"""
        details = {"jti": jti, "reason": reason}
        return self._log_event(user_id, user_type, "token_blacklisted", True, request, details)
    
    # Security Events
    def log_suspicious_activity(self, user_id: Optional[int], user_type: Optional[str], 
                              request: Request, activity_type: str, details: Dict[str, Any]) -> int:
        """Log suspicious activity"""
        log_details = {
            "activity_type": activity_type,
            "details": details
        }
        return self._log_event(user_id, user_type, "suspicious_activity", False, request, log_details)
    
    def log_rate_limit_exceeded(self, identifier: str, endpoint: str, request: Request, 
                              user_id: Optional[int] = None) -> int:
        """Log rate limit exceeded"""
        details = {
            "identifier": identifier,
            "endpoint": endpoint
        }
        return self._log_event(user_id, "user", "rate_limit_exceeded", False, request, details)
    
    def log_account_locked(self, user_id: int, user_type: str, request: Request, 
                         reason: str = "too_many_failed_attempts") -> int:
        """Log account lockout"""
        details = {"reason": reason}
        return self._log_event(user_id, user_type, "account_locked", False, request, details)
    
    def log_account_unlocked(self, user_id: int, user_type: str, request: Request, 
                           reason: str = "automatic_unlock") -> int:
        """Log account unlock"""
        details = {"reason": reason}
        return self._log_event(user_id, user_type, "account_unlocked", True, request, details)
    
    # General Events
    def log_security_event(self, user_id: Optional[int], user_type: Optional[str], 
                         action: str, success: bool, request: Request, 
                         details: Optional[Dict[str, Any]] = None) -> int:
        """Log general security event"""
        return self._log_event(user_id, user_type, action, success, request, details)
    
    # Query Methods
    def get_user_audit_logs(self, user_id: int, user_type: str, limit: int = 100, 
                          offset: int = 0) -> List[Dict[str, Any]]:
        """Get audit logs for a specific user"""
        cursor = self._get_cursor()
        try:
            cursor.execute("""
                SELECT log_id, action, ip_address, user_agent, success, details, created_at
                FROM auth_audit_log
                WHERE user_id = %s AND user_type = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """, (user_id, user_type, limit, offset))
            
            return cursor.fetchall()
            
        except psycopg2.Error as e:
            raise Exception(f"Failed to get user audit logs: {e}")
        finally:
            cursor.close()
    
    def get_failed_login_attempts(self, username: str, user_type: str, 
                                hours: int = 24) -> List[Dict[str, Any]]:
        """Get failed login attempts for a user in the last N hours"""
        cursor = self._get_cursor()
        try:
            cursor.execute("""
                SELECT log_id, ip_address, user_agent, details, created_at
                FROM auth_audit_log
                WHERE user_type = %s 
                AND action IN ('login_failed', 'login_attempt')
                AND success = FALSE
                AND details->>'username' = %s
                AND created_at > CURRENT_TIMESTAMP - INTERVAL '%s hours'
                ORDER BY created_at DESC
            """, (user_type, username, hours))
            
            return cursor.fetchall()
            
        except psycopg2.Error as e:
            raise Exception(f"Failed to get failed login attempts: {e}")
        finally:
            cursor.close()
    
    def get_suspicious_activities(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get suspicious activities in the last N hours"""
        cursor = self._get_cursor()
        try:
            cursor.execute("""
                SELECT log_id, user_id, user_type, action, ip_address, user_agent, details, created_at
                FROM auth_audit_log
                WHERE action IN ('suspicious_activity', 'rate_limit_exceeded', 'account_locked')
                AND created_at > CURRENT_TIMESTAMP - INTERVAL '%s hours'
                ORDER BY created_at DESC
            """, (hours,))
            
            return cursor.fetchall()
            
        except psycopg2.Error as e:
            raise Exception(f"Failed to get suspicious activities: {e}")
        finally:
            cursor.close()
    
    def cleanup_old_logs(self) -> int:
        """Clean up old audit logs based on retention policy"""
        cursor = self._get_cursor()
        try:
            cursor.execute("""
                DELETE FROM auth_audit_log 
                WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '%s days'
            """, (self.retention_days,))
            
            deleted_count = cursor.rowcount
            self.db_connection.commit()
            return deleted_count
            
        except psycopg2.Error as e:
            self.db_connection.rollback()
            raise Exception(f"Failed to cleanup old audit logs: {e}")
        finally:
            cursor.close()
    
    def get_audit_statistics(self, days: int = 30) -> Dict[str, Any]:
        """Get audit statistics for the last N days"""
        cursor = self._get_cursor()
        try:
            cursor.execute("""
                SELECT 
                    action,
                    success,
                    COUNT(*) as count,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(DISTINCT ip_address) as unique_ips
                FROM auth_audit_log
                WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '%s days'
                GROUP BY action, success
                ORDER BY count DESC
            """, (days,))
            
            stats = cursor.fetchall()
            
            # Get daily breakdown
            cursor.execute("""
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as total_events,
                    COUNT(CASE WHEN success = TRUE THEN 1 END) as successful_events,
                    COUNT(CASE WHEN success = FALSE THEN 1 END) as failed_events
                FROM auth_audit_log
                WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '%s days'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            """, (days,))
            
            daily_stats = cursor.fetchall()
            
            return {
                "summary": stats,
                "daily_breakdown": daily_stats,
                "period_days": days
            }
            
        except psycopg2.Error as e:
            raise Exception(f"Failed to get audit statistics: {e}")
        finally:
            cursor.close()
