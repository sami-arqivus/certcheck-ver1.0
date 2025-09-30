"""
Rate Limiting System for CertCheck
Implements sliding window rate limiting using PostgreSQL
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, Request
import os
from dotenv import load_dotenv

load_dotenv()

class RateLimiter:
    def __init__(self, db_connection):
        self.db_connection = db_connection
        self.default_limits = {
            "user-login": {"limit": 5, "window_minutes": 15},
            "admin-login": {"limit": 3, "window_minutes": 15},
            "user-register": {"limit": 3, "window_minutes": 60},
            "admin-register": {"limit": 2, "window_minutes": 60},
            "forgot-password": {"limit": 3, "window_minutes": 60},
            "reset-password": {"limit": 5, "window_minutes": 15},
            "refresh-token": {"limit": 10, "window_minutes": 15},
            "default": {"limit": 100, "window_minutes": 15}
        }
    
    def _get_cursor(self):
        """Get database cursor with proper error handling"""
        try:
            return self.db_connection.cursor(cursor_factory=RealDictCursor)
        except psycopg2.Error as e:
            raise Exception(f"Database connection error: {e}")
    
    def _get_identifier(self, request: Request, user_id: Optional[int] = None) -> str:
        """Get rate limiting identifier (IP or user_id)"""
        if user_id:
            return f"user_{user_id}"
        
        # Get client IP address
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP if multiple are present
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return str(request.client.host)
    
    def _get_rate_limit_config(self, endpoint: str) -> Dict[str, int]:
        """Get rate limit configuration for endpoint"""
        return self.default_limits.get(endpoint, self.default_limits["default"])
    
    def _cleanup_old_entries(self, identifier: str, endpoint: str):
        """Clean up old rate limit entries"""
        cursor = self._get_cursor()
        try:
            cursor.execute("""
                DELETE FROM rate_limits 
                WHERE identifier = %s AND endpoint = %s AND expires_at < CURRENT_TIMESTAMP
            """, (identifier, endpoint))
            self.db_connection.commit()
        except psycopg2.Error as e:
            self.db_connection.rollback()
            raise Exception(f"Failed to cleanup rate limit entries: {e}")
        finally:
            cursor.close()
    
    def check_rate_limit(self, request: Request, endpoint: str, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Check if request is within rate limit
        Returns: {
            "allowed": bool,
            "remaining": int,
            "reset_time": datetime,
            "retry_after": int (seconds)
        }
        """
        identifier = self._get_identifier(request, user_id)
        config = self._get_rate_limit_config(endpoint)
        limit = config["limit"]
        window_minutes = config["window_minutes"]
        
        cursor = self._get_cursor()
        try:
            # Clean up old entries first
            self._cleanup_old_entries(identifier, endpoint)
            
            # Get current window start time
            now = datetime.utcnow()
            window_start = now.replace(minute=(now.minute // window_minutes) * window_minutes, second=0, microsecond=0)
            expires_at = window_start + timedelta(minutes=window_minutes)
            
            # Check current attempts in this window
            cursor.execute("""
                SELECT attempt_count, window_start
                FROM rate_limits
                WHERE identifier = %s AND endpoint = %s AND window_start = %s
            """, (identifier, endpoint, window_start))
            
            current_record = cursor.fetchone()
            
            if current_record:
                # Update existing record
                current_attempts = current_record['attempt_count']
                
                if current_attempts >= limit:
                    # Rate limit exceeded
                    reset_time = current_record['window_start'] + timedelta(minutes=window_minutes)
                    retry_after = int((reset_time - now).total_seconds())
                    
                    return {
                        "allowed": False,
                        "remaining": 0,
                        "reset_time": reset_time,
                        "retry_after": max(0, retry_after)
                    }
                
                # Increment attempt count
                cursor.execute("""
                    UPDATE rate_limits 
                    SET attempt_count = attempt_count + 1, last_attempt = CURRENT_TIMESTAMP
                    WHERE identifier = %s AND endpoint = %s AND window_start = %s
                """, (identifier, endpoint, window_start))
                
                remaining = limit - current_attempts - 1
                
            else:
                # Create new record
                cursor.execute("""
                    INSERT INTO rate_limits (identifier, endpoint, attempt_count, window_start, expires_at)
                    VALUES (%s, %s, 1, %s, %s)
                """, (identifier, endpoint, window_start, expires_at))
                
                remaining = limit - 1
            
            self.db_connection.commit()
            
            return {
                "allowed": True,
                "remaining": remaining,
                "reset_time": expires_at,
                "retry_after": 0
            }
            
        except psycopg2.Error as e:
            self.db_connection.rollback()
            raise Exception(f"Failed to check rate limit: {e}")
        finally:
            cursor.close()
    
    def get_rate_limit_status(self, request: Request, endpoint: str, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Get current rate limit status without incrementing counter"""
        identifier = self._get_identifier(request, user_id)
        config = self._get_rate_limit_config(endpoint)
        limit = config["limit"]
        window_minutes = config["window_minutes"]
        
        cursor = self._get_cursor()
        try:
            now = datetime.utcnow()
            window_start = now.replace(minute=(now.minute // window_minutes) * window_minutes, second=0, microsecond=0)
            
            cursor.execute("""
                SELECT attempt_count, window_start
                FROM rate_limits
                WHERE identifier = %s AND endpoint = %s AND window_start = %s
            """, (identifier, endpoint, window_start))
            
            current_record = cursor.fetchone()
            
            if current_record:
                current_attempts = current_record['attempt_count']
                remaining = max(0, limit - current_attempts)
                reset_time = current_record['window_start'] + timedelta(minutes=window_minutes)
            else:
                current_attempts = 0
                remaining = limit
                reset_time = window_start + timedelta(minutes=window_minutes)
            
            return {
                "limit": limit,
                "remaining": remaining,
                "used": current_attempts,
                "reset_time": reset_time,
                "window_minutes": window_minutes
            }
            
        except psycopg2.Error as e:
            raise Exception(f"Failed to get rate limit status: {e}")
        finally:
            cursor.close()
    
    def reset_rate_limit(self, request: Request, endpoint: str, user_id: Optional[int] = None) -> bool:
        """Reset rate limit for identifier (admin function)"""
        identifier = self._get_identifier(request, user_id)
        
        cursor = self._get_cursor()
        try:
            cursor.execute("""
                DELETE FROM rate_limits 
                WHERE identifier = %s AND endpoint = %s
            """, (identifier, endpoint))
            
            self.db_connection.commit()
            return cursor.rowcount > 0
            
        except psycopg2.Error as e:
            self.db_connection.rollback()
            raise Exception(f"Failed to reset rate limit: {e}")
        finally:
            cursor.close()
    
    def cleanup_expired_limits(self) -> int:
        """Clean up expired rate limit entries"""
        cursor = self._get_cursor()
        try:
            cursor.execute("DELETE FROM rate_limits WHERE expires_at < CURRENT_TIMESTAMP")
            deleted_count = cursor.rowcount
            self.db_connection.commit()
            return deleted_count
        except psycopg2.Error as e:
            self.db_connection.rollback()
            raise Exception(f"Failed to cleanup expired rate limits: {e}")
        finally:
            cursor.close()

# Rate limiting decorator for FastAPI endpoints
def rate_limit(rate_limiter: RateLimiter, endpoint: str, user_id_param: str = None):
    """Decorator for rate limiting FastAPI endpoints"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract request from FastAPI dependency injection
            request = None
            user_id = None
            
            # Find request in args/kwargs
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                for key, value in kwargs.items():
                    if isinstance(value, Request):
                        request = value
                        break
            
            if not request:
                raise HTTPException(status_code=500, detail="Request object not found")
            
            # Get user_id if specified
            if user_id_param and user_id_param in kwargs:
                user_id = kwargs[user_id_param]
            
            # Check rate limit
            rate_limit_result = rate_limiter.check_rate_limit(request, endpoint, user_id)
            
            if not rate_limit_result["allowed"]:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Rate limit exceeded",
                        "retry_after": rate_limit_result["retry_after"],
                        "reset_time": rate_limit_result["reset_time"].isoformat()
                    },
                    headers={
                        "Retry-After": str(rate_limit_result["retry_after"]),
                        "X-RateLimit-Limit": str(rate_limiter._get_rate_limit_config(endpoint)["limit"]),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(rate_limit_result["reset_time"].timestamp()))
                    }
                )
            
            # Add rate limit headers to response
            if hasattr(request, 'state'):
                request.state.rate_limit_remaining = rate_limit_result["remaining"]
                request.state.rate_limit_reset = rate_limit_result["reset_time"]
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator
