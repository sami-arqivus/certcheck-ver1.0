"""
Enhanced Token Management System for CertCheck
Handles JWT tokens, refresh tokens, and blacklisting using PostgreSQL
"""

import uuid
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from jose import JWTError, jwt
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

class TokenManager:
    def __init__(self, db_connection):
        self.db_connection = db_connection
        self.secret_key = os.getenv("SECRET_KEY")
        self.algorithm = os.getenv("ALGORITHM", "HS256")
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))
        self.refresh_token_expire_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))
    
    def _get_cursor(self):
        """Get database cursor with proper error handling"""
        try:
            return self.db_connection.cursor(cursor_factory=RealDictCursor)
        except psycopg2.Error as e:
            raise Exception(f"Database connection error: {e}")
    
    def _hash_refresh_token(self, token: str) -> str:
        """Hash refresh token for secure storage"""
        token_bytes = token.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(token_bytes, salt)
        return hashed.decode('utf-8')
    
    def _verify_refresh_token(self, token: str, hashed_token: str) -> bool:
        """Verify refresh token against stored hash"""
        try:
            token_bytes = token.encode('utf-8')
            hashed_bytes = hashed_token.encode('utf-8')
            return bcrypt.checkpw(token_bytes, hashed_bytes)
        except Exception:
            return False
    
    def create_access_token(self, user_id: int, user_type: str, additional_claims: Dict[str, Any] = None) -> str:
        """Create a new access token with JTI for tracking"""
        jti = str(uuid.uuid4())
        now = datetime.utcnow()
        expire = now + timedelta(minutes=self.access_token_expire_minutes)
        
        payload = {
            "sub": str(user_id),
            "type": user_type,
            "token_type": "access",
            "jti": jti,
            "iat": now,
            "exp": expire
        }
        
        if additional_claims:
            payload.update(additional_claims)
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, user_id: int, user_type: str, ip_address: str = None, user_agent: str = None) -> str:
        """Create a new refresh token and store it in database"""
        jti = str(uuid.uuid4())
        now = datetime.utcnow()
        expire = now + timedelta(days=self.refresh_token_expire_days)
        
        # Generate refresh token
        refresh_token = str(uuid.uuid4()) + str(uuid.uuid4())  # 64 character token
        token_hash = self._hash_refresh_token(refresh_token)
        
        # Store in database
        cursor = self._get_cursor()
        try:
            cursor.execute("""
                INSERT INTO refresh_tokens (user_id, user_type, token_hash, jti, expires_at, ip_address, user_agent)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING token_id
            """, (user_id, user_type, token_hash, jti, expire, ip_address, user_agent))
            
            self.db_connection.commit()
            return refresh_token
            
        except psycopg2.Error as e:
            self.db_connection.rollback()
            raise Exception(f"Failed to create refresh token: {e}")
        finally:
            cursor.close()
    
    def create_token_pair(self, user_id: int, user_type: str, ip_address: str = None, user_agent: str = None) -> Dict[str, Any]:
        """Create both access and refresh tokens"""
        access_token = self.create_access_token(user_id, user_type)
        refresh_token = self.create_refresh_token(user_id, user_type, ip_address, user_agent)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire_minutes * 60
        }
    
    def verify_access_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify access token and check if it's blacklisted"""
        try:
            # Decode token
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check if token is blacklisted
            if self.is_token_blacklisted(payload.get("jti")):
                return None
            
            return payload
            
        except JWTError:
            return None
    
    def verify_refresh_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify refresh token and mark as used"""
        cursor = self._get_cursor()
        try:
            # Find token in database
            cursor.execute("""
                SELECT token_id, user_id, user_type, token_hash, jti, expires_at, is_used
                FROM refresh_tokens
                WHERE expires_at > CURRENT_TIMESTAMP AND is_used = FALSE
                ORDER BY created_at DESC
            """)
            
            tokens = cursor.fetchall()
            
            for token_record in tokens:
                if self._verify_refresh_token(token, token_record['token_hash']):
                    # Mark token as used
                    cursor.execute("""
                        UPDATE refresh_tokens 
                        SET is_used = TRUE, last_used_at = CURRENT_TIMESTAMP
                        WHERE token_id = %s
                    """, (token_record['token_id'],))
                    
                    self.db_connection.commit()
                    
                    return {
                        "user_id": token_record['user_id'],
                        "user_type": token_record['user_type'],
                        "jti": token_record['jti']
                    }
            
            return None
            
        except psycopg2.Error as e:
            self.db_connection.rollback()
            raise Exception(f"Failed to verify refresh token: {e}")
        finally:
            cursor.close()
    
    def blacklist_token(self, jti: str, user_id: int, user_type: str, reason: str = "logout") -> bool:
        """Add token to blacklist"""
        cursor = self._get_cursor()
        try:
            # Get token expiry from JWT if possible
            # For now, we'll set a default expiry
            expires_at = datetime.utcnow() + timedelta(days=1)
            
            cursor.execute("""
                INSERT INTO token_blacklist (jti, user_id, user_type, expires_at, reason)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (jti) DO NOTHING
            """, (jti, user_id, user_type, expires_at, reason))
            
            self.db_connection.commit()
            return cursor.rowcount > 0
            
        except psycopg2.Error as e:
            self.db_connection.rollback()
            raise Exception(f"Failed to blacklist token: {e}")
        finally:
            cursor.close()
    
    def is_token_blacklisted(self, jti: str) -> bool:
        """Check if token is blacklisted"""
        cursor = self._get_cursor()
        try:
            cursor.execute("""
                SELECT 1 FROM token_blacklist 
                WHERE jti = %s AND expires_at > CURRENT_TIMESTAMP
            """, (jti,))
            
            return cursor.fetchone() is not None
            
        except psycopg2.Error as e:
            raise Exception(f"Failed to check token blacklist: {e}")
        finally:
            cursor.close()
    
    def revoke_user_tokens(self, user_id: int, user_type: str) -> int:
        """Revoke all tokens for a specific user"""
        cursor = self._get_cursor()
        try:
            # Mark all refresh tokens as used
            cursor.execute("""
                UPDATE refresh_tokens 
                SET is_used = TRUE, last_used_at = CURRENT_TIMESTAMP
                WHERE user_id = %s AND user_type = %s AND is_used = FALSE
            """, (user_id, user_type))
            
            revoked_count = cursor.rowcount
            
            # Add all active refresh tokens to blacklist
            cursor.execute("""
                INSERT INTO token_blacklist (jti, user_id, user_type, expires_at, reason)
                SELECT jti, user_id, user_type, expires_at, 'user_revocation'
                FROM refresh_tokens
                WHERE user_id = %s AND user_type = %s AND is_used = FALSE
                ON CONFLICT (jti) DO NOTHING
            """, (user_id, user_type))
            
            self.db_connection.commit()
            return revoked_count
            
        except psycopg2.Error as e:
            self.db_connection.rollback()
            raise Exception(f"Failed to revoke user tokens: {e}")
        finally:
            cursor.close()
    
    def cleanup_expired_tokens(self) -> int:
        """Clean up expired tokens and blacklisted tokens"""
        cursor = self._get_cursor()
        try:
            # Clean up expired refresh tokens
            cursor.execute("DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP")
            refresh_cleaned = cursor.rowcount
            
            # Clean up expired blacklisted tokens
            cursor.execute("DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP")
            blacklist_cleaned = cursor.rowcount
            
            self.db_connection.commit()
            return refresh_cleaned + blacklist_cleaned
            
        except psycopg2.Error as e:
            self.db_connection.rollback()
            raise Exception(f"Failed to cleanup expired tokens: {e}")
        finally:
            cursor.close()
    
    def get_user_active_tokens(self, user_id: int, user_type: str) -> list:
        """Get all active tokens for a user (for admin purposes)"""
        cursor = self._get_cursor()
        try:
            cursor.execute("""
                SELECT token_id, jti, created_at, last_used_at, ip_address, user_agent
                FROM refresh_tokens
                WHERE user_id = %s AND user_type = %s AND expires_at > CURRENT_TIMESTAMP
                ORDER BY created_at DESC
            """, (user_id, user_type))
            
            return cursor.fetchall()
            
        except psycopg2.Error as e:
            raise Exception(f"Failed to get user tokens: {e}")
        finally:
            cursor.close()
