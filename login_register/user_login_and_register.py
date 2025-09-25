from fastapi import FastAPI, Depends, HTTPException, status, Query    # type: ignore
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
from typing import Union

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")  
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 10))  
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY") 
BUCKET_NAME = os.getenv("BUCKET_NAME")  
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password):
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password=pwd_bytes, salt=salt)
    return hashed_password.decode('utf-8')  # Convert bytes to string for database storage

def verify_password(plain_password, hashed_password):
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_bytes = hashed_password.encode('utf-8')  # Convert string back to bytes
    return bcrypt.checkpw(password=password_byte_enc, hashed_password=hashed_password_bytes)

def get_password_hash(password):
    return hash_password(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt



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

def connect_db():
    try:
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),  # Default PostgreSQL port
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


def create_s3_user_folder(user_id: int, bucket_name: str ):
    try:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY)
        # S3 folders are logical, created by uploading an empty object with a trailing slash
        folder_key = f"user_{user_id}/"
        s3_client.put_object(Bucket=bucket_name, Key=folder_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating S3 folder: {str(e)}")
    

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="user-login")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return {"username": username}

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # Startup logic
#     conn = connect_db()
#     create_users_table(conn)
#     create_admins_table(conn)
#     create_certificates_table(conn)
#     create_cert_type_table(conn)
#     create_cert_details(conn)
#     create_id_verifications_table(conn)
#     set_updated_at_trigger(conn)
#     conn.close()
#     yield
#     # Shutdown logic (optional)
#     print("Application Closed")


# lifespan=lifespan
app = FastAPI()

origins = [
    "https://54.159.160.253",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class active_card(BaseModel):
    name: str
    reg_no: str
    card_type: str
    date_of_expiration: Union[str, datetime]
    scheme_name: str
    qualifications: List[str] = []

class active_cards(BaseModel):
    cards_data: List[active_card] = []

# controller = Controller(output_model=active_cards)

class UserCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    username: EmailStr
    password: str = Field(..., min_length=8)
    date_of_birth: date
    recaptcha_token : Optional[str] = None  # Optional field for reCAPTCHA token

# class AdminCreate(BaseModel):
    # first_name: str = Field(..., min_length=1, max_length=50)
    # last_name: str = Field(..., min_length=1, max_length=50)
    # employee_id: str = Field(..., min_length=1, max_length=20)
    # username: EmailStr
    # password: str = Field(..., min_length=8)
    # date_of_birth: date

class LoginRequest(BaseModel):
    username: EmailStr
    password: str
    recaptcha_token: Optional[str] = None  # Optional field for reCAPTCHA token


class TokenResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    verification_status: Optional[int] = None  # 0 for not verified, 1 for verified

class UserResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    username: str
    date_of_birth: date

class AdminResponse(BaseModel):
    admin_id: int
    first_name: str
    last_name: str
    employee_id: str
    email: str
    date_of_birth: date
    token : str
    token_type: str = "bearer"

class AdminProfileResponse(BaseModel):
    admin_id: int
    first_name: str
    last_name: str
    employee_id: str
    email: str
    date_of_birth: date

class UserProfile(BaseModel):
    id : str
    firstName: str
    lastName: str
    email: str
    dateOfBirth: date
    profilePhoto: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    recaptcha_token: Optional[str] = None  # Optional field for reCAPTCHA token

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@app.get("/user/me", response_model=UserResponse)
async def get_user_details(current_user: dict = Depends(get_current_user), conn: connection = Depends(get_db)):
    try:
        # print("Hello from get_user_details")
        # print(conn.get_dsn_parameters())
        cursor = conn.cursor()
        # cursor.execute("SET search_path TO public;")
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

@app.get("/admin/me", response_model=AdminProfileResponse)
async def get_admin_details(current_user: dict = Depends(get_current_user), conn=Depends(get_db)):
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT admin_id, first_name, last_name, employee_id, email, date_of_birth
            FROM admins
            WHERE email = %s;
        """, (current_user["username"],))
        admin_data = cursor.fetchone()
        if not admin_data:
            raise HTTPException(status_code=404, detail="Admin not found")
        return admin_data
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Error fetching admin data: {e}")
    finally:
        cursor.close()

@app.post("/user-register", response_model=TokenResponse)
async def register_user(user: UserCreate, conn=Depends(get_db)):
    if not all([
        user.first_name.strip(),
        user.last_name.strip(),
        user.username.strip(),
        user.password.strip()
    ]):
        raise HTTPException(status_code=400, detail="All fields are required!")

    if not is_valid_email(user.username):
        raise HTTPException(status_code=400, detail=f"Invalid username: {user.username}")

    if not is_valid_password(user.password):
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
            # user.password.strip(),
            user.date_of_birth
        ))
        new_user = cursor.fetchone()
        conn.commit()
        create_s3_user_folder(user_id=new_user["user_id"], bucket_name=BUCKET_NAME)
        access_token = create_access_token(data={"sub": new_user["username"]})
        return {"token": access_token, "token_type": "bearer"}
    except psycopg2.Error as e:
        conn.rollback()
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=400, detail="User already exists!")
        raise HTTPException(status_code=500, detail=f"Error registering user: {e}")
    finally:
        cursor.close()

@app.post("/user-login", response_model=TokenResponse)
async def login_user(user: LoginRequest, conn=Depends(get_db)):
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_id, first_name, last_name, username, password, date_of_birth
            FROM users
            WHERE username = %s;
        """, (user.username,))
        user_data = cursor.fetchone()
        if not user_data or not verify_password(user.password,user_data["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials!")
        access_token = create_access_token(data={"sub": user_data["username"]})
        cursor.execute("""
            SELECT status
            FROM id_verifications
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 1;
        """, (user_data["user_id"],))
        verification_row = cursor.fetchone()
        verification_status = 1 if verification_row and verification_row["status"].lower() == "approved" else 0

        return {
            "token": access_token,
            "token_type": "bearer",
            "verification_status": verification_status
        }
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Error during login: {e}")
    finally:
        cursor.close()

@app.get("/user/profile/", response_model=UserProfile)
async def get_user_profile(current_user: dict = Depends(get_current_user), conn=Depends(get_db)):
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
            SELECT user_id,first_name, last_name, username, date_of_birth
            FROM users
            WHERE username = %s;
        """, (current_user["username"],))
        user_data = cursor.fetchone()
        response_res["id"] = str(user_data["user_id"])
        response_res["firstName"] = user_data["first_name"]
        response_res["lastName"] = user_data["last_name"]
        response_res["email"] = current_user["username"]
        response_res["dateOfBirth"] = user_data["date_of_birth"]
        user_id = user_data["user_id"]
        cursor.execute("""
            SELECT realtime_photo_url
            FROM id_verifications
            WHERE user_id = %s;
        """, (user_id,))
        photo_row =  cursor.fetchone()
        if photo_row and photo_row["realtime_photo_url"]:
            # parse bucket/key from s3://
            s3_url = photo_row["realtime_photo_url"]
            _, _, bucket_and_key = s3_url.partition("s3://")
            bucket, _, key = bucket_and_key.partition("/")

            s3_client = boto3.client(
                "s3",
                config = Config(signature_version='s3v4'),
                region_name='eu-north-1',
                aws_access_key_id=AWS_ACCESS_KEY,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            )
            presigned_url = s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=3600
            )
            response_res["profilePhoto"] = presigned_url
        return response_res
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user data: {e}")
    finally:
        cursor.close()

@app.get("/public/profile/{user_id}", response_model=UserProfile)
async def get_user_profile_by_id(user_id: str, conn=Depends(get_db)):
    try:
        response_res = {
            'id':'',
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
        response_res["id"]= str(user_data["user_id"])
        response_res["firstName"] = user_data["first_name"]
        response_res["lastName"] = user_data["last_name"]
        response_res["email"] = user_data["username"]
        response_res["dateOfBirth"] = user_data["date_of_birth"]
        
        cursor.execute("""
            SELECT realtime_photo_url
            FROM id_verifications
            WHERE user_id = %s;
        """, (user_id,))
        photo_row = cursor.fetchone()
        if photo_row and photo_row["realtime_photo_url"]:
            # parse bucket/key from s3://
            s3_url = photo_row["realtime_photo_url"]
            _, _, bucket_and_key = s3_url.partition("s3://")
            bucket, _, key = bucket_and_key.partition("/")

            s3_client = boto3.client(
                "s3",
                config=Config(signature_version='s3v4'),
                region_name='eu-north-1',
                aws_access_key_id=AWS_ACCESS_KEY,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            )
            presigned_url = s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=3600
            )
            response_res["profilePhoto"] = presigned_url
            
        return response_res
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user data: {e}")
    finally:
        cursor.close()

@app.get("/public/verified-cards/{user_id}", response_model=active_cards)
async def get_verified_cards(user_id: str, conn=Depends(get_db)):
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT username
            FROM users
            WHERE user_id = %s;
        """, (user_id,))
        user_data = cursor.fetchone()
        print(user_data)
        username = user_data["username"]
        print(username)
        # logger.info(f"Fetching verified active cards for user: {username}")
        cursor.execute("SELECT name, reg_no, card_type, date_of_expiration, scheme_name, qualifications FROM active_card_details WHERE user_email = %s", (username,))
        active_cards_data = cursor.fetchall()
        if not active_cards_data:
            # logger.info("No verified active cards found for user.")
            return {"cards_data": []}
        
        # logger.info(f"Found {len(active_cards_data)} verified active cards for user.")
        response = []
        for card in active_cards_data:
            response.append(active_card.model_validate(card))
        return {"cards_data": response}
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user data: {e}")
    finally:
        cursor.close()

@app.post("/forgot-password/")
async def forget_password(request: ForgotPasswordRequest ,conn=Depends(get_db)):
    try:
        print("Initiating password reset for:", request.email)
        email = request.email.strip()
        if not is_valid_email(email):
            raise HTTPException(status_code=400, detail=f"Invalid email: {email}")
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM users WHERE username = %s;", (email,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        reset_token = create_access_token(data={"sub": email}, expires_delta=timedelta(hours=1))
        reset_link = f"https://54.159.160.253/reset-password?token={reset_token}"
        # Here you would send the reset link via email using your preferred email service
        print(f"Password reset link (send this via email): {reset_link}")
        return {"success":True,"message": "Password reset link has been sent to your email."}
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {e}")
    finally:
        cursor.close()

@app.get("/validate-reset-token")
async def validate_reset_token(token: str = Query(...)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=400, detail="Invalid token")
        return {"valid": True, "expired": False}
    except ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token has expired")
        return {"valid": False, "expired": True}
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid token")
        return {"valid": False, "expired": False}



@app.post("/reset-password/")
async def reset_password(request : ResetPasswordRequest, conn=Depends(get_db)):
    token = request.token
    new_password = request.new_password.strip()
    if not is_valid_password(new_password):
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character"
        )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=400, detail="Invalid token")

        hashed_password = get_password_hash(new_password)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE users
            SET password = %s
            WHERE username = %s;
        """, (hashed_password, username))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found")
        conn.commit()
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


# @app.post("/admin-register", response_model=AdminResponse)
# async def register_admin(admin: AdminCreate, conn=Depends(get_db)):
# #     if not all([
# #         admin.first_name.strip(),
# #         admin.last_name.strip(),
# #         admin.employee_id.strip(),
# #         admin.username.strip(),
# #         admin.password.strip()
# #     ]):
# #         raise HTTPException(status_code=400, detail="All fields are required!")

# #     if not is_valid_email(admin.username):
# #         raise HTTPException(status_code=400, detail=f"Invalid username: {admin.username}")

# #     if not is_valid_password(admin.password):
# #         raise HTTPException(
# #             status_code=400,
# #             detail="Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character"
# #         )

# #     try:
# #         cursor = conn.cursor()
# #         cursor.execute("""
# #             INSERT INTO admins (first_name, last_name, employee_id, username, password, date_of_birth)
# #             VALUES (%s, %s, %s, %s, %s, %s)
# #             RETURNING id, first_name, last_name, employee_id, username, date_of_birth;
# #         """, (
# #             admin.first_name.strip(),
# #             admin.last_name.strip(),
# #             admin.employee_id.strip(),
# #             admin.username.strip(),
# #             admin.password.strip(),
# #             admin.date_of_birth
# #         ))
# #         new_admin = cursor.fetchone()
# #         conn.commit()
# #         cursor.close()
# #         return new_admin
# #     except psycopg2.Error as e:
# #         conn.rollback()
# #         if "duplicate key" in str(e).lower():
# #             raise HTTPException(status_code=400, detail="Employee ID or Username already exists!")
# #         raise HTTPException(status_code=500, detail=f"Error registering admin: {e}")

@app.post("/admin-login", response_model=AdminResponse)
async def login_admin(login: LoginRequest, conn=Depends(get_db)):
    try:
        print("Initiating admin login for:", login.username)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT admin_id, first_name, last_name, employee_id, email, password, date_of_birth
            FROM admins
            WHERE email = %s;
        """, (login.username,))
        admin_data = cursor.fetchone()
        print(admin_data)
        if not admin_data or not (login.password.strip()==admin_data["password"]):
        # if not admin_data or not verify_password(login.password, admin_data["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials!")
        admin_access_token = create_access_token(data={"sub": admin_data["email"]})
        return {"token": admin_access_token, "token_type": "bearer", **admin_data}
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Error during login: {e}")
    finally:
        cursor.close()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)