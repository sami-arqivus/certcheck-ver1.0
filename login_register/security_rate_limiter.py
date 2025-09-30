"""
Rate Limiter for API endpoints
Implements in-memory rate limiting with configurable limits
"""
import time
from typing import Dict, Tuple
from collections import defaultdict, deque
import asyncio
from fastapi import HTTPException, Request
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    def __init__(self):
        # Store request timestamps for each IP
        self.requests: Dict[str, deque] = defaultdict(deque)
        # Cleanup old entries every 5 minutes
        self.last_cleanup = time.time()
    
    def cleanup_old_entries(self):
        """Remove old request timestamps to prevent memory leaks"""
        current_time = time.time()
        if current_time - self.last_cleanup > 300:  # 5 minutes
            cutoff_time = current_time - 3600  # Remove entries older than 1 hour
            for ip in list(self.requests.keys()):
                # Remove old timestamps
                while self.requests[ip] and self.requests[ip][0] < cutoff_time:
                    self.requests[ip].popleft()
                # Remove empty entries
                if not self.requests[ip]:
                    del self.requests[ip]
            self.last_cleanup = current_time
    
    def is_allowed(self, ip: str, max_requests: int, window_seconds: int) -> Tuple[bool, int]:
        """
        Check if request is allowed based on rate limit
        
        Args:
            ip: Client IP address
            max_requests: Maximum number of requests allowed
            window_seconds: Time window in seconds
            
        Returns:
            Tuple of (is_allowed, remaining_requests)
        """
        current_time = time.time()
        cutoff_time = current_time - window_seconds
        
        # Cleanup old entries periodically
        self.cleanup_old_entries()
        
        # Get request timestamps for this IP
        ip_requests = self.requests[ip]
        
        # Remove old timestamps outside the window
        while ip_requests and ip_requests[0] < cutoff_time:
            ip_requests.popleft()
        
        # Check if under limit
        if len(ip_requests) < max_requests:
            # Add current request timestamp
            ip_requests.append(current_time)
            remaining = max_requests - len(ip_requests)
            return True, remaining
        else:
            remaining = 0
            return False, remaining

# Global rate limiter instance
rate_limiter = RateLimiter()

def get_client_ip(request: Request) -> str:
    """Extract client IP from request"""
    # Check for forwarded headers first (for load balancers/proxies)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to direct client IP
    return request.client.host if request.client else "unknown"

def rate_limit(max_requests: int = 10, window_seconds: int = 60):
    """
    Decorator for rate limiting endpoints
    
    Args:
        max_requests: Maximum requests allowed per window
        window_seconds: Time window in seconds
    """
    def decorator(func):
        async def wrapper(request: Request = None, *args, **kwargs):
            # Extract request from kwargs or args
            if request is None:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if not request:
                # If no request found, allow the request (for non-request endpoints)
                return await func(*args, **kwargs)
            
            client_ip = get_client_ip(request)
            is_allowed, remaining = rate_limiter.is_allowed(
                client_ip, max_requests, window_seconds
            )
            
            if not is_allowed:
                logger.warning(f"Rate limit exceeded for IP: {client_ip}")
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Rate limit exceeded",
                        "message": f"Too many requests. Limit: {max_requests} per {window_seconds} seconds",
                        "retry_after": window_seconds
                    },
                    headers={"Retry-After": str(window_seconds)}
                )
            
            # Add rate limit headers to response
            response = await func(request, *args, **kwargs)
            if hasattr(response, 'headers'):
                response.headers["X-RateLimit-Limit"] = str(max_requests)
                response.headers["X-RateLimit-Remaining"] = str(remaining)
                response.headers["X-RateLimit-Reset"] = str(int(time.time()) + window_seconds)
            
            return response
        
        return wrapper
    return decorator

# Predefined rate limits for different endpoint types
LOGIN_RATE_LIMIT = rate_limit(max_requests=5, window_seconds=60)  # 5 login attempts per minute
REGISTER_RATE_LIMIT = rate_limit(max_requests=3, window_seconds=300)  # 3 registrations per 5 minutes
GENERAL_RATE_LIMIT = rate_limit(max_requests=100, window_seconds=60)  # 100 requests per minute
UPLOAD_RATE_LIMIT = rate_limit(max_requests=10, window_seconds=60)  # 10 uploads per minute
