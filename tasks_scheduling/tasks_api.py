from celery_app import celery_app
import os         # type: ignore[import-untyped]
import psycopg2                                 # type: ignore[import-untyped]
from psycopg2.extras import RealDictCursor     # type: ignore[import-untyped]
import pandas as pd             # type: ignore[import-untyped]  
from io import BytesIO
import json
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, File, UploadFile                    # type: ignore[import-untyped]
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm            # type: ignore[import-untyped]   
from fastapi.middleware.cors import CORSMiddleware                                    # type: ignore[import-untyped] 
import datetime
from dotenv import load_dotenv                          # type: ignore[import-untyped]
load_dotenv()
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field                     # type: ignore[import-untyped]
from typing import List, Optional, Dict, Any
from jose import JWTError, jwt                   # type: ignore[import-untyped]     
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
# import sys
# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from tasks import validate_cscs_card, admin_validate_cscs_card_task
from celery.exceptions import CeleryError
from pydantic import ValidationError
from redis import Redis
from urllib.parse import urlparse
from celery.result import AsyncResult
import httpx
import base64
from PIL import Image
import pytesseract
import fitz  # PyMuPDF for PDF processing
import io
import re
from openai import OpenAI
from pdf2image import convert_from_path
import tempfile
from pathlib import Path


app = FastAPI(title = "Task scheduler API", description = "This API is used to schedule tasks using Celery.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ValidationRequest(BaseModel):
    scheme: str
    first_name: Optional[str]
    last_name: str
    registration_number: str
    expiry_date: Optional[str]
    hse_tested: Optional[bool]
    role: Optional[str]

class TaskResponse(BaseModel):
    task_id: str
    status: str

class CSCSCardJson(BaseModel):
    scheme: str
    first_name: str
    last_name: str
    registration_number: str
    expiry_date: str
    hse_tested: bool
    role: str

# Initialize OpenAI client
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise HTTPException(status_code=500, detail="OPENAI_API_KEY not found in .env file")

import httpx

# Create a custom HTTP client without proxy settings
http_client = httpx.Client(proxies=None)
openai_client = OpenAI(api_key=OPENAI_API_KEY, http_client=http_client)

# Retry configuration for OpenAI API calls
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from openai import APIError

@retry(
    stop=stop_after_attempt(10),  # Retry up to 10 times
    wait=wait_exponential(multiplier=1, min=4, max=60),  # Exponential backoff: 4s, 8s, 16s, ..., up to 60s
    retry=retry_if_exception_type((APIError, httpx.HTTPError)),  # Retry on OpenAI or network errors
    before_sleep=lambda retry_state: logger.info(f"Retrying OpenAI API call: attempt {retry_state.attempt_number}, error: {retry_state.outcome.exception()}")
)
async def call_openai_parse(client, model, input_data):
    return client.responses.parse(model=model, input=input_data, text_format=CSCSCardJson)

def encode_image(image_file):
    """Encode image file to base64 string."""
    return base64.b64encode(image_file.read()).decode("utf-8")

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
    username=username,
    host=host,
    port=port,
    password=password,
    db=db,
    ssl=True,
    ssl_cert_reqs='required',
    ssl_ca_certs=ssl_ca_certs,
    decode_responses=True 
)


# @app.post("/invoke-validation-cscs-task/", response_model=TaskResponse)
# async def invoke_validation_cscs_task(username: str, request: ValidationRequest):
#     try:
#         task = validate_cscs_card.delay(username, request.model_dump())
#         return {"task_id": task.id, "status": "Validation has been submitted"}
#     except (CeleryError, ValidationError) as e:
#         raise HTTPException(status_code=500, detail=f"Task invocation failed: {str(e)}")
#     except Exception as e:
#         logger.error(f"Unexpected error: {str(e)}")
#         raise HTTPException(status_code=500, detail="Internal server error")
    
# @app.post("/admin_validate_cscs_card/")
# async def admin_validate_cscs_card(request: ValidationRequest):
#     try:
#         task = admin_validate_cscs_card_task.delay(request.model_dump())
#         result = task.get(timeout=900)
#         return {"status": "SUCCESS", "result": result}
#     except TimeoutError:
#         raise HTTPException(status_code=504, detail="Task took too long to complete")
#         # return {"task_id": task.id, "status": "Validation Submitted"}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))




@app.post("/invoke-validation-cscs-task/", response_model=TaskResponse)
async def invoke_validation_cscs_task(username: str, request: ValidationRequest):
    try:
        task_key = f"task:{username}:{request.registration_number}"
        existing_task_id = redis_client.get(task_key)
        if existing_task_id:
            logger.info("task pre existing check done")
            task = AsyncResult(existing_task_id, app=celery_app)
            if task.state in ['PENDING', 'RECEIVED', 'STARTED', 'RETRY']:
                logger.info(f"Duplicate task detected for {username} with registration {request.registration_number}. Existing task ID: {existing_task_id}")
                return {"task_id": existing_task_id, "status": "Task already in progress"}
            else:
                redis_client.delete(task_key)
        task = validate_cscs_card.delay(username, request.model_dump())
        redis_client.setex(task_key, 3600, task.id)
        logger.info(f"Queued new task for {username} with registration {request.registration_number}. Task ID: {task.id}")
        
        return {"task_id": task.id, "status": "Validation has been submitted"}
    
    except (CeleryError, ValidationError) as e:
        logger.error(f"Task invocation failed for {username}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Task invocation failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error for {username}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
@app.post("/admin_validate_cscs_card/")
async def admin_validate_cscs_card(request: ValidationRequest):
    try:
        task_key = f"admin_task:{request.registration_number}"
        existing_task_id = redis_client.get(task_key)
        if existing_task_id:
            task = AsyncResult(existing_task_id, app=celery_app)
            if task.state in ['PENDING', 'RECEIVED', 'STARTED', 'RETRY']:
                logger.info(f"Duplicate admin task detected for registration {request.registration_number}. Existing task ID: {existing_task_id}")
                return {"status": "PENDING", "message": f"Task {existing_task_id} already in progress", "task_id": existing_task_id}
            else:
                redis_client.delete(task_key)
        task = admin_validate_cscs_card_task.delay(request.model_dump())
        redis_client.setex(task_key, 3600, task.id)
        logger.info(f"Queued admin task for registration {request.registration_number}. Task ID: {task.id}")
        
        return {"status": "SUBMITTED", "message": "Validation task submitted successfully", "task_id": task.id}
    except Exception as e:
        logger.error(f"Admin task failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin_validate_cscs_card/{task_id}")
async def get_admin_validation_result(task_id: str):
    try:
        task = AsyncResult(task_id, app=celery_app)
        if task.state == 'PENDING':
            return {"status": "PENDING", "message": "Task is still processing"}
        elif task.state == 'SUCCESS':
            return {"status": "SUCCESS", "result": task.result}
        elif task.state == 'FAILURE':
            return {"status": "FAILURE", "message": str(task.info)}
        else:
            return {"status": task.state, "message": f"Task is in {task.state} state"}
    except Exception as e:
        logger.error(f"Failed to get task result: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def extract_cscs_data_with_openai(file_content: bytes, file_extension: str) -> dict:
    """Extract CSCS card data using OpenAI GPT-4.1 vision model"""
    try:
        logger.info(f"Processing file with OpenAI GPT-4.1: {len(file_content)} bytes, extension: {file_extension}")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            input_content = [
                {
                    "type": "input_text",
                    "text": (
                        "Imagine You are an expert in extracting data from CSCS card (UK Construction Skills Certification Scheme) that is needed to validate the candidate. "
                        "You have to select 1 scheme that the card belongs to from the following list: [ACAD, ACE, ADIA, ADSA(DHF), ALLMI, AMI, Allianz UK, BFBi, British Engineering Services, CCDO,CISRS, CPCS, CSCS, CSR, CSWIP, DSA, ECS (JIB), ECS (SJIB), EUSR, Engineering Services Skillcard, FASET, FISS, GEA, HSB, ICATS, IEXPE, IPAF, JIB PMES, LEEA, LISS, Llyods British, MPQC, NPORS, PASMA, Q-card, SAFed, SEIRS, SICCS, SNIJIB, TICA, TTM, Train the painter]"
                        "Extract expiry date in str format not in datetime.data(). "
                    ),
                }
            ]
            
            if file_extension in ["png", "jpg", "jpeg"]:
                with open(temp_file_path, "rb") as image_file:
                    base64_image = encode_image(image_file)
                input_content.append({
                    "type": "input_image",
                    "image_url": f"data:image/jpeg;base64,{base64_image}",
                })
            elif file_extension == "pdf":
                try:
                    images = convert_from_path(temp_file_path)
                    if not images:
                        raise HTTPException(status_code=400, detail="No images found in the PDF")
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_image_file:
                        images[0].save(temp_image_file.name, "JPEG")
                        with open(temp_image_file.name, "rb") as image_file:
                            base64_image = encode_image(image_file)
                        os.unlink(temp_image_file.name) 
                    input_content.append({
                        "type": "input_image",
                        "image_url": f"data:image/jpeg;base64,{base64_image}",
                    })
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Failed to extract images from PDF: {str(e)}")

            logger.info("Extracting data from certificate/card using OpenAI...")
            input_data = [
                {
                    "role": "user",
                    "content": input_content,
                }
            ]
            
            response = await call_openai_parse(
                client=openai_client,
                model="gpt-4.1",
                input_data=input_data,
            )
            
            cscs_response = response.output_parsed
            logger.info(f"OpenAI Response: {cscs_response}")
            cscs_json = cscs_response.model_dump()
            logger.info(f"CSCS JSON: {cscs_json}")
            
            return cscs_json
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        logger.error(f"OpenAI extraction failed: {str(e)}")
        return {}


@app.post("/ocr-extract/")
async def ocr_extract(file: UploadFile = File(...)):
    """
    Extract CSCS card data using OpenAI GPT-4.1 vision model
    """
    try:
        logger.info(f"Processing file: {file.filename}, content_type: {file.content_type}, size: {file.size}")
        
        # Read file content
        file_content = await file.read()
        logger.info(f"Read {len(file_content)} bytes from file")
        
        if not file_content:
            return {
                "success": False,
                "message": "File is empty or could not be read",
                "extracted_data": None
            }
        
        # Get file extension
        file_extension = file.filename.split(".")[-1].lower() if file.filename else ""
        
        # Validate file type
        allowed_extensions = ["png", "jpg", "jpeg", "pdf"]
        if file_extension not in allowed_extensions:
            return {
                "success": False,
                "message": f"Unsupported file type: {file_extension}. Please upload images (JPG, PNG, etc.) or PDF files.",
                "extracted_data": None
            }
        
        # Extract CSCS data using OpenAI
        extracted_data = await extract_cscs_data_with_openai(file_content, file_extension)
        logger.info(f"OpenAI extracted data: {extracted_data}")
        
        if not extracted_data:
            return {
                "success": False,
                "message": "Could not extract data from file using OpenAI",
                "extracted_data": None
            }
        
        # Check if we have minimum required fields
        has_required_fields = (
            extracted_data.get("scheme") and 
            extracted_data.get("registration_number") and 
            extracted_data.get("last_name")
        )
        
        return {
            "success": True,
            "message": "Data extracted successfully using OpenAI GPT-4.1",
            "extracted_data": extracted_data,
            "has_required_fields": has_required_fields
        }
        
    except Exception as e:
        logger.error(f"OpenAI extraction failed: {str(e)}")
        return {
            "success": False,
            "message": f"Error processing file: {str(e)}",
            "extracted_data": None
        }

@app.post("/bulk-verify-cards/")
async def bulk_verify_cards(files: list[UploadFile] = File(...)):
    """
    Bulk verify multiple CSCS card files using OpenAI GPT-4.1 and Playwright validation
    """
    results = []
    
    for file in files:
        try:
            # Step 1: Use OpenAI GPT-4.1 for data extraction (same as cert-to-json)
            ocr_result = await ocr_extract(file)
            
            if ocr_result["success"] and ocr_result.get("has_required_fields"):
                extracted_data = ocr_result["extracted_data"]
                
                # Step 2: Call admin validation task with the extracted data
                validation_request = {
                    "scheme": extracted_data.get("scheme", ""),
                    "registration_number": extracted_data.get("registration_number", ""),
                    "last_name": extracted_data.get("last_name", ""),
                    "first_name": extracted_data.get("first_name", ""),
                    "expiry_date": extracted_data.get("expiry_date"),
                    "hse_tested": extracted_data.get("hse_tested"),
                    "role": extracted_data.get("role")
                }
                
                # Call the admin validation task
                validation_task = admin_validate_cscs_card_task.delay(validation_request)
                validation_result = validation_task.get(timeout=900)  # 15 minutes timeout
                
                results.append({
                    "filename": file.filename,
                    "file_type": file.content_type,
                    "success": True,
                    "message": "OpenAI extraction and Playwright validation completed",
                    "extracted_data": extracted_data,
                    "validation_data": validation_result
                })
            else:
                results.append({
                    "filename": file.filename,
                    "file_type": file.content_type,
                    "success": False,
                    "message": ocr_result.get("message", "Could not extract required card details"),
                    "extracted_data": ocr_result.get("extracted_data"),
                    "validation_data": None
                })
                    
        except Exception as e:
            results.append({
                "filename": file.filename,
                "file_type": file.content_type,
                "success": False,
                "message": f"Error processing file: {str(e)}",
                "extracted_data": None,
                "validation_data": None
            })
    
    return {
        "success": True,
        "message": f"Processed {len(files)} files using OpenAI GPT-4.1 and Playwright validation",
        "results": results,
        "summary": {
            "total": len(files),
            "successful": len([r for r in results if r["success"]]),
            "failed": len([r for r in results if not r["success"]])
        }
    }

if __name__ == "__main__":
    import uvicorn                          # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8004)