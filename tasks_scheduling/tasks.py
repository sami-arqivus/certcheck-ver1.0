from celery_app import celery_app
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
load_dotenv()
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
import asyncio
# Playwright removed - not needed for bulk verification
from fastapi import HTTPException
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
from celery.utils.log import get_task_logger
from psycopg2 import errors
from redis import Redis
from urllib.parse import urlparse
from celery.result import AsyncResult

cel_log = get_task_logger(__name__)


broker_url = os.getenv('CELERY_BROKER_URL')
# broker_url = 'rediss://celery-admin:Celery_admin_12345@master.celery-mqb-disabled.crs459.use1.cache.amazonaws.com:6379/0?ssl_cert_reqs=required&ssl_ca_certs=/etc/ssl/certs/aws-global-bundle.pem&ssl_check_hostname=false'
parsed_url = urlparse(broker_url)

username = parsed_url.username
host = parsed_url.hostname
port = parsed_url.port or 6379
password = parsed_url.password
db = parsed_url.path.strip('/') or '0'
ssl_ca_certs = parsed_url.query.split('ssl_ca_certs=')[1].split('&')[0] if 'ssl_ca_certs' in parsed_url.query else '/etc/ssl/certs/aws-global-bundle.pem'

redis_client = Redis(
    host=host,
    port=port,
    username=username,
    password=password,
    db=db,
    ssl=True,
    ssl_cert_reqs='required',
    ssl_ca_certs=ssl_ca_certs,
    decode_responses=True 
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
        logger.error(f"Error connecting to database: {e}")
        raise HTTPException(status_code=500, detail=f"Error connecting to database: {e}")


def get_db():
    conn = connect_db()
    try:
        yield conn
    finally:
        conn.close()


class ValidationRequest(BaseModel):
    scheme: str
    first_name: Optional[str]
    last_name: str
    registration_number: str
    expiry_date: Optional[str]
    hse_tested: Optional[bool]
    role: Optional[str]


ws_endpoint = os.getenv('WS_ENDPOINT')

TARGET_URL = "https://cscssmartcheck.co.uk/"


async def extract_active_cards_from_page(page) -> List[Dict[str, Any]]:
    cards_data = []
    try:
        await page.wait_for_selector("div.MuiStack-root", timeout=8000)
    except Exception as e:
        logger.warning(f"Selector 'div.MuiStack-root' not found within timeout: {e}")
    try:
        show_more_buttons = await page.query_selector_all('button:has-text("see more")')
        for btn in show_more_buttons:
            try:
                await btn.click()
                await page.wait_for_timeout(350)
            except Exception as e:
                logger.warning(f"Failed to click 'see more' button: {e}")
    except Exception as e:
        logger.warning(f"Failed to query or process 'see more' buttons: {e}")
    card_blocks = await page.query_selector_all('div.MuiStack-root.css-xjqfxa, div.card, div.result, div.MuiPaper-root')
    if not card_blocks:
        card_blocks = await page.query_selector_all('main div')
    for block in card_blocks:
        try:
            card_texts = await block.eval_on_selector_all(
                "p",
                "els => els.map(e => e.innerText.trim()).filter(t => t !== '')"
            )
            if not card_texts:
                text = await block.inner_text()
                if text and len(text.strip()) > 10:
                    cards_data.append({"raw_text": text.strip()})
                continue

            def get_value(label):
                try:
                    idx = card_texts.index(label)
                    return card_texts[idx + 1] if idx + 1 < len(card_texts) else None
                except ValueError:
                    return None
            qualifications = []
            if "Qualifications" in card_texts:
                i = card_texts.index("Qualifications") + 1
                while i < len(card_texts):
                    t = card_texts[i]
                    if t in ["Card Type", "Scheme Name", "Name", "Reg No", "Date of Expiration", "Scan Date"]:
                        break
                    qualifications.append(t)
                    i += 1

            card_data = {
                "card_type": get_value("Card Type"),
                "scheme_name": get_value("Scheme Name"),
                "name": get_value("Name"),
                "reg_no": get_value("Reg No"),
                "date_of_expiration": get_value("Date of Expiration"),
                "scan_date": get_value("Scan Date"),
                "qualifications": qualifications,
                "raw_paragraphs": card_texts
            }

            if any(card_data.get(k) for k in ["reg_no", "name", "scheme_name", "card_type"]) or qualifications:
                cards_data.append(card_data)
        except Exception as e:
            logger.warning(f"Failed to extract data from card block: {e}")
            continue
    return cards_data


# Playwright function commented out - not needed for bulk verification
# async def validate_cscs_certification(ws_endpoint: str, request: ValidationRequest, debug_screenshot: bool = True):
#     async with async_playwright() as pw:
#         max_connect_retries = 3
#         for attempt in range(max_connect_retries):
#             try:
#                 logger.info(f"Attempt {attempt + 1} to connect to remote browser via: {ws_endpoint}")
#                 browser = await pw.chromium.connect_over_cdp(ws_endpoint)
#                 break
#             except Exception as e:
#                 logger.warning(f"Failed to connect to remote browser (attempt {attempt + 1}): {e}")
#                 if attempt + 1 == max_connect_retries:
#                     logger.error(f"Exhausted {max_connect_retries} attempts to connect to remote browser")
#                     raise RuntimeError(f"Failed to connect to remote browser after {max_connect_retries} attempts: {e}")
#                 await asyncio.sleep(2 ** attempt)  # Exponential backoff
#         contexts = browser.contexts
#         if not contexts:
#             raise RuntimeError("No existing contexts available in remote browser")
#         context = contexts[0]
#         await context.clear_cookies()
#         await context.clear_permissions()
#         try:
#             await context.grant_permissions(['geolocation'])
#             await context.set_geolocation({"latitude": 51.5074, "longitude": -0.1278})
#         except Exception as e:
#             logger.warning(f"Failed to set geolocation: {e}. Proceeding without.")
#         
#         page = await context.new_page()
#         try:
#             response = await page.goto(TARGET_URL, timeout=60000)
#             await page.wait_for_load_state("load", timeout=30000)
#             if response:
#                 logger.info(f"Initial navigation HTTP status: {response.status}")
#             else:
#                 logger.info("No response object on initial navigation (remote browser may not provide it).")
#             scheme_input_selector = '#\\:r0\\:'
#             try:
#                 await page.wait_for_selector(scheme_input_selector, timeout=10000)
#                 await page.click(scheme_input_selector)
#                 await page.fill(scheme_input_selector, request.scheme)
#                 await page.wait_for_timeout(1000)
#                 option = page.get_by_role("option", name=request.scheme.upper(), exact=False)
#                 try:
#                     await option.click(timeout=5000)
#                 except Exception as e:
#                     logger.warning(f"Failed to click scheme option: {e}. Selecting first available option.")
#                     opts = await page.query_selector_all("li[role='option']")
#                     if opts:
#                         await opts[0].click()
#             except Exception as e:
#                 logger.warning(f"Could not fill scheme via primary selector: {e}. Trying text input fallback.")
#                 await page.keyboard.type(request.scheme)
#                 await page.wait_for_timeout(300)
# 
#             try:
#                 await page.fill('input[placeholder="Enter registration number"]', request.registration_number, timeout=10000)
#             except Exception as e:
#                 logger.error(f"Failed filling registration number input: {e}")
#             try:
#                 await page.fill('input[placeholder="Enter last name"]', request.last_name, timeout=10000)
#             except Exception as e:
#                 logger.error(f"Failed filling last name input: {e}")
# 
#             await page.wait_for_timeout(1000)
# 
#             try:
#                 btn = page.get_by_role("button", name="Check Card")
#                 await btn.click(timeout=8000)
#             except Exception as e:
#                 logger.warning(f"Failed to click Check Card button via role: {e}. Trying alternative selector.")
#                 try:
#                     await page.click("button:has-text('Check Card')", timeout=8000)
#                 except Exception as inner_e:
#                     logger.error(f"Failed to click Check Card button: {inner_e}")
# 
#             await page.wait_for_timeout(10000)
#             try:
#                 await page.wait_for_selector("div.MuiStack-root.css-xjqfxa, div.card, div.result", timeout=15000)
#             except Exception as e:
#                 logger.warning(f"Result selector not found within timeout: {e}")
# 
#             cards = await extract_active_cards_from_page(page)
#             try:
#                 await context.close()
#             except Exception as e:
#                 logger.warning(f"Failed to close context: {e}")
#             return {"success": True, "cards_data": cards}
#         except Error as e:
#             logger.error(f"Playwright error during interaction: {e}")
#             try:
#                 await context.close()
#             except Exception as inner_e:
#                 logger.warning(f"Failed to close context after error: {inner_e}")
#             return {"success": False, "error": str(e)}
#         finally:
#             try:
#                 await browser.close()
#             except Exception as e:
#                 logger.warning(f"Failed to close browser: {e}")

class DatabaseInsertionError(Exception):
    """Custom exception for database insertion errors."""
    pass

def insert_cards_to_db(db, cards: List[Dict[str, Any]], username: str):
    try:
        with db.cursor() as cursor:
            inserted_count = 0
            for card in cards:
                try:
                    cursor.execute(
                        """
                        INSERT INTO active_card_details (user_email, name, reg_no, card_type, date_of_expiration, scheme_name, qualifications)
                        VALUES (%s, %s, %s, %s, TO_DATE(%s, 'Mon YYYY'), %s, %s)
                        """, (
                            username,
                            card.get("name", ""),
                            card.get("reg_no", ""),
                            card.get("card_type", ""),
                            card.get("date_of_expiration", ""),
                            card.get("scheme_name", ""),
                            card.get("qualifications", [])
                        )
                    )
                    inserted_count+=1
                except errors.UniqueViolation as e:
                    logger.warning(f"Skipping duplicate card for {username}: {str(e)}")
                    db.rollback()  # Rollback the transaction for this card
                    continue
            db.commit()
            logger.info(f"Inserted {len(cards)} cards for user {username}")
    except psycopg2.Error as e:
        logger.error(f"Failed to insert cards into database for {username}: {e}")
        db.rollback()
        raise DatabaseInsertionError(f"Database insertion error: {str(e)}")


@celery_app.task(bind=True, max_retries=3, retry_backoff=True)
def validate_cscs_card(self, username: str, request: Dict[str, Any]):
    task_key = f"task:{username}:{request['registration_number']}"
    try:
        cel_log.info("Validating CSCS card for %s", username)
        validation_request = ValidationRequest(**request)
        async def run_validation():
            return await validate_cscs_certification(ws_endpoint, validation_request)
        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                validation_result = asyncio.run_coroutine_threadsafe(run_validation(),loop).result()
            else:
                validation_result = loop.run_until_complete(run_validation())
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            validation_result = loop.run_until_complete(run_validation())
        # validation_result = asyncio.run(validate_cscs_certification(ws_endpoint, validation_request))
        logger.info(f"Validation result for {username}: {validation_result}")
        
        if not validation_result.get("success"):
            logger.warning(f"Validation failed for {username}: {validation_result.get('error')}")
            self.retry(countdown=60)
        
        cards_data = validation_result.get("cards_data", [])
        if not cards_data:
            logger.warning(f"No cards found for {username}, retrying...")
            self.retry(countdown=60)
        db = connect_db()
        try:
            insert_cards_to_db(db, cards_data, username)
            return {"success": True, "message": "CSCS certification validated and database updated.", "cards_data": cards_data}
        except DatabaseInsertionError as e:
            if "duplicate key value violates unique constraint" in str(e):
                logger.info(f"Duplicate card data for {username}, treating as success since data is already in database.")
                return {"success": True, "message": "Card data already exists in database.", "cards_data": cards_data}
            else:
                logger.error(f"Non-duplicate database error for {username}: {str(e)}")
                self.retry(exc=e, countdown=60)
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Task failed for {username}: {str(e)}")
        self.retry(exc=e, countdown=60)  # Retry after 60 seconds, up to 3 times
        return {"success": False, "message": f"Task failed: {str(e)}"}
    finally:
        try:
            redis_client.delete(task_key)
            logger.info(f"Removed deduplication key {task_key} for {username}")
        except Exception as e:
            logger.error(f"Failed to delete deduplication key {task_key}: {str(e)}")


@celery_app.task(bind=True, max_retries=3, retry_backoff=True)
def admin_validate_cscs_card_task(self, request: Dict[str, Any]):
    task_key = f"admin_task:{request['registration_number']}"
    try:
        cel_log.info("Admin Validating CSCS card")
        validation_request = ValidationRequest(**request)
        async def run_admin_validation():
            return await validate_cscs_certification(ws_endpoint, validation_request)
        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                validation_result = asyncio.run_coroutine_threadsafe(run_admin_validation(),loop).result()
            else:
                validation_result = loop.run_until_complete(run_admin_validation())
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            validation_result = loop.run_until_complete(run_admin_validation())
        # validation_result = asyncio.run(validate_cscs_certification(ws_endpoint, validation_request))
        if validation_result.get("success") and validation_result.get("cards_data"):
            cards_data = validation_result["cards_data"]
            if cards_data:
                logger.info(f"Admin Validation result: {validation_result}")
                return {"success": True, "cards_data": cards_data}
        return {"success": False, "message": "No active cards found."}
    except Exception as e:
        logger.error(f"Admin Task failed: {str(e)}")
        self.retry(exc=e, countdown=60)  
    finally:
        try:
            redis_client.delete(task_key)
            logger.info(f"Removed deduplication key {task_key}")
        except Exception as e:
            logger.error(f"Failed to delete deduplication key {task_key}: {str(e)}")

@celery_app.task
def cleanup_stale_task_keys():
    keys = redis_client.keys("task:*")
    for key in keys:
        task_id = redis_client.get(key)
        task = AsyncResult(task_id, app=celery_app)
        if task.state not in ['PENDING', 'RECEIVED', 'STARTED', 'RETRY']:
            redis_client.delete(key)
            logger.info(f"Cleaned up stale key {key}")

# Test function
if __name__ == "__main__":
    test_request = {
        "scheme": "CSCS",
        "first_name": "John",
        "last_name": "Doe",
        "registration_number": "123456789",
        "expiry_date": "2025-12-31",
        "hse_tested": True,
        "role": "Worker"
    }
    result = validate_cscs_card.delay("test89865@gmail.com", test_request)  
    print("Task queued. Result (async):", result.get(timeout=300))  