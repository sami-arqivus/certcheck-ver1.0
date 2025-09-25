from dotenv import load_dotenv   # type: ignore
import os
import asyncio
import datetime
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from typing import Optional, List
from pydantic import BaseModel              # type: ignore
from jose import JWTError, jwt  # type: ignore
from fastapi.security import OAuth2PasswordBearer  # type: ignore
from datetime import datetime, timedelta
from botocore.exceptions import ClientError     # type: ignore
from fastapi import status     # type: ignore
from fastapi.responses import JSONResponse  # type: ignore
from pathlib import Path
import httpx # type: ignore
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
import psycopg2                                             # type: ignore
from psycopg2 import connect, Error as psycopg2Error     # type: ignore
from psycopg2.extras import RealDictCursor    # type: ignore
from psycopg2.pool import ThreadedConnectionPool         # type: ignore
from browser_use import Agent, BrowserSession         # type: ignore        
from browser_use.llm import ChatOpenAI                  # type: ignore
from dotenv import load_dotenv                      # type: ignore                
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from browser_use import Controller  # type: ignore
from typing import Union, Dict, Any
load_dotenv()

logging.getLogger().setLevel(logging.WARNING)

# Optionally, configure browser_use logger specifically
logging.getLogger("browser_use").setLevel(logging.WARNING)

app = FastAPI(title="All Backend APIs (Invitations and Updates) ")
# origins = [
#     "http://localhost:8080",
#     "http://localhost:8081",
# ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"]
)
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
CAPSOLVER_API_KEY = os.getenv("CAPSOLVER_API_KEY")
SITE_KEY = os.getenv("SITE_KEY")
AUTH_SERVICE_BASE = os.getenv("AUTH_SERVICE_BASE", "http://login_register_user:8000")
AUTH_url = os.getenv("AUTH_URL", f"{AUTH_SERVICE_BASE}/user-login")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=AUTH_url, auto_error=False)

# Database connection pool
DB_MIN_CONN = int(os.getenv("DB_MIN_CONN", "1"))
DB_MAX_CONN = int(os.getenv("DB_MAX_CONN", "10"))
DB_STATEMENT_TIMEOUT_MS = int(os.getenv("DB_STATEMENT_TIMEOUT_MS", "15000"))

db_pool: ThreadedConnectionPool | None = None

def init_db_pool() -> None:
    global db_pool
    if db_pool is None:
        db_pool = ThreadedConnectionPool(
            minconn=DB_MIN_CONN,
            maxconn=DB_MAX_CONN,
            dsn=(
                f"dbname={os.getenv('DB_NAME')} "
                f"user={os.getenv('DB_USER')} "
                f"password={os.getenv('DB_PASSWORD')} "
                f"host={os.getenv('DB_HOST')} "
                f"port={os.getenv('DB_PORT')}"
            ),
            cursor_factory=RealDictCursor,
        )

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
    # Prefer pooled connection if available
    init_db_pool()
    if db_pool is None:
        conn = connect_db()
    else:
        conn = db_pool.getconn()
    try:
        # Set a per-connection statement timeout (milliseconds)
        with conn.cursor() as c:
            c.execute("SET statement_timeout TO %s", (DB_STATEMENT_TIMEOUT_MS,))
        yield conn
    finally:
        try:
            if db_pool is None:
                conn.close()
            else:
                db_pool.putconn(conn)
        except Exception:
            try:
                conn.close()
            except Exception:
                pass

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
            logger.info("Calling auth service /user/me")
            response = await client.get(f"{AUTH_SERVICE_BASE}/user/me", headers=headers)
            logger.info(f"/user/me response status: {response.status_code}")
            if response.status_code != 200:
                raise credentials_exception
            user_data = response.json()
            return {"username": username, "user_id": user_data["user_id"]}
    except (JWTError, httpx.HTTPStatusError) as e:
        logger.error(f"Error in get_current_user: {str(e)}")
        raise credentials_exception


        

class Agreement(BaseModel):
    ref_id : str

class ValidationRequest(BaseModel):
    scheme: str
    first_name: str
    last_name: str
    registration_number: str
    expiry_date: str
    hse_tested: bool
    role: str

class active_card(BaseModel):
    name: str
    reg_no: str
    card_type: str
    date_of_expiration: Union[str, datetime]
    scheme_name: str
    qualifications: List[str] = []

class active_cards(BaseModel):
    cards_data: List[active_card] = []

controller = Controller(output_model=active_cards)

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf', '.json'}
def validate_file_extension(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS



@app.get("/invitations")
async def get_invitations(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)  # type: ignore
):
    username = current_user['username']
    cursor = db.cursor()
    logger.info(f"Processing invitations for user: {username}")
    cursor.execute("SELECT ref_id, admin_email, position, created_at, status FROM invitations WHERE user_email = %s", (username,))
    invitations = cursor.fetchall()
    if not invitations:
        logger.info("No invitations found for user.")
        return []
    logger.info(f"Found {len(invitations)} invitations for user.")
    response = []
    for invitation in invitations:
        print(invitation)
        # ref_id, admin_email, position, created_at, status = invitation
        response.append({
            "ref_id": invitation['ref_id'],
            "admin_email": invitation['admin_email'],
            "position": invitation['position'],
            "created_at": invitation['created_at'],
            "status": invitation['status']
        })
    cursor.close()
    return response


@app.get("/updates")
async def get_updates(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)  # type: ignore
):
    username = current_user['username']
    cursor = db.cursor()
    logger.info(f"Processing updates for user: {username}")
    cursor.execute("SELECT ref_id, admin_email, position, created_at, expires_at, status FROM invitations WHERE user_email = %s AND status <> 'Approved' ", (username,))
    updates = cursor.fetchall()
    if not updates:
        logger.info("No updates found for user.")
        return []
    logger.info(f"Found {len(updates)} updates for user.")
    response = []
    for update in updates:
        print(update)
        # ref_id, admin_email, position, created_at, status = update
        response.append({
            "ref_id": update['ref_id'],
            "admin_email": update['admin_email'],
            "position": update['position'],
            "created_at": update['created_at'],
            "expires_at": update['expires_at'],
            "status": update['status']
        })
    cursor.close()
    return response


@app.get("/updates/{ref_id}")
async def get_ref_id_updates(
    ref_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)  # type: ignore
):
    username = current_user['username']
    cursor = db.cursor()
    logger.info(f"Processing updates for user: {username} with ref_id: {ref_id}")
    cursor.execute("SELECT ref_id, admin_email, position, created_at, expires_at, status FROM invitations WHERE user_email = %s AND ref_id = %s", (username, ref_id))
    update = cursor.fetchone()
    if not update:
        logger.info(f"No updates found for user with ref_id {ref_id}.")
        raise HTTPException(status_code=404, detail="Update not found")
    logger.info(f"Found update for user with ref_id {ref_id}.")
    response = {
        "ref_id": update['ref_id'],
        "admin_email": update['admin_email'],
        "position": update['position'],
        "created_at": update['created_at'],
        "expires_at": update['expires_at'],
        "status": update['status']
    }
    cursor.close()
    return response


@app.post("/agreement/accept")
async def accept_agreement_update(
    agreement: Agreement,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)  # type: ignore
):
    ref_id = agreement.ref_id
    username = current_user['username']
    cursor = db.cursor()
    logger.info(f"Accepting agreement update for user: {username} with ref_id: {ref_id}")
    
    cursor.execute("UPDATE invitations SET status = 'Accepted' WHERE user_email = %s AND ref_id = %s", (username, ref_id))
    cursor.execute("Insert into accepted_data (admin_email, user_email, ref_id, position, work_location, accepted_at) SELECT admin_email, user_email, ref_id, position, work_location, NOW() FROM invitations WHERE user_email = %s AND ref_id = %s", (username, ref_id))
    db.commit()
    if cursor.rowcount == 0:
        logger.error(f"No updates found for user with ref_id {ref_id}.")
        raise HTTPException(status_code=404, detail="Update not found or already approved")
    
    logger.info(f"Update with ref_id {ref_id} accepted for user {username}.")
    cursor.close()
    return {"message": "Update accepted successfully"}

@app.post("/agreement/reject")
async def reject_agreement_update(
    agreement: Agreement,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)  # type: ignore
):
    ref_id = agreement.ref_id
    username = current_user['username']
    cursor = db.cursor()
    logger.info(f"Rejecting agreement update for user: {username} with ref_id: {ref_id}")
    
    cursor.execute("UPDATE invitations SET status = 'Rejected' WHERE user_email = %s AND ref_id = %s", (username, ref_id))
    cursor.execute("Insert into rejected_data (admin_email, user_email, ref_id, position, work_location, rejected_at) SELECT admin_email, user_email, ref_id, position, work_location, NOW() FROM invitations WHERE user_email = %s AND ref_id = %s", (username, ref_id))
    db.commit()
    
    if cursor.rowcount == 0:
        logger.error(f"No updates found for user with ref_id {ref_id}.")
        raise HTTPException(status_code=404, detail="Update not found or already rejected")
    
    logger.info(f"Update with ref_id {ref_id} rejected for user {username}.")
    cursor.close()
    return {"message": "Update rejected successfully"}



@app.get("/verified-active-cards/", response_model=active_cards)
async def get_verified_active_cards(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)  # type: ignore
):
    username = current_user['username']
    cursor = db.cursor()
    logger.info(f"Fetching verified active cards for user: {username}")
    cursor.execute("SELECT name, reg_no, card_type, date_of_expiration, scheme_name, qualifications FROM active_card_details WHERE user_email = %s", (username,))
    active_cards_data = cursor.fetchall()
    if not active_cards_data:
        logger.info("No verified active cards found for user.")
        return {"cards_data": []}
    
    logger.info(f"Found {len(active_cards_data)} verified active cards for user.")
    response = []
    for card in active_cards_data:
        response.append(active_card.model_validate(card))
    
    cursor.close()
    return {"cards_data": response}

# Check if any user cards expire within the next N days (configurable)
@app.get("/expiry-check/", response_model=active_cards)
async def check_expiry_dates(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)  # type: ignore
):
    username = current_user['username']
    cursor = db.cursor()
    logger.info(f"Checking expiry dates for user: {username}")

    window_days = int(os.getenv("EXPIRY_WINDOW_DAYS", "60"))
    cursor.execute("""
        SELECT name, reg_no, card_type, date_of_expiration, scheme_name, qualifications 
        FROM active_card_details 
        WHERE user_email = %s AND (date_of_expiration - CURRENT_DATE) BETWEEN 0 AND %s
    """, (username, window_days))
    
    expiry_cards_data = cursor.fetchall()
    
    if not expiry_cards_data:
        logger.info(f"No cards expiring in the next {window_days} days found for user.")
        return {"cards_data": []}

    logger.info(f"Found {len(expiry_cards_data)} cards expiring in the next {window_days} days for user.")
    response = []
    for card in expiry_cards_data:
        response.append(active_card.model_validate(card))
    
    cursor.close()
    return {"cards_data": response}

if __name__ == "__main__":
    import uvicorn                          # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8003)