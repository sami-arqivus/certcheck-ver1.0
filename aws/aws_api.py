import boto3                    # type: ignore
from dotenv import load_dotenv   # type: ignore
import os
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from typing import Optional, List
from pydantic import BaseModel
from jose import JWTError, jwt  # type: ignore
from fastapi.security import OAuth2PasswordBearer  # type: ignore
# from datetime import datetime, timedelta
import datetime
from botocore.exceptions import ClientError             # type: ignore
from fastapi import status     # type: ignore
from fastapi.responses import JSONResponse  # type: ignore
from pathlib import Path
import httpx # type: ignore
import logging
import psycopg2  # type: ignore
from psycopg2 import connect, Error as psycopg2Error  # type: ignore
from psycopg2.extras import RealDictCursor  # type: ignore
import uuid
from fastapi import Header, Depends  # type: ignore
from jose import ExpiredSignatureError      #type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from botocore.config import Config                          # type: ignore
from fastapi import Query  # type: ignore
# from datetime import datetime, timedelta
from datetime import date

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
AWS_REGION = os.getenv("AWS_REGION")
CHARSET = "UTF-8"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="user-login", auto_error=False)

if not AWS_ACCESS_KEY or not AWS_SECRET_ACCESS_KEY:
    raise HTTPException(status_code=500, detail="AWS credentials not found in .env file")

app = FastAPI(title="ALL AWS API CALLS")
origins = [
    "https://54.159.160.253",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing; adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # expose_headers=["Content-Disposition"],  # Allow Content-Disposition header for file downloads
)

class UserDetails(BaseModel):
    ref_id: str
    user_email: Optional[str]
    position: Optional[str]
    work_location: Optional[str]
    created_at: Optional[str]
    expires_at: Optional[str]
    accepted_at: Optional[str] = None
    rejected_at: Optional[str] = None
    status: Optional[str]
    name: Optional[str]
    profile_photo: Optional[str]
    joined_date: Optional[str]


class EmployeeData(BaseModel):
    name: str
    email: str
    position: str
    workLocation: str
    startDate: str


class CSCSCard(BaseModel):
    user_email: str
    name: str
    reg_no: str
    card_type: str
    date_of_expiration: str
    scheme_name: str
    qualifications: str

    class Config:
        orm_mode = True
        json_encoders = {
            date: lambda v: v.isoformat(),  # Convert date to string (e.g., "2025-10-01")
            list: lambda v: ", ".join(v) if v else "",  # Convert JSONB array to comma-separated string
        }


class ErrorResponse(BaseModel):
    message: str

# class EmailRequest(BaseModel):
#     recipient: EmailStr
    # admin_email: EmailStr


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

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        logger.error("No token provided in Authorization header")
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            logger.error("JWT payload missing 'sub' claim")
            raise credentials_exception
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {token}"}
            logger.info(f"Calling /user/me with headers: {headers}")
            response = await client.get("http://login_register_container:8000/user/me", headers=headers)
            logger.info(f"/user/me response: {response.status_code}, {response.text}")
            if response.status_code != 200:
                raise credentials_exception
            user_data = response.json()
            print("username", username)
            print("user_id", user_data["user_id"])
            return {"username": username, "user_id": user_data["user_id"]}
    except (JWTError, httpx.HTTPStatusError) as e:
        logger.error(f"Error in get_current_user: {str(e)}")
        raise credentials_exception
    
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf', '.json'}

def validate_file_extension(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS

def create_s3_client():
    try:
        s3_client = boto3.client(
            "s3",
            config = Config(signature_version='s3v4'),
            region_name='eu-north-1',
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )
        return s3_client
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to create S3 client: {e}")

def generate_presigned_url(bucket_name: str, object_key: str, expiration: int = 3600) -> str:
    try:
        s3_client = create_s3_client()
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': object_key},
            ExpiresIn=expiration
        )
        return url
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate pre-signed URL: {str(e)}")

async def user_exists_email_template(from_email: str, position: str, work_location: str, invite_link: str):
    email_subject = "CertCheck Invitation Request to share your details"
    body_text = "Hello CertCheck verified User !!!\n\n" 
    email_body = f"""
    <html>
        <head></head>
        <body>
            <h1>Hello CertCheck verified User !!!</h1>
            <p>Here is a message as a perk of being a certcheck registered user...An offer from an organisation...</p>
            <p>You got a request from {from_email} to recruit for position {position} at {work_location}. Click here to approve sharing your details. </p>
            <p><a href="{invite_link}">CertCheck</a></p>
        </body>
    </html>
    """
    return {
        "subject": email_subject,
        "body_text": body_text,
        "body_html": email_body
    }

async def new_user_email_template(email: str,invite_link: str):
    email_subject = "Welcome to CertCheck - Your Invitation to Join"
    body_text = "Hello, welcome to CertCheck! Click the link below to register."
    email_body = f"""
    <html>
        <head></head>
        <body>
            <h1>Welcome to CertCheck!</h1>
            <p>Click the link below to complete your registration:</p>
            <p><a href="{invite_link}">Register Now</a></p>
        </body>
    </html>
    """
    return {
        "subject": email_subject,
        "body_text": body_text,
        "body_html": email_body
    }

admin_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="admin-login", auto_error=False)
async def get_admin_email(token: Optional[str] = Depends(admin_oauth2_scheme)) -> str:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=ALGORITHM)
        admin_email: str = payload.get("sub")
        if admin_email is None:
            raise credentials_exception
        return admin_email
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise credentials_exception

async def check_user_exists(email: str, db: psycopg2.extensions.connection):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE username = %s", (email,))
    user = cursor.fetchone()
    cursor.close()
    return user is not None 
        

@app.post("/upload-file/")
async def upload_file(file: UploadFile = File(...), user_id: Optional[int] = None):
    if not validate_file_extension(file.filename):
        raise HTTPException(status_code=400, detail="Invalid file extension. Allowed extensions are: jpg, jpeg, png, pdf, json.")
    
    s3_client = create_s3_client()
    bucket_name = os.getenv("BUCKET_NAME")
    
    if user_id is None:
        raise HTTPException(status_code=400, detail="User ID is required.")
    
    folder_name = f"user_{user_id}/"
    file_key = folder_name + file.filename
    
    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=file_key,
            Body=file.file,
            ContentType=file.content_type
        )
        # get s3 path of the stored file
        s3_path = f"s3://{bucket_name}/{file_key}"
        return {"message": f"File '{file.filename}' uploaded successfully to '{folder_name}'.",
                "s3_path": s3_path}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {e}")


@app.post("/upload-certificate/")
async def upload_certificate(file: UploadFile = File(...), user_id: Optional[int] = None):
    print(f"Current user ID: {user_id}")
    print("Uploading certificate to AWS S3")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    if not validate_file_extension(file.filename):
        raise HTTPException(status_code=400, detail="Invalid file extension. Allowed extensions are: jpg, jpeg, png, pdf, json.")
    
    s3_client = create_s3_client()
    bucket_name = os.getenv("BUCKET_NAME")
    folder_name = f"user_{user_id}/certificates/"
    file_key = folder_name + file.filename
    
    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=file_key,
            Body=file.file,
            ContentType=file.content_type
        )
        s3_path = f"s3://{bucket_name}/{file_key}"
        return {"message": f"Certificate '{file.filename}' uploaded successfully to '{folder_name}'.",
                "s3_path": s3_path}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload certificate: {e}")


@app.get("/download-file/{file_key:path}")
async def download_file(file_key: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("user_id")
    if user_id != current_user["user_id"]:
        logger.error(f"Unauthorized access attempt: user_id {user_id} does not match {current_user['user_id']}")
        raise HTTPException(status_code=403, detail="Not authorized to access this user's files")
    
    s3_client = create_s3_client()
    bucket_name = os.getenv("BUCKET_NAME")
    logger.info(f"File {file_key} found in S3")
    try : 
        s3_client.head_object(Bucket=bucket_name, Key=file_key)
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': file_key},
            ExpiresIn=3600  # URL valid for 1 hour
        )
        logger.info(f"Generated pre-signed URL for file {file_key}")
        return {"downloadUrl": presigned_url}
    except ClientError as e:
        error_code = e.response['Error']['Code']
        logger.error(f"S3 error for user_id {user_id}: {error_code}, {str(e)}")
        if error_code == 'NoSuchKey':
            raise HTTPException(status_code=404, detail="File not found")
        elif error_code == 'NoSuchBucket':
            raise HTTPException(status_code=400, detail="S3 bucket does not exist")
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error while downloading file {file_key}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")




@app.get("/list-files/")
async def list_files(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("user_id")
    if user_id != current_user["user_id"]:
        logger.error(f"Unauthorized access attempt: user_id {user_id} does not match {current_user['user_id']}")
        raise HTTPException(status_code=403, detail="Not authorized to access this user's files")
    
    s3_client = create_s3_client()
    bucket_name = os.getenv("BUCKET_NAME")
    folder_name = f"user_{user_id}/"
    
    try:
        response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=folder_name)
        if 'Contents' not in response:
            logger.info(f"No files found for user_id: {user_id}")
            return {"files": []}
        
        files = [
            {
                "key": obj['Key'],
                "lastModified": obj['LastModified'].isoformat(),
                "size": obj['Size'],
                "url": s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': bucket_name, 'Key': obj['Key']},
                    ExpiresIn=3600
                )
            }
            for obj in response['Contents']
        ]
        logger.info(f"Retrieved {len(files)} files for user_id: {user_id}")
        return {"files": files}
    except ClientError as e:
        error_code = e.response['Error']['Code']
        logger.error(f"S3 error for user_id {user_id}: {error_code}, {str(e)}")
        if error_code == 'NoSuchBucket':
            raise HTTPException(status_code=400, detail="S3 bucket does not exist")
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")
    
@app.get("/list-certificates/")
async def list_certificates(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("user_id")
    if user_id != current_user["user_id"]:
        logger.error(f"Unauthorized access attempt: user_id {user_id} does not match {current_user['user_id']}")
        raise HTTPException(status_code=403, detail="Not authorized to access this user's files")
    
    s3_client = create_s3_client()
    bucket_name = os.getenv("BUCKET_NAME")
    folder_name = f"user_{user_id}/certificates/"
    
    try:
        response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=folder_name)
        if 'Contents' not in response:
            logger.info(f"No files found for user_id: {user_id}")
            return {"files": []}
        
        files = [
            {
                "key": obj['Key'],
                "lastModified": obj['LastModified'].isoformat(),
                "size": obj['Size'],
                "url": s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': bucket_name, 'Key': obj['Key']},
                    ExpiresIn=3600
                )
            }
            for obj in response['Contents']
        ]
        logger.info(f"Retrieved {len(files)} files for user_id: {user_id}")
        return {"files": files}
    except ClientError as e:
        error_code = e.response['Error']['Code']
        logger.error(f"S3 error for user_id {user_id}: {error_code}, {str(e)}")
        if error_code == 'NoSuchBucket':
            raise HTTPException(status_code=400, detail="S3 bucket does not exist")
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

    
@app.get("/fetch-invitations-details")
async def fetch_invitations_details(db: psycopg2.extensions.connection = Depends(get_db), admin_email: str = Depends(get_admin_email)):
    try:
        print("Admin Email, ", admin_email)
        cursor = db.cursor()
        cursor.execute(
            "SELECT * FROM invitations WHERE admin_email = %s",
            (admin_email,)
        )
        invitations = cursor.fetchall()
        cursor.close()  # Close the cursor
        if not invitations:
            return JSONResponse(status_code=404, content={"message": "No invitations found for this admin."})
        return {"invitations": invitations}
    except psycopg2Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.post("/store-invitation-details")
async def store_invitation_details(employee_data: EmployeeData, db: psycopg2.extensions.connection = Depends(get_db), admin_email: str = Depends(get_admin_email)):
    try:
        # Check if the user already exists
        print(f"Checking if user {employee_data.email} exists in the database.")
        user_exists = await check_user_exists(employee_data.email, db)
        
        gen_uuid = str(uuid.uuid4())
        consent = False
        invite_link = f"https://54.159.160.253/login?consent={consent}&ref_id={gen_uuid}"
        
        cursor = db.cursor()
        
        if user_exists:
            print(f"User {employee_data.email} already exists. Storing invitation details.")
            # Insert into invitations table
            cursor.execute(
                "INSERT INTO invitations (ref_id, admin_email, user_email, invite_link, position, work_location, expires_at, status) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    gen_uuid, admin_email, employee_data.email, invite_link,
                    employee_data.position, employee_data.workLocation,
                    datetime.datetime.now() + datetime.timedelta(days=7), "Pending"
                )
            )
            print(f"Invitation for {employee_data.email} inserted into database with ref_id {gen_uuid}.")
            
            # Insert into pending_data table
            cursor.execute(
                "INSERT INTO pending_data (admin_email, user_email, ref_id, position, work_location, created_at, expires_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (
                    admin_email, employee_data.email, gen_uuid, employee_data.position, 
                    employee_data.workLocation, datetime.datetime.now(), 
                    datetime.datetime.now() + datetime.timedelta(days=7)
                )
            )
            print(f"Pending data for {employee_data.email} inserted into database with ref_id {gen_uuid}.")
            
            db.commit()
            cursor.close()
            return {
                "message": "Invitation details stored successfully",
                "ref_id": gen_uuid,
                "invite_link": invite_link,
                "user_exists": True
            }
        else:
            print(f"User {employee_data.email} does not exist.")
            cursor.close()
            return {
                "message": "User does not exist",
                "ref_id": gen_uuid,
                "invite_link": invite_link,
                "user_exists": False
            }
            
    except psycopg2Error as e:
        if cursor:
            cursor.close()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/send-expiry-email")
async def send_expiry_email(cscscarddetails: CSCSCard, db: psycopg2.extensions.connection = Depends(get_db), admin_email: str = Depends(get_admin_email)):
    try:
        # Initialize SES client
        ses_client = boto3.client(
            'ses',
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )
        print("SES client initialized successfully")
        
        # Prepare email template
        email_subject = "CSCS Card Expiry Notification"
        body_text = f"Hello {cscscarddetails.name},\n\nYour CSCS card is about to expire on {cscscarddetails.date_of_expiration}. Please take necessary actions."
        email_body = f"""
        <html>
            <head></head>
            <body>
                <h1>Hello {cscscarddetails.name},</h1>
                <p>Your CSCS card is about to expire on {cscscarddetails.date_of_expiration}. Please take necessary actions.</p>
            </body>
        </html>
        """
        
        print(f"Sending email to {cscscarddetails.user_email}.")
        response = ses_client.send_email(
            Destination={'ToAddresses': [cscscarddetails.user_email]},
            Message={
                'Body': {
                    'Text': {'Charset': CHARSET, 'Data': body_text},
                    'Html': {'Charset': CHARSET, 'Data': email_body},
                },
                'Subject': {'Charset': CHARSET, 'Data': email_subject},
            },
            Source=admin_email,  # Will be replaced by admin email later
            ConfigurationSetName='test-config-1',
        )
        
        return {
            "message": "Expiry notification email sent successfully",
            "message_id": response['MessageId']
        }
        
    except ClientError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to send email: {e.response['Error']['Message']}"
        )


# @app.post("/send-invitation-email")
# async def send_invitation_email(employee_data: EmployeeData, admin_email: str, invite_link: str, user_exists: bool):
#     try:
#         # Initialize SES client
#         ses_client = boto3.client(
#             'ses',
#             region_name=AWS_REGION,
#             aws_access_key_id=AWS_ACCESS_KEY,
#             aws_secret_access_key=AWS_SECRET_ACCESS_KEY
#         )
#         print("SES client initialized successfully")
        
#         # Select appropriate email template based on user existence
#         email_template = await user_exists_email_template(
#             admin_email, 
#             employee_data.position, 
#             employee_data.workLocation, 
#             invite_link
#         ) if user_exists else await new_user_email_template(employee_data.email, "")
        
#         print(f"Sending email to {employee_data.email}.")
#         response = ses_client.send_email(
#             Destination={'ToAddresses': [employee_data.email]},
#             Message={
#                 'Body': {
#                     'Text': {'Charset': CHARSET, 'Data': email_template['body_text']},
#                     'Html': {'Charset': CHARSET, 'Data': email_template['body_html']},
#                 },
#                 'Subject': {'Charset': CHARSET, 'Data': email_template['subject']},
#             },
#             Source='sameer230799@gmail.com',  # Will be replaced by admin email later
#             ConfigurationSetName='test-config-1',
#         )
        
#         return {
#             "message": "Email sent successfully" if user_exists else "Invitation email sent successfully",
#             "message_id": response['MessageId']
#         }
        
#     except ClientError as e:
#         raise HTTPException(
#             status_code=400,
#             detail=f"Failed to send email: {e.response['Error']['Message']}"
#         )

# @app.post("/send-email")
# async def send_email(employee_data: EmployeeData, db: psycopg2.extensions.connection = Depends(get_db), admin_email: str = Depends(get_admin_email)):
#     # Store invitation details and get user existence status
#     db_result = await store_invitation_details(employee_data, db, admin_email)
    
#     # Send email using the stored invitation details
#     email_result = await send_invitation_email(
#         employee_data, 
#         admin_email, 
#         db_result["invite_link"], 
#         db_result["user_exists"]
#     )
    
#     return email_result

# @app.post("/send-email")
# async def send_email(employee_data: EmployeeData, db: psycopg2.extensions.connection = Depends(get_db), admin_email: str = Depends(get_admin_email)):
#     try:
#         try:
#             ses_client = boto3.client(
#                 'ses',
#                 region_name=AWS_REGION,
#                 aws_access_key_id=AWS_ACCESS_KEY,
#                 aws_secret_access_key=AWS_SECRET_ACCESS_KEY
#             )
#             print("SES client initialized successfully")
#         except ClientError as e:
#             raise Exception(f"Failed to initialize SES client: {e}")
#         # Check if the user already exists
#         print(f"Checking if user {employee_data.email} exists in the database.")
#         user_exists = await check_user_exists(employee_data.email, db)
#         if user_exists:
#             gen_uuid = str(uuid.uuid4())
#             consent = False
#             invite_link = f"http://localhost:8080/login?consent={consent}&ref_id={gen_uuid}"
#             email_template = await user_exists_email_template(admin_email, employee_data.position, employee_data.workLocation, invite_link)
#             print(f"User {employee_data.email} already exists. Sending email to {employee_data.email}.")
#             # Send email to admin
#             cursor = db.cursor()
#             cursor.execute(
#                 "INSERT INTO invitations (ref_id, admin_email, user_email, invite_link, position, work_location, expires_at, status) "
#                 "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
#                 (
#                     gen_uuid, admin_email, employee_data.email, invite_link,
#                     employee_data.position, employee_data.workLocation,
#                     datetime.datetime.now() + datetime.timedelta(days=7), "Pending"
#                 )
#             )
#             print(f"Invitation for {employee_data.email} inserted into database with ref_id {gen_uuid}.")
#             cursor.execute("Insert into pending_data (admin_email, user_email, ref_id, position, work_location, created_at, expires_at) "
#                            "values (%s, %s, %s, %s, %s, %s, %s)",
#                             (admin_email, employee_data.email, gen_uuid, employee_data.position, employee_data.workLocation,
#                                 datetime.datetime.now(), datetime.datetime.now() + datetime.timedelta(days=7)))
#             print(f"Pending data for {employee_data.email} inserted into database with ref_id {gen_uuid}.")
#             db.commit()  # Commit the transaction
#             cursor.close()
#             response = ses_client.send_email(
#                 Destination={'ToAddresses': [employee_data.email]},
#                 Message={
#                     'Body': {
#                         'Text': {'Charset': CHARSET, 'Data': email_template['body_text']},
#                         'Html': {'Charset': CHARSET, 'Data': email_template['body_html']},
#                     },
#                     'Subject': {'Charset': CHARSET, 'Data': email_template['subject']},
#                 },
#                 Source = 'sameer230799@gmail.com',       # will be replaced by the admin email later
#                 ConfigurationSetName='test-config-1', 
#             )
#             return {"message": "Email sent successfully to admin", "message_id": response['MessageId']}
#         else:
#             print(f"User {employee_data.email} does not exist. Sending invitation email.")
#             email_template = await new_user_email_template(employee_data.email, "")
#             response = ses_client.send_email(
#                 Destination={'ToAddresses': [employee_data.email]},
#                 Message={
#                     'Body': {
#                         'Text': {'Charset': CHARSET, 'Data': email_template['body_text']},
#                         'Html': {'Charset': CHARSET, 'Data': email_template['body_html']},
#                     },
#                     'Subject': {'Charset': CHARSET, 'Data': email_template['subject']},
#                 },
#                 Source = 'sameer230799@gmail.com',
#                 ConfigurationSetName='test-config-1',  
#             )
#             return {"message": "Invitation email sent successfully", "message_id": response['MessageId']}
#     except ClientError as e:
#         raise HTTPException(
#             status_code=400,
#             detail=f"Failed to send email: {e.response['Error']['Message']}"
#         )
#     except psycopg2Error as e:
#         raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    

@app.get("/fetch_user_profile/{ref_id}", response_model=UserDetails)
async def fetch_user_profile(ref_id: str, 
                             db = Depends(get_db)):
    res = {
        "ref_id": ref_id,
        "user_email": None,
        "position": None,
        "work_location": None,
        "created_at": None,
        "expires_at": None,
        "accepted_at": None,
        "rejected_at": None,
        "status": None,
        "name": None,
        "profile_photo": None,
        "joined_date": None,
    }
    try:
        logger.info(f"Fetching user profile for ref_id: {ref_id}")
        cursor = db.cursor()
        cursor.execute(
            "SELECT user_email,position, work_location,created_at, expires_at, status FROM invitations WHERE ref_id = %s",
            (ref_id,)
        )
        user = cursor.fetchone()
        print(f"Fetched user data: {user}")
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        res['user_email'] = user['user_email']
        res['position'] = user['position']
        res['work_location'] = user['work_location']
        res['created_at'] = user['created_at'].strftime("%Y-%m-%d %H:%M:%S") if user['created_at'] else None
        res['expires_at'] = user['expires_at'].strftime("%Y-%m-%d %H:%M:%S") if user['expires_at'] else None
        res['status'] = user['status']
        if user['status'] == 'Accepted':
            cursor.execute(
                "SELECT accepted_at FROM accepted_data WHERE ref_id = %s",
                (ref_id,)
            )
            accepted_data = cursor.fetchone()
            if accepted_data:
                res['accepted_at'] = accepted_data['accepted_at'].strftime("%Y-%m-%d %H:%M:%S") if accepted_data['accepted_at'] else None
        elif user['status'] == 'Rejected':
            cursor.execute(
                "SELECT rejected_at FROM rejected_data WHERE ref_id = %s",
                (ref_id,)
            )
            rejected_data = cursor.fetchone()
            if rejected_data:
                res['rejected_at'] = rejected_data['rejected_at'].strftime("%Y-%m-%d %H:%M:%S") if rejected_data['rejected_at'] else None
        cursor.execute(
            "SELECT user_id, first_name, last_name, created_at FROM users WHERE username = %s",
            (user['user_email'],)
        )
        user= cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User ID not found")
        user_id = user['user_id']
        res['joined_date'] = user['created_at'].strftime("%Y-%m-%d %H:%M:%S") if user['created_at'] else None
        full_name = f"{user['first_name']} {user['last_name']}"
        res['name'] = full_name
        cursor.execute(
            "SELECT realtime_photo_url FROM id_verifications WHERE user_id = %s",
            (user_id,)
        )
        profile_photo = cursor.fetchone()
        if not profile_photo:
            res['profile_photo'] = None
        else:
            res['profile_photo'] = profile_photo['realtime_photo_url']
        cursor.close()
        logger.info(f"User profile fetched successfully for ref_id: {ref_id}")
         # Generate pre-signed URL for the profile photo if it exists
        if res['profile_photo']:
            bucket_name = 'certcheck-users'
            object_key = f"user_{user_id}/real_time_captured.jpg"
            res['profile_photo'] = generate_presigned_url(bucket_name, object_key)
        return res
    except psycopg2Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
@app.get("/fetch_active_users/")
async def fetch_active_users(db: psycopg2.extensions.connection = Depends(get_db), admin_email: str = Depends(get_admin_email)):
    try:
        cursor = db.cursor()
        cursor.execute(
            "SELECT count(*) as active_users FROM invitations WHERE admin_email = %s AND status='Accepted'", (admin_email,)
        )
        active_users = cursor.fetchone()
        print(f"Fetched active users count: {active_users}")
        cursor.close()  # Close the cursor
        if not active_users:
            return JSONResponse(status_code=404, content={"message": "No active users found."})
        return active_users
    except psycopg2Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.get("/fetch_pending_users/")
async def fetch_pending_users(db: psycopg2.extensions.connection = Depends(get_db), admin_email: str = Depends(get_admin_email)):
    try:
        cursor = db.cursor()
        cursor.execute(
            "SELECT count(*) as pending_users FROM invitations WHERE admin_email = %s AND status='Pending'", (admin_email,)
        )
        pending_users = cursor.fetchone()
        print(f"Fetched pending users count: {pending_users}")
        cursor.close()  # Close the cursor
        if not pending_users:
            return JSONResponse(status_code=404, content={"message": "No pending users found."})
        return pending_users
    except psycopg2Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@app.get("/fetch_expired_card_details/")
async def fetch_expired_card_details(db: psycopg2.extensions.connection = Depends(get_db), admin_email: str = Depends(get_admin_email)):
    try:
        cursor = db.cursor()
        cursor.execute(
            "SELECT DISTINCT ac.* from active_card_details ac JOIN accepted_data ad ON ac.user_email=ad.user_email WHERE ad.admin_email= %s  AND (ac.date_of_expiration - CURRENT_DATE) <=0 ", (admin_email,)
        )
        expired_cards = cursor.fetchall()
        print(f"Fetched expired cards count: {expired_cards}")
        cursor.close()  # Close the cursor
        if not expired_cards:
            return JSONResponse(status_code=404, content={"message": "No Expired cards found."})
        return expired_cards
    except psycopg2Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.get("/fetch_active_cscs_card_details/")
async def fetch_active_cscs_card_details(db: psycopg2.extensions.connection = Depends(get_db), admin_email: str = Depends(get_admin_email)):
    try:
        cursor = db.cursor()
        cursor.execute(
            "SELECT DISTINCT ac.* from active_card_details ac JOIN accepted_data ad ON ac.user_email=ad.user_email WHERE ad.admin_email= %s AND (ac.date_of_expiration - CURRENT_DATE) >0 ", (admin_email,)
        )
        active_cscs_cards = cursor.fetchall()
        print(f"Fetched active CSCS cards count: {active_cscs_cards}")
        cursor.close()  # Close the cursor
        if not active_cscs_cards:
            return JSONResponse(status_code=404, content={"message": "No Active CSCS cards found."})
        return active_cscs_cards
    except psycopg2Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.get("/fetch_all_cscs_card_details/")
async def fetch_all_cscs_card_details(db: psycopg2.extensions.connection = Depends(get_db), admin_email: str = Depends(get_admin_email)):
    try:
        cursor = db.cursor()
        cursor.execute(
            "SELECT DISTINCT ac.* from active_card_details ac JOIN accepted_data ad ON ac.user_email=ad.user_email WHERE ad.admin_email= %s", (admin_email,)
        )
        all_cards = cursor.fetchall()
        print(f"Fetched all cards count: {all_cards}")
        cursor.close()  # Close the cursor
        if not all_cards:
            return JSONResponse(status_code=404, content={"message": "No cards found."})
        return all_cards
    except psycopg2Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@app.get("/filter_active_cards/")
async def filter_active_cards(
    db: psycopg2.extensions.connection = Depends(get_db),
    admin_email: str = Depends(get_admin_email),
    expiry_in_days: Optional[int] = Query(None, description="Filter by cards expiring within X days"),
    qualification: Optional[str] = Query(None, description="Filter by qualification (partial match)"),
    scheme_name: Optional[str] = Query(None, description="Filter by scheme name"),
    card_type: Optional[str] = Query(None, description="Filter by card type")
):
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT DISTINCT ON (ac.card_id) ac.user_email, ac.name, ac.reg_no, ac.card_type, 
                   ac.date_of_expiration, ac.scheme_name, ac.qualifications
            FROM active_card_details ac
            JOIN accepted_data ad ON ac.user_email = ad.user_email
            WHERE ad.admin_email = %s
        """
        params = [admin_email]

        # Collect filter conditions for OR
        filter_conditions = []
        if expiry_in_days is not None:
            filter_conditions.append("(ac.date_of_expiration - CURRENT_DATE) <= %s AND (ac.date_of_expiration - CURRENT_DATE) >= 0")
            params.append(expiry_in_days)

        if qualification:
            filter_conditions.append("""
                EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements_text(ac.qualifications) AS q
                    WHERE q ILIKE %s
                )
            """)
            params.append(f"%{qualification}%")

        if scheme_name:
            filter_conditions.append("ac.scheme_name = %s")
            params.append(scheme_name)

        if card_type:
            filter_conditions.append("ac.card_type = %s")
            params.append(card_type)

        # Add OR conditions if any filters are provided
        if filter_conditions:
            query += " AND (" + " OR ".join(filter_conditions) + ")"
        else:
            # If no filters are provided, ensure no results are returned unless explicitly desired
            query += " AND FALSE"

        # Log the query and parameters for debugging
        logger.info(f"Executing query: {query}")
        logger.info(f"Parameters: {params}")

        cursor.execute(query, params)
        active_cards = cursor.fetchall()

        if not active_cards:
            return JSONResponse(status_code=404, content=ErrorResponse(message="No active cards found matching filters.").dict())

        return {"filtered_cards": active_cards}
    except psycopg2.Error as e:
        logger.error(f"Database error: {str(e)}")
        raise HTTPException(status_code=500, detail=ErrorResponse(message=f"Database error: {str(e)}").dict())
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=ErrorResponse(message=f"Unexpected error: {str(e)}").dict())
    finally:
        cursor.close()


if __name__ == "__main__":
    import uvicorn                          # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8001)