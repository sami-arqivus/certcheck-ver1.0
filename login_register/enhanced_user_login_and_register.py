"""
Enhanced Authentication System for CertCheck
Includes token blacklisting, refresh tokens, rate limiting, and audit logging
"""

from fastapi import FastAPI, Depends, HTTPException, status, Query, Request    # type: ignore
from fastapi.responses import StreamingResponse    # type: ignore
from pydantic import BaseModel, EmailStr, Field
from datetime import date
import psycopg2                                               # type: ignore
from psycopg2.extras import RealDictCursor                           # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
import re
import uvicorn                                                # type: ignore
from jose import JWTError, jwt, ExpiredSignatureError  # type: ignore
from typing import List, Optional
from passlib.context import CryptContext  # type: ignore
from datetime import datetime, timedelta
import os
import bcrypt                   # type: ignore
from dotenv import load_dotenv  # type: ignore
from contextlib import asynccontextmanager
from fastapi.security import OAuth2PasswordBearer   # type: ignore
import boto3                      # type: ignore  
from psycopg2.extensions import connection      # type: ignore
from botocore.config import Config              #type: ignore
from botocore.exceptions import ClientError     # type: ignore
from typing import Union

# Import our enhanced auth modules
import logging
import sys
import os

# Add the auth directory to the Python path
auth_path = os.path.join(os.path.dirname(__file__), 'auth')
sys.path.append(auth_path)

# Import auth modules
from token_manager import TokenManager
from rate_limiter import RateLimiter, rate_limit
from audit_logger import AuditLogger

# Import security modules (using local implementations)
from security_rate_limiter import LOGIN_RATE_LIMIT, REGISTER_RATE_LIMIT, GENERAL_RATE_LIMIT
from file_validator import validate_upload_file
from security_middleware import SecurityHeadersMiddleware, RequestLoggingMiddleware, get_secure_cors_middleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")  
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))  
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY") 
BUCKET_NAME = os.getenv("BUCKET_NAME")  

# Password hashing functions
def hash_password(password):
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password=pwd_bytes, salt=salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password, hashed_password):
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password=password_byte_enc, hashed_password=hashed_password_bytes)

def generate_presigned_url(s3_path: str, expiration: int = 3600) -> str:
    """Generate a proxy URL for an S3 object through our image endpoint"""
    try:
        # Extract bucket and key from s3://bucket/key format
        if not s3_path.startswith('s3://'):
            return s3_path
        
        path_parts = s3_path[5:].split('/', 1)  # Remove 's3://' and split
        if len(path_parts) != 2:
            return s3_path
            
        bucket_name = path_parts[0]
        object_key = path_parts[1]
        
        # Return a proxy URL that goes through our image serving endpoint
        proxy_url = f"https://localhost/api/image/{object_key}"
        return proxy_url
        
    except Exception as e:
        print(f"Error generating proxy URL for {s3_path}: {e}")
        return s3_path  # Return original URL if generation fails

def get_password_hash(password):
    return hash_password(password)

# Database connection
def connect_db():
    try:
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            cursor_factory=RealDictCursor
        )
        return conn
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Error connecting to database: {e}")

def get_db():
    conn = connect_db()
    try:
        yield conn
    finally:
        conn.close()

# Initialize auth services
def get_token_manager(conn: connection = Depends(get_db)) -> TokenManager:
    return TokenManager(conn)

def get_rate_limiter(conn: connection = Depends(get_db)) -> RateLimiter:
    return RateLimiter(conn)

def get_audit_logger(conn: connection = Depends(get_db)) -> AuditLogger:
    return AuditLogger(conn)

# Validation functions
def is_valid_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def is_valid_password(password: str) -> bool:
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[0-9]', password):
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    return True

# S3 functions
def create_s3_user_folder(user_id: int, bucket_name: str):
    try:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY)
        folder_key = f"user_{user_id}/"
        s3_client.put_object(Bucket=bucket_name, Key=folder_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating S3 folder: {str(e)}")

# Enhanced token validation
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="user/me")
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    token_manager: TokenManager = Depends(get_token_manager)
):
    print(f"🔍 get_current_user called with token: {token}")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # First try enhanced token manager
        payload = token_manager.verify_access_token(token)
        if payload:
            # Enhanced token format: sub contains user_id
            user_id_str = payload.get("sub")
            if user_id_str is None:
                print("❌ User ID is None in enhanced token")
                raise credentials_exception
        
            # Check if sub is actually a user_id (numeric) or username (email)
            try:
                user_id = int(user_id_str)
                print(f"✅ Enhanced token validation successful for user_id: {user_id}")
                # For enhanced tokens, we need to get username from database
                conn = connect_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute("SELECT username FROM users WHERE user_id = %s", (user_id,))
                    user_data = cursor.fetchone()
                    if not user_data:
                        print(f"❌ User not found for user_id: {user_id}")
                        raise credentials_exception
                    return {"username": user_data["username"]}
                finally:
                    cursor.close()
                    conn.close()
            except ValueError:
                # If user_id_str is not numeric, it's actually a username (legacy format)
                print("🔄 Enhanced token manager succeeded but sub is username, trying legacy format...")
                pass
        
        # Fallback: Try old token format (direct JWT decode)
        print("🔄 Trying legacy token format...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            print("❌ Username is None in legacy token")
            raise credentials_exception
        
        print(f"✅ Legacy token validation successful for user: {username}")
        return {"username": username}
        
    except Exception as e:
        print(f"❌ Token validation error: {e}")
        raise credentials_exception

# FastAPI app
app = FastAPI()

# CORS configuration
origins = [
    "https://54.159.160.253",
    "http://localhost:3000",
    "http://localhost:8080",
    "https://localhost",
    "http://localhost"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add security middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Pydantic models
class UserCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    username: EmailStr
    password: str = Field(..., min_length=8)
    date_of_birth: date
    recaptcha_token: Optional[str] = None

class LoginRequest(BaseModel):
    username: EmailStr
    password: str
    recaptcha_token: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    verification_status: Optional[int] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    username: str
    date_of_birth: date

class UserProfile(BaseModel):
    id: str
    firstName: str
    lastName: str
    email: str
    dateOfBirth: date
    profilePhoto: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    recaptcha_token: Optional[str] = None

class AdminResponse(BaseModel):
    admin_id: int
    first_name: str
    last_name: str
    employee_id: str
    email: str
    date_of_birth: date
    token: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class active_card(BaseModel):
    name: str
    reg_no: str
    card_type: str
    date_of_expiration: Union[str, datetime]
    scheme_name: str
    qualifications: List[str] = []

class active_cards(BaseModel):
    cards_data: List[active_card] = []

# Enhanced authentication endpoints

@app.get("/user/me", response_model=UserResponse)
async def get_user_details(
    current_user: dict = Depends(get_current_user), 
    conn: connection = Depends(get_db)
):
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_id, first_name, last_name, username, date_of_birth
            FROM users
            WHERE username = %s;
        """, (current_user["username"],))
        user_data = cursor.fetchone()
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        return user_data
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user data: {e}")
    finally:
        cursor.close()

@app.post("/user-register", response_model=TokenResponse)
async def register_user(
    user: UserCreate, 
    request: Request,
    conn: connection = Depends(get_db),
    token_manager: TokenManager = Depends(get_token_manager),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    # Check rate limit
    rate_limit_result = rate_limiter.check_rate_limit(request, "user-register")
    if not rate_limit_result["allowed"]:
        audit_logger.log_rate_limit_exceeded(
            rate_limiter._get_identifier(request), 
            "user-register", 
            request
        )
        raise HTTPException(
            status_code=429, 
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": str(rate_limit_result["retry_after"])}
        )

    # Validation
    if not all([
        user.first_name.strip(),
        user.last_name.strip(),
        user.username.strip(),
        user.password.strip()
    ]):
        audit_logger.log_failed_registration(user.username, "user", request, "missing_fields")
        raise HTTPException(status_code=400, detail="All fields are required!")

    if not is_valid_email(user.username):
        audit_logger.log_failed_registration(user.username, "user", request, "invalid_email")
        raise HTTPException(status_code=400, detail=f"Invalid username: {user.username}")

    if not is_valid_password(user.password):
        audit_logger.log_failed_registration(user.username, "user", request, "weak_password")
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character"
        )

    try:
        hashed_password = get_password_hash(user.password)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO users (first_name, last_name, username, password, date_of_birth)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING user_id, first_name, last_name, username, date_of_birth;
        """, (
            user.first_name.strip(),
            user.last_name.strip(),
            user.username.strip(),
            hashed_password.strip(), 
            user.date_of_birth
        ))
        new_user = cursor.fetchone()
        conn.commit()
        
        # Create S3 folder
        create_s3_user_folder(user_id=new_user["user_id"], bucket_name=BUCKET_NAME)
        
        # Create token pair
        tokens = token_manager.create_token_pair(
            user_id=new_user["user_id"], 
            user_type="user",
            ip_address=rate_limiter._get_identifier(request),
            user_agent=request.headers.get("User-Agent")
        )
        
        # Log successful registration
        audit_logger.log_successful_registration(
            new_user["user_id"], 
            "user", 
            request, 
            new_user["username"]
        )
        
        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            expires_in=tokens["expires_in"]
        )
        
    except psycopg2.Error as e:
        conn.rollback()
        if "duplicate key" in str(e).lower():
            audit_logger.log_failed_registration(user.username, "user", request, "user_exists")
            raise HTTPException(status_code=400, detail="User already exists!")
        audit_logger.log_failed_registration(user.username, "user", request, f"database_error: {e}")
        raise HTTPException(status_code=500, detail=f"Error registering user: {e}")
    finally:
        cursor.close()

@app.post("/user-login", response_model=TokenResponse)
async def login_user(
    user: LoginRequest, 
    request: Request,
    conn: connection = Depends(get_db),
    token_manager: TokenManager = Depends(get_token_manager),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    # Check rate limit
    rate_limit_result = rate_limiter.check_rate_limit(request, "user-login")
    if not rate_limit_result["allowed"]:
        audit_logger.log_rate_limit_exceeded(
            rate_limiter._get_identifier(request), 
            "user-login", 
            request
        )
        raise HTTPException(
            status_code=429, 
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": str(rate_limit_result["retry_after"])}
        )

    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_id, first_name, last_name, username, password, date_of_birth, 
                   failed_login_attempts, locked_until, is_active
            FROM users
            WHERE username = %s;
        """, (user.username,))
        user_data = cursor.fetchone()
        
        if not user_data:
            audit_logger.log_failed_login(user.username, "user", request, "user_not_found")
            raise HTTPException(status_code=401, detail="Invalid credentials!")
        
        # Check if account is active
        if not user_data.get("is_active", True):
            audit_logger.log_failed_login(user.username, "user", request, "account_inactive")
            raise HTTPException(status_code=401, detail="Account is inactive!")
        
        # Check if account is locked
        if user_data.get("locked_until") and datetime.utcnow() < user_data["locked_until"]:
            audit_logger.log_failed_login(user.username, "user", request, "account_locked")
            raise HTTPException(status_code=423, detail="Account temporarily locked due to too many failed attempts!")
        
        # Verify password
        if not verify_password(user.password, user_data["password"]):
            # Increment failed attempts
            new_attempts = user_data.get("failed_login_attempts", 0) + 1
            lock_until = None
            
            if new_attempts >= 5:  # Lock after 5 failed attempts
                lock_until = datetime.utcnow() + timedelta(minutes=15)
                audit_logger.log_account_locked(user_data["user_id"], "user", request, "too_many_failed_attempts")
            
            cursor.execute("""
                UPDATE users 
                SET failed_login_attempts = %s, locked_until = %s
                WHERE user_id = %s
            """, (new_attempts, lock_until, user_data["user_id"]))
            conn.commit()
            
            audit_logger.log_failed_login(user.username, "user", request, "invalid_password")
            raise HTTPException(status_code=401, detail="Invalid credentials!")
        
        # Reset failed attempts on successful login
        cursor.execute("""
            UPDATE users 
            SET failed_login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP
            WHERE user_id = %s
        """, (user_data["user_id"],))
        conn.commit()
        
        # Create token pair
        tokens = token_manager.create_token_pair(
            user_id=user_data["user_id"], 
            user_type="user",
            ip_address=rate_limiter._get_identifier(request),
            user_agent=request.headers.get("User-Agent")
        )
        
        # Get verification status
        cursor.execute("""
            SELECT status
            FROM id_verifications
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 1;
        """, (user_data["user_id"],))
        verification_row = cursor.fetchone()
        verification_status = 1 if verification_row and verification_row["status"].lower() == "approved" else 0
        
        # Log successful login
        audit_logger.log_successful_login(
            user_data["user_id"], 
            "user", 
            request, 
            user_data["username"]
        )
        
        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            expires_in=tokens["expires_in"],
            verification_status=verification_status
        )
        
    except HTTPException:
        raise
    except psycopg2.Error as e:
        audit_logger.log_failed_login(user.username, "user", request, f"database_error: {e}")
        raise HTTPException(status_code=500, detail=f"Error during login: {e}")
    finally:
        cursor.close()

@app.post("/refresh-token", response_model=TokenResponse)
async def refresh_access_token(
    request: RefreshTokenRequest,
    req: Request,
    token_manager: TokenManager = Depends(get_token_manager),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    # Check rate limit
    rate_limit_result = rate_limiter.check_rate_limit(req, "refresh-token")
    if not rate_limit_result["allowed"]:
        audit_logger.log_rate_limit_exceeded(
            rate_limiter._get_identifier(req), 
            "refresh-token", 
            req
        )
        raise HTTPException(
            status_code=429, 
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": str(rate_limit_result["retry_after"])}
        )

    try:
        # Verify refresh token
        token_data = token_manager.verify_refresh_token(request.refresh_token)
        if not token_data:
            audit_logger.log_token_refresh(0, "user", req, False)
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        # Create new token pair
        tokens = token_manager.create_token_pair(
            user_id=token_data["user_id"], 
            user_type=token_data["user_type"],
            ip_address=rate_limiter._get_identifier(req),
            user_agent=req.headers.get("User-Agent")
        )
        
        # Log successful refresh
        audit_logger.log_token_refresh(
            token_data["user_id"], 
            token_data["user_type"], 
            req, 
            True
        )
        
        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            expires_in=tokens["expires_in"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        audit_logger.log_token_refresh(0, "user", req, False)
        raise HTTPException(status_code=500, detail=f"Error refreshing token: {e}")

@app.post("/logout")
async def logout(
    current_user: dict = Depends(get_current_user),
    request: Request = None,
    token: str = Depends(oauth2_scheme),
    token_manager: TokenManager = Depends(get_token_manager),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    try:
        # Extract JTI from token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        
        if jti:
            # Blacklist the token
            token_manager.blacklist_token(
                jti=jti,
                user_id=current_user["user_id"],
                user_type="user",
                reason="logout"
            )
            
            # Log token blacklisting
            audit_logger.log_token_blacklist(
                jti=jti,
                user_id=current_user["user_id"],
                user_type="user",
                request=request,
                reason="logout"
            )
        
        # Log logout
        audit_logger.log_logout(
            current_user["user_id"], 
            "user", 
            request, 
            current_user.get("username"),
            "manual"
        )
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during logout: {e}")

# Password reset endpoints
@app.post("/forgot-password/")
async def forget_password(
    request: ForgotPasswordRequest,
    req: Request,
    conn: connection = Depends(get_db),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    # Check rate limit
    rate_limit_result = rate_limiter.check_rate_limit(req, "forgot-password")
    if not rate_limit_result["allowed"]:
        audit_logger.log_rate_limit_exceeded(
            rate_limiter._get_identifier(req), 
            "forgot-password", 
            req
        )
        raise HTTPException(
            status_code=429, 
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": str(rate_limit_result["retry_after"])}
        )

    try:
        print("Initiating password reset for:", request.email)
        email = request.email.strip()
        if not is_valid_email(email):
            audit_logger.log_password_reset_request(email, "user", req, False)
            raise HTTPException(status_code=400, detail=f"Invalid email: {email}")
        
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM users WHERE username = %s;", (email,))
        user = cursor.fetchone()
        
        if not user:
            audit_logger.log_password_reset_request(email, "user", req, False)
            raise HTTPException(status_code=404, detail="User not found")

        # Create reset token (using access token with 1 hour expiry)
        reset_token = token_manager.create_access_token(
            user_id=user["user_id"], 
            user_type="user",
            additional_claims={"purpose": "password_reset"}
        )
        
        reset_link = f"https://54.159.160.253/reset-password?token={reset_token}"
        print(f"Password reset link (send this via email): {reset_link}")
        
        # Log successful reset request
        audit_logger.log_password_reset_request(email, "user", req, True)
        
        return {"success": True, "message": "Password reset link has been sent to your email."}
        
    except HTTPException:
        raise
    except psycopg2.Error as e:
        audit_logger.log_password_reset_request(request.email, "user", req, False)
        raise HTTPException(status_code=500, detail=f"Error processing request: {e}")
    finally:
        cursor.close()

@app.post("/reset-password/")
async def reset_password(
    request: ResetPasswordRequest,
    req: Request,
    conn: connection = Depends(get_db),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    # Check rate limit
    rate_limit_result = rate_limiter.check_rate_limit(req, "reset-password")
    if not rate_limit_result["allowed"]:
        audit_logger.log_rate_limit_exceeded(
            rate_limiter._get_identifier(req), 
            "reset-password", 
            req
        )
        raise HTTPException(
            status_code=429, 
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": str(rate_limit_result["retry_after"])}
        )

    token = request.token
    new_password = request.new_password.strip()
    
    if not is_valid_password(new_password):
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character"
        )
    
    try:
        # Verify reset token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        purpose = payload.get("purpose")
        
        if username is None or purpose != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid token")

        hashed_password = get_password_hash(new_password)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE users
            SET password = %s, failed_login_attempts = 0, locked_until = NULL
            WHERE username = %s;
        """, (hashed_password, username))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        conn.commit()
        
        # Log successful password reset
        audit_logger.log_password_reset_complete(
            int(username), "user", req, True, username
        )
        
        return {"success": True, "message": "Password has been reset successfully."}
        
    except ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token has expired")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid token")
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error resetting password: {e}")
    finally:
        cursor.close()

# Cleanup endpoint for maintenance
@app.post("/cleanup-expired-tokens")
async def cleanup_expired_tokens(
    token_manager: TokenManager = Depends(get_token_manager),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    """Cleanup expired tokens and rate limits (admin endpoint)"""
    try:
        # Cleanup expired tokens
        token_cleaned = token_manager.cleanup_expired_tokens()
        
        # Cleanup expired rate limits
        rate_cleaned = rate_limiter.cleanup_expired_limits()
        
        # Cleanup old audit logs
        audit_cleaned = audit_logger.cleanup_old_logs()
        
        return {
            "message": "Cleanup completed",
            "tokens_cleaned": token_cleaned,
            "rate_limits_cleaned": rate_cleaned,
            "audit_logs_cleaned": audit_cleaned
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {e}")

# Keep existing endpoints for backward compatibility
@app.get("/user/profile/", response_model=UserProfile)
async def get_user_profile(
    current_user: dict = Depends(get_current_user), 
    conn: connection = Depends(get_db)
):
    try:
        response_res = {
            'id': '',
            'firstName': '',
            'lastName': '',
            'email': '',
            'dateOfBirth': '',
            'profilePhoto': ''
        }
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_id, first_name, last_name, username, date_of_birth
            FROM users
            WHERE username = %s;
        """, (current_user["username"],))
        user_data = cursor.fetchone()
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
            
        response_res["id"] = str(user_data["user_id"])
        response_res["firstName"] = user_data["first_name"]
        response_res["lastName"] = user_data["last_name"]
        response_res["email"] = user_data["username"]
        response_res["dateOfBirth"] = user_data["date_of_birth"]
        
        # Check for profile photo from id_verifications table
        try:
            cursor.execute("""
                SELECT realtime_photo_url 
                FROM id_verifications 
                WHERE user_id = %s AND status = 'approved'
                ORDER BY created_at DESC 
                LIMIT 1;
            """, (user_data["user_id"],))
            photo_data = cursor.fetchone()
            
            if photo_data and photo_data["realtime_photo_url"]:
                # Generate pre-signed URL for the S3 image
                response_res["profilePhoto"] = generate_presigned_url(photo_data["realtime_photo_url"])
            else:
                response_res["profilePhoto"] = None
        except Exception as e:
            print(f"Error fetching profile photo: {e}")
            response_res["profilePhoto"] = None
            
        return response_res
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user data: {e}")
    finally:
        cursor.close()

@app.get("/public/profile/{user_id}", response_model=UserProfile)
async def get_user_profile_by_id(
    user_id: str, 
    conn: connection = Depends(get_db)
):
    try:
        response_res = {
            'id': '',
            'firstName': '',
            'lastName': '',
            'email': '',
            'dateOfBirth': '',
            'profilePhoto': ''
        }
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_id, first_name, last_name, username, date_of_birth
            FROM users
            WHERE user_id = %s;
        """, (user_id,))
        user_data = cursor.fetchone()
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
            
        response_res["id"] = str(user_data["user_id"])
        response_res["firstName"] = user_data["first_name"]
        response_res["lastName"] = user_data["last_name"]
        response_res["email"] = user_data["username"]
        response_res["dateOfBirth"] = user_data["date_of_birth"]
        
        # Check for profile photo from id_verifications table
        try:
            cursor.execute("""
                SELECT realtime_photo_url 
                FROM id_verifications 
                WHERE user_id = %s AND status = 'approved'
                ORDER BY created_at DESC 
                LIMIT 1;
            """, (user_data["user_id"],))
            photo_data = cursor.fetchone()
            
            if photo_data and photo_data["realtime_photo_url"]:
                # Generate pre-signed URL for the S3 image
                response_res["profilePhoto"] = generate_presigned_url(photo_data["realtime_photo_url"])
            else:
                response_res["profilePhoto"] = None
        except Exception as e:
            print(f"Error fetching profile photo: {e}")
            response_res["profilePhoto"] = None
            
        return response_res
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user data: {e}")
    finally:
        cursor.close()

@app.get("/public/verified-cards/{user_id}", response_model=active_cards)
async def get_verified_cards(
    user_id: str, 
    conn: connection = Depends(get_db)
):
    try:
        cursor = conn.cursor()
        
        # First get the user's email from user_id
        cursor.execute("""
            SELECT username 
            FROM users 
            WHERE user_id = %s;
        """, (user_id,))
        user_data = cursor.fetchone()
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_email = user_data["username"]
        
        # Get verified cards for this user
        cursor.execute("""
            SELECT name, reg_no, card_type, date_of_expiration, scheme_name, qualifications 
            FROM active_card_details 
            WHERE user_email = %s
            ORDER BY date_of_expiration DESC;
        """, (user_email,))
        
        cards_data = cursor.fetchall()
        
        if not cards_data:
            return {"cards_data": []}
        
        # Convert to the expected format
        response = []
        for card in cards_data:
            response.append({
                "name": card["name"],
                "reg_no": card["reg_no"],
                "card_type": card["card_type"],
                "date_of_expiration": card["date_of_expiration"].isoformat() if hasattr(card["date_of_expiration"], 'isoformat') else str(card["date_of_expiration"]),
                "scheme_name": card["scheme_name"],
                "qualifications": card["qualifications"] if isinstance(card["qualifications"], list) else []
            })
        
        return {"cards_data": response}
        
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Error fetching verified cards: {e}")
    finally:
        cursor.close()

@app.post("/admin-login", response_model=AdminResponse)
async def login_admin(login: LoginRequest, conn: connection = Depends(get_db)):
    try:
        print("Initiating admin login for:", login.username)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT admin_id, first_name, last_name, employee_id, email, password, date_of_birth
            FROM admins
            WHERE email = %s;
        """, (login.username,))
        admin_data = cursor.fetchone()
        
        if not admin_data:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password using bcrypt
        if not verify_password(login.password, admin_data["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        print(f"Admin login successful for: {admin_data['email']}")
        
        # Generate JWT token for admin
        token_data = {
            "sub": admin_data["email"],  # Use email as subject
            "admin_id": admin_data["admin_id"],
            "type": "admin",
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        }
        token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
        
        return AdminResponse(
            admin_id=admin_data["admin_id"],
            first_name=admin_data["first_name"],
            last_name=admin_data["last_name"],
            employee_id=admin_data["employee_id"],
            email=admin_data["email"],
            date_of_birth=admin_data["date_of_birth"],
            token=token
        )
        
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        cursor.close()

@app.get("/admin/me", response_model=AdminResponse)
async def get_admin_me(token: str = Depends(oauth2_scheme), conn: connection = Depends(get_db)):
    try:
        # Decode JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_email: str = payload.get("sub")
        admin_id: int = payload.get("admin_id")
        
        if admin_email is None or admin_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        cursor = conn.cursor()
        cursor.execute("""
            SELECT admin_id, first_name, last_name, employee_id, email, date_of_birth
            FROM admins
            WHERE email = %s AND admin_id = %s;
        """, (admin_email, admin_id))
        admin_data = cursor.fetchone()
        
        if not admin_data:
            raise HTTPException(status_code=404, detail="Admin not found")
        
        return AdminResponse(
            admin_id=admin_data["admin_id"],
            first_name=admin_data["first_name"],
            last_name=admin_data["last_name"],
            employee_id=admin_data["employee_id"],
            email=admin_data["email"],
            date_of_birth=admin_data["date_of_birth"],
            token=token  # Return the same token
        )
        
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        cursor.close()

@app.get("/api/image/{file_key:path}")
async def serve_image(file_key: str):
    """Serve images from S3 bucket"""
    try:
        # Create S3 client
        s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        
        bucket_name = os.getenv('BUCKET_NAME', 'certcheck-users')
        
        # Get the object from S3
        response = s3_client.get_object(Bucket=bucket_name, Key=file_key)
        
        # Determine content type based on file extension
        content_type = 'image/jpeg'  # default
        if file_key.lower().endswith('.png'):
            content_type = 'image/png'
        elif file_key.lower().endswith('.gif'):
            content_type = 'image/gif'
        elif file_key.lower().endswith('.webp'):
            content_type = 'image/webp'
        
        # Return the image as a streaming response
        return StreamingResponse(
            response['Body'].iter_chunks(chunk_size=8192),
            media_type=content_type,
            headers={
                'Cache-Control': 'public, max-age=3600',
                'Content-Disposition': f'inline; filename="{file_key.split("/")[-1]}"'
            }
        )
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchKey':
            raise HTTPException(status_code=404, detail="Image not found")
        elif error_code == 'NoSuchBucket':
            raise HTTPException(status_code=400, detail="S3 bucket does not exist")
        raise HTTPException(status_code=500, detail=f"Failed to serve image: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving image: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
