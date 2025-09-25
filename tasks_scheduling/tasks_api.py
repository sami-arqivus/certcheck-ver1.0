from celery_app import celery_app
import os         # type: ignore[import-untyped]
import psycopg2                                 # type: ignore[import-untyped]
from psycopg2.extras import RealDictCursor     # type: ignore[import-untyped]
import pandas as pd             # type: ignore[import-untyped]  
from io import BytesIO
import json
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks                    # type: ignore[import-untyped]
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
    # ssl=True,
    # ssl_cert_reqs='required',
    # ssl_ca_certs=ssl_ca_certs,
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
    

if __name__ == "__main__":
    import uvicorn                          # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8004)