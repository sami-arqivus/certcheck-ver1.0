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

def extract_text_from_image(image_bytes: bytes) -> str:
    """Extract text from image using OCR"""
    try:
        # Check if we have valid image data
        if not image_bytes or len(image_bytes) == 0:
            logger.error("Empty image data provided")
            return ""
        
        logger.info(f"Processing image with {len(image_bytes)} bytes")
        
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_bytes))
        logger.info(f"Image opened successfully: {image.size}, mode: {image.mode}")
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to grayscale for better OCR
        if image.mode != 'L':
            image = image.convert('L')
        
        # Enhance contrast
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        
        # Extract text using Tesseract with multiple PSM modes
        text = ""
        for psm in [6, 3, 4]:  # Try different page segmentation modes
            try:
                text = pytesseract.image_to_string(image, config=f'--psm {psm}')
                if text.strip():
                    logger.info(f"OCR successful with PSM {psm}, extracted {len(text)} characters")
                    break
            except Exception as ocr_error:
                logger.warning(f"OCR failed with PSM {psm}: {str(ocr_error)}")
                continue
        
        return text.strip()
    except Exception as e:
        logger.error(f"OCR extraction failed: {str(e)}")
        return ""

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF - handles both text-based and scanned PDFs"""
    try:
        logger.info(f"Opening PDF with {len(pdf_bytes)} bytes")
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        logger.info(f"PDF opened successfully, page count: {pdf_document.page_count}")
        
        text = ""
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            page_text = page.get_text()
            logger.info(f"Page {page_num + 1} text length: {len(page_text)}")
            
            # If no text found, try OCR on the page image
            if not page_text.strip():
                logger.info(f"No text found on page {page_num + 1}, trying OCR...")
                try:
                    # Convert page to image
                    mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better OCR
                    pix = page.get_pixmap(matrix=mat)
                    img_data = pix.tobytes("png")
                    
                    # Use OCR on the image
                    page_text = extract_text_from_image(img_data)
                    logger.info(f"OCR on page {page_num + 1} extracted {len(page_text)} characters")
                except Exception as ocr_error:
                    logger.warning(f"OCR failed on page {page_num + 1}: {str(ocr_error)}")
                    page_text = ""
            
            text += page_text
        
        pdf_document.close()
        logger.info(f"Total extracted text length: {len(text)}")
        return text.strip()
    except Exception as e:
        logger.error(f"PDF extraction failed: {str(e)}")
        return ""

def parse_cscs_data(text: str) -> dict:
    """Parse CSCS card data from extracted text"""
    try:
        # Common CSCS card patterns
        data = {
            "scheme": None,
            "registration_number": None,
            "last_name": None,
            "first_name": None,
            "expiry_date": None,
            "hse_tested": None,
            "role": None
        }
        
        # Convert to uppercase for pattern matching
        text_upper = text.upper()
        
        # Extract scheme (CPCS, CSCS, etc.)
        scheme_patterns = [r'CPCS', r'CSCS', r'CITB']
        for pattern in scheme_patterns:
            if re.search(pattern, text_upper):
                data["scheme"] = re.search(pattern, text_upper).group()
                break
        
        # Extract registration number (usually 8 digits)
        reg_pattern = r'(\d{8,})'
        reg_match = re.search(reg_pattern, text)
        if reg_match:
            data["registration_number"] = reg_match.group(1)
        
        # Extract names (look for common name patterns)
        name_patterns = [
            r'([A-Z][A-Z\s]+)',  # All caps names
            r'([A-Z][a-z]+\s+[A-Z][a-z]+)',  # Proper case names
        ]
        
        for pattern in name_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                if len(match.split()) >= 2:  # At least first and last name
                    names = match.split()
                    data["last_name"] = names[-1]  # Last word is last name
                    data["first_name"] = names[0]  # First word is first name
                    break
            if data["last_name"]:
                break
        
        # Extract expiry date (various date formats)
        date_patterns = [
            r'(\d{2}/\d{2}/\d{4})',  # DD/MM/YYYY
            r'(\d{2}-\d{2}-\d{4})',  # DD-MM-YYYY
            r'(\d{4}-\d{2}-\d{2})',  # YYYY-MM-DD
        ]
        
        for pattern in date_patterns:
            date_match = re.search(pattern, text)
            if date_match:
                data["expiry_date"] = date_match.group(1)
                break
        
        return data
    except Exception as e:
        logger.error(f"Data parsing failed: {str(e)}")
        return {}

@app.post("/ocr-extract/")
async def ocr_extract(file: UploadFile = File(...)):
    """
    Extract text and parse CSCS card data from uploaded file
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
        
        # Determine file type and extract text
        if file.content_type and 'pdf' in file.content_type.lower():
            logger.info("Processing as PDF")
            text = extract_text_from_pdf(file_content)
        elif file.content_type and any(img_type in file.content_type.lower() for img_type in ['image/', 'jpeg', 'jpg', 'png', 'gif', 'bmp', 'tiff']):
            logger.info("Processing as image")
            text = extract_text_from_image(file_content)
        else:
            logger.warning(f"Unsupported file type: {file.content_type}. Skipping file.")
            return {
                "success": False,
                "message": f"Unsupported file type: {file.content_type}. Please upload images (JPG, PNG, etc.) or PDF files.",
                "extracted_data": None
            }
        
        logger.info(f"Extracted text length: {len(text) if text else 0}")
        
        if not text:
            return {
                "success": False,
                "message": "Could not extract text from file",
                "extracted_data": None
            }
        
        # Parse CSCS card data
        parsed_data = parse_cscs_data(text)
        logger.info(f"Parsed data: {parsed_data}")
        
        # Check if we have minimum required fields
        has_required_fields = (
            parsed_data.get("scheme") and 
            parsed_data.get("registration_number") and 
            parsed_data.get("last_name")
        )
        
        return {
            "success": True,
            "message": "Text extracted successfully",
            "extracted_data": parsed_data,
            "raw_text": text,
            "has_required_fields": has_required_fields
        }
        
    except Exception as e:
        logger.error(f"OCR extraction failed: {str(e)}")
        return {
            "success": False,
            "message": f"Error processing file: {str(e)}",
            "extracted_data": None
        }

@app.post("/bulk-verify-cards/")
async def bulk_verify_cards(files: list[UploadFile] = File(...)):
    """
    Bulk verify multiple CSCS card files using internal OCR
    """
    results = []
    
    for file in files:
        try:
            # Use internal OCR extraction
            ocr_result = await ocr_extract(file)
            
            if ocr_result["success"] and ocr_result.get("has_required_fields"):
                extracted_data = ocr_result["extracted_data"]
                
                # For bulk verification, we'll just return the OCR results
                # The actual validation can be done manually if needed
                results.append({
                    "filename": file.filename,
                    "file_type": file.content_type,
                    "success": True,
                    "message": "OCR extraction successful - ready for manual verification",
                    "extracted_data": extracted_data,
                    "validation_data": {
                        "status": "extracted",
                        "note": "Use manual verification for actual validation"
                    }
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
        "message": f"Processed {len(files)} files",
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