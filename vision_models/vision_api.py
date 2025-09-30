import os
import base64
import json     # type: ignore
from fastapi import FastAPI, File, UploadFile, HTTPException  # type: ignore
from openai import OpenAI               # type: ignore
from openai import APIError               # type: ignore
from dotenv import load_dotenv              # type: ignore
from pathlib import Path
import tempfile
from pydantic import BaseModel      # type: ignore
from typing import Dict
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
# import boto3        # type: ignore
from fastapi.security import OAuth2PasswordBearer   # type: ignore
from jose import JWTError, jwt  # type: ignore
from fastapi import Depends, status   # type: ignore
# from datetime import date
from deepface import DeepFace  # type: ignore
from pdf2image import convert_from_path, convert_from_bytes     # type: ignore
# from pdf2image.exceptions import (                                  # type: ignore
#     PDFInfoNotInstalledError,
#     PDFPageCountError,
#     PDFSyntaxError
# )
# import shutil
import psycopg2                             # type: ignore
from psycopg2 import connect, Error as psycopg2Error     # type: ignore
from psycopg2.extras import RealDictCursor                  # type: ignore
import httpx  # type: ignore
# import datetime
import logging
# import asyncio
# from fastapi import BackgroundTasks, Request, Response  # type: ignore
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="deepface")  # type: ignore
from tenacity import retry, stop_after_attempt, wait_fixed, wait_exponential, retry_if_exception_type  # type: ignore
# from pydantic import ValidationError  # type: ignore
from contextlib import asynccontextmanager
# from playwright_stealth import Stealth # type: ignore
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise HTTPException(status_code=500, detail="OPENAI_API_KEY not found in .env file")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")
# CAPSOLVER_API_KEY = os.getenv("CAPSOLVER_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

@asynccontextmanager
async def lifespan(app : FastAPI):
    print("Starting up the Vision Models API...")
    logger.info("Starting up the Vision Models API...")
    try:
        DeepFace.build_model("Facenet512")
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        dummy_image_path = os.path.join(BASE_DIR, "sixfaces410.jpg")
        if os.path.exists(dummy_image_path):
            DeepFace.extract_faces(dummy_image_path, detector_backend="retinaface")
            logger.info("RetinaFace model preloaded successfully")
            DeepFace.extract_faces(dummy_image_path, detector_backend="opencv")
            logger.info("OpenCV model preloaded successfully")
        else:
            logger.warning("Dummy image not found; skipping RetinaFace preload")
        logger.info("DeepFace models preloaded successfully")
    except Exception as e:
        logger.error(f"Failed to preload DeepFace models: {str(e)}")
    yield
    logger.info("Shutting down the Vision Models API...")

app = FastAPI(title="Vision Models API", description="API for Vision Models", lifespan=lifespan)
# origins = [
#     "http://localhost:8080",
#     "http://localhost:8081",
# ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"]
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
    conn = connect_db()
    try:
        yield conn
    finally:
        conn.close()


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/user/me", auto_error=False)        # can be written differently
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
        # t_token = token
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
    
async def get_token(token: str = Depends(oauth2_scheme)):
    return token
    

class ImageToJsonResponse(BaseModel):
    json_data: Dict
    output_path: str

class CSCSImagetoJsonResponse(BaseModel):
    json_data: Dict
    output_path: str

class FacialRecognitionResponse(BaseModel):
    verified: bool
    distance: float
    threshold: float
    model: str
    detector_backend: str
    facial_areas: Dict[str, Dict]
    error: str = None  # Optional error field for error handling

class ValidationRequest(BaseModel):
    scheme: str
    first_name: str
    last_name: str
    registration_number: str
    expiry_date: str
    hse_tested: bool
    role: str


# ---------------------------------- retry configurations -------------------------------------------------------------------------------------------------------------------------------------
@retry(
    stop=stop_after_attempt(10),  # Retry up to 10 times
    wait=wait_exponential(multiplier=1, min=4, max=60),  # Exponential backoff: 4s, 8s, 16s, ..., up to 60s
    retry=retry_if_exception_type((APIError, httpx.HTTPError)),  # Retry on OpenAI or network errors
    before_sleep=lambda retry_state: logger.info(f"Retrying OpenAI API call: attempt {retry_state.attempt_number}, error: {retry_state.outcome.exception()}")
)
async def call_openai_create(client, model, input_data):
    return await client.responses.create(model=model, input=input_data)
    # return await client.responses.create(model=model, input=input_data)

@retry(
    stop=stop_after_attempt(10),  # Retry up to 10 times
    wait=wait_exponential(multiplier=1, min=4, max=60),  # Exponential backoff: 4s, 8s, 16s, ..., up to 60s
    retry=retry_if_exception_type((APIError, httpx.HTTPError)),  # Retry on OpenAI or network errors
    before_sleep=lambda retry_state: logger.info(f"Retrying OpenAI API call: attempt {retry_state.attempt_number}, error: {retry_state.outcome.exception()}")
)
async def call_openai_parse(client, model, input_data):
    return client.responses.parse(model=model, input=input_data, text_format=CSCSCardJson)

@retry(
    stop=stop_after_attempt(10),  # Retry up to 10 times
    wait=wait_exponential(multiplier=1, min=4, max=60),  # Exponential backoff
    retry=retry_if_exception_type((RuntimeError, ValueError)),  # Retry on DeepFace runtime or value errors
    before_sleep=lambda retry_state: logger.info(f"Retrying DeepFace operation: attempt {retry_state.attempt_number}, error: {retry_state.outcome.exception()}")
)
async def deepface_verify(img1_path, img2_path, model_name, detector_backend, threshold):
    return DeepFace.verify(
        img1_path=img1_path,
        img2_path=img2_path,
        model_name=model_name,
        detector_backend=detector_backend,
        threshold=threshold
    )

@retry(
    stop=stop_after_attempt(10),
    wait=wait_exponential(multiplier=1, min=4, max=60),
    retry=retry_if_exception_type((RuntimeError, ValueError)),
    before_sleep=lambda retry_state: logger.info(f"Retrying DeepFace face extraction: attempt {retry_state.attempt_number}, error: {retry_state.outcome.exception()}")
)
async def deepface_extract_faces(img_path, detector_backend, anti_spoofing=False):
    return DeepFace.extract_faces(img_path, detector_backend=detector_backend, anti_spoofing=anti_spoofing)


# --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

def encode_image(image_file):
    """Encode image file to base64 string."""
    return base64.b64encode(image_file.read()).decode("utf-8")

def validate_image_file(file: UploadFile):
    """Validate image file type."""
    allowed_extensions = ["jpg", "jpeg", "png", "JPG", "JPEG"]
    file_extension = file.filename.split(".")[-1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )
      

class CSCSCardJson(BaseModel):
    scheme : str
    first_name: str
    last_name: str
    registration_number: str
    expiry_date: str
    hse_tested : bool
    role : str

CSCS_CARD_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "scheme": {"type": "string"},
        "first_name": {"type": "string"},
        "last_name": {"type": "string"},
        "registration_number": {"type": "string"},
        "expiry_date": {"type": "string"},
        "hse_tested": {"type": "boolean"},
        "role": {"type": "string"}
    },
    "required": ["scheme", "first_name", "last_name", "registration_number", "expiry_date", "hse_tested", "role"],
    "additionalProperties": False
}

@app.post("/image-to-json", response_model=ImageToJsonResponse)
async def image_to_json(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    print(current_user)
    user_id = current_user["user_id"]
    allowed_extensions = ["png", "jpg", "jpeg", "JPG", "JPEG"]
    file_extension = file.filename.split(".")[-1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )

    file_content = await file.read()
    async with httpx.AsyncClient() as api_client:
        resp = await api_client.post(
            f"http://aws_container:8001/upload-file/?user_id={user_id}",
            files={"file": (file.filename, file_content, file.content_type)}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Failed to upload file: {resp.text}")
    print("response from upload-file:", resp.status_code, resp.text)

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as temp_file:
        # temp_file.write(await file.read())
        temp_file.write(file_content)
        temp_image_path = temp_file.name

    try:
        with open(temp_image_path, "rb") as image_file:
            base64_image = encode_image(image_file)
        input_data=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": (
                                "Extract all the data from the image in the JSON format. "
                                "Try to make the data about the image understable strictly generating a JSON data. "
                                "Also mention to which category it belongs to (OPITO, MTCS, NEBOSH, RCSL, STCW, WINDA). "
                                "If its not from mentioned category, mention what is it. "
                                "And also include name as first name and last name."
                            ),
                        },
                        {
                            "type": "input_image",
                            "image_url": f"data:image/jpeg;base64,{base64_image}",
                        },
                    ],
                }
            ]
        # response = client.responses.create(
        #     model="gpt-4.1",  # Use gpt-4o for better vision capabilities
        #     input=input_data
        #     # instructions="Respond only with valid JSON matching the schema—no extra text."
        # )
        response = await call_openai_create(
            client=client,
            model="gpt-4.1",
            input_data=input_data)
        result = response.output_text
        sub_res = result[7:len(result) - 3]

        file_name = Path(file.filename).stem
        # output_path = save_json_file(sub_res, file_name)

        # Upload JSON to S3
        async with httpx.AsyncClient() as api_client:
            resp2 = await api_client.post(
                f"http://aws_container:8001/upload-file/?user_id={user_id}",
                files={"file": (f"{file_name}.json",json.dumps(sub_res).encode(), "application/json")}
            )
            if resp2.status_code != 200:
                raise HTTPException(status_code=resp2.status_code, detail=f"Failed to upload JSON file: {resp2.text}")
        print("response from upload-file for JSON:", resp2.status_code, resp2.text)

        return {
            "json_data": json.loads(sub_res),
            "output_path": resp2.json().get('s3_path', '')
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse JSON output from OpenAI")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    finally:
        os.unlink(temp_image_path)


@app.post("/cert-to-json", response_model=CSCSImagetoJsonResponse)
async def cert_to_json(file: UploadFile = File(...), current_user: dict = Depends(get_current_user), db = Depends(get_db), token = Depends(get_token)):
    # background_tasks = BackgroundTasks()
    print(current_user)
    username = current_user["username"]
    user_id = current_user["user_id"]
    allowed_extensions = ["png", "jpg", "jpeg", "JPG", "JPEG", "pdf"]
    file_extension = file.filename.split(".")[-1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    file_content = await file.read()
    print("Uploading certificate to S3...")
    async with httpx.AsyncClient() as api_client:
        resp = await api_client.post(
            f"http://aws_container:8001/upload-certificate/?user_id={user_id}",
            files={"file": (file.filename, file_content, file.content_type)}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Failed to upload file: {resp.text}")
    print("response from upload-file:", resp.status_code, resp.text)
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as temp_file:
        temp_file.write(file_content)
        temp_image_path = temp_file.name

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
            with open(temp_image_path, "rb") as image_file:
                base64_image = encode_image(image_file)
            input_content.append({
                "type": "input_image",
                "image_url": f"data:image/jpeg;base64,{base64_image}",
            })
        elif file_extension == "pdf":
            try:
                images = convert_from_path(temp_image_path)
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

        print("Extracting data from certificate/card...")
        input_data=[
                {
                    "role": "user",
                    "content": input_content,
                }
            ]
        response = await call_openai_parse(
            client=client,
            model="gpt-4.1",
            input_data=input_data,
        )
        cscs_response = response.output_parsed
        print("CSCS Response:", cscs_response)
        cscs_json = cscs_response.model_dump()
        print("CSCS JSON:", cscs_json)
        file_name = Path(file.filename).stem
        print("Uploading certificate JSON to S3...")
        async with httpx.AsyncClient() as api_client:
            resp2 = await api_client.post(
                f"http://aws_container:8001/upload-certificate/?user_id={user_id}",
                files={"file": (f"{file_name}.json", json.dumps(cscs_json).encode(), "application/json")}
            )
            if resp2.status_code != 200:
                raise HTTPException(status_code=resp2.status_code, detail=f"Failed to upload JSON file: {resp2.text}")
        print("response from upload-file for JSON:", resp2.status_code, resp2.text)
        try:
            s3_path_data = json.loads(resp.text)
            s3_path = s3_path_data['s3_path']
            print("S3 path:", s3_path)
            json_path_data = json.loads(resp2.text)
            output_path = json_path_data['s3_path']
            with db.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO certificates (user_id, certificate_name) VALUES (%s, %s) RETURNING certificate_id",
                    (user_id, file.filename)
                )
                cert_id = cursor.fetchone()['certificate_id']
                cursor.execute(
                    "INSERT INTO cert_details (certificate_id, bucket_address, json_address, user_id) VALUES (%s, %s, %s, %s)",
                    (cert_id, s3_path, output_path, user_id)
                )
                db.commit()
                cursor.close()
            validation_request = ValidationRequest(
                                                scheme=cscs_json.get("scheme", "CSCS"),  # Default to CSCS if not found
                                                first_name=cscs_json.get("first_name", ""),  # Extract from cscs_json
                                                last_name=cscs_json.get("last_name", ""),  # Extract from cscs_json
                                                registration_number=cscs_json.get("registration_number", cscs_json.get("reg_no", "")),  # Fallback to reg_no
                                                expiry_date=cscs_json.get("expiry_date", ""),  # Match the extracted field
                                                hse_tested=cscs_json.get("hse_tested", False),  # Default to False if not found
                                                role=cscs_json.get("role", "")  # Extract role
                                            )
            logger.info(f"Validation Request: {validation_request.model_dump()}")
            async with httpx.AsyncClient() as api_client:
                validation_resp = await api_client.post(
                    f"http://tasks_scheduling_container:8004/invoke-validation-cscs-task/?username={username}",
                    json=validation_request.model_dump(),
                )
                if validation_resp.status_code != 200:
                    logger.error(f"Failed to invoke validation task: {validation_resp.status_code}, {validation_resp.text}")
                else:
                    logger.info(f"Successfully invoked validation task: {validation_resp.status_code}, {validation_resp.text}")
            print(f"Certificate details inserted for ID: {cert_id}")
            return {
                "json_data": cscs_json,                                       
                "output_path": output_path
            }
        except psycopg2Error as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse JSON output from OpenAI")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    finally:
        os.unlink(temp_image_path)

@app.post("/facial-recognition", response_model=FacialRecognitionResponse)
async def facial_recognition(
    reference_image: UploadFile = File(...),
    comparison_image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db) 
):
    user_id = current_user["user_id"] 
    logger.info(f"Processing facial recognition for user: {current_user or 'anonymous'}")

    print("Connected to database:", db)
    cursor = db.cursor()
    validate_image_file(reference_image)
    validate_image_file(comparison_image)

    ref_temp_path = None
    comp_temp_path = None

    id_ref = reference_image.filename
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{reference_image.filename.split('.')[-1]}") as ref_temp_file, \
         tempfile.NamedTemporaryFile(delete=False, suffix=f".{comparison_image.filename.split('.')[-1]}") as comp_temp_file:
        
        ref_temp_path = ref_temp_file.name
        comp_temp_path = comp_temp_file.name
        
        try:
            ref_image_bytes = await reference_image.read()
            comp_image_bytes = await comparison_image.read()
            # ref_temp_file.write(await reference_image.read())
            # comp_temp_file.write(await comparison_image.read())
            if not ref_image_bytes or not comp_image_bytes:
                raise HTTPException(status_code=400, detail="One or both image files are empty or invalid.")
            ref_temp_file.write(ref_image_bytes)
            comp_temp_file.write(comp_image_bytes)

            ref_temp_file.flush()
            comp_temp_file.flush()
        except Exception as e:
            logger.error(f"Error saving temporary files: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save images: {e}")
        
        try:
            print("ref_temp_path:", ref_temp_path)
            print("comp_temp_path:", comp_temp_path)
            face1 = await deepface_extract_faces(ref_temp_path, detector_backend='opencv')
            # face1 = DeepFace.extract_faces(ref_temp_path, detector_backend='opencv')
            if face1 is None:
                raise HTTPException(status_code=400, detail="No face detected in the uploaded ID image.")
            # face2  = DeepFace.extract_faces(comp_temp_path, detector_backend='opencv', anti_spoofing=True)
            face2 = await deepface_extract_faces(comp_temp_path, detector_backend='opencv', anti_spoofing=True)
            if face2 is None:
                raise HTTPException(status_code=400, detail="No face detected in the uploaded comparison image.")
            result = await deepface_verify(
                img1_path=ref_temp_path,
                img2_path=comp_temp_path,
                model_name='Facenet512',
                detector_backend='retinaface',
                threshold=0.5
            )
            logger.info(f"Facial recognition result: verified={result['verified']}, distance={result['distance']}")
            response = FacialRecognitionResponse(
                verified=result['verified'],
                distance=result['distance'],
                threshold=result['threshold'],
                model=result['model'],
                detector_backend=result['detector_backend'],
                facial_areas=result['facial_areas']
            )
            async with httpx.AsyncClient() as api_client:
                resp = await api_client.post(
                    f"http://aws_container:8001/upload-file/?user_id={user_id}",
                    files={"file": ("real_time_captured.jpg", open(comp_temp_path, "rb"), comparison_image.content_type) }  # type: ignore,
                )
                if resp.status_code != 200:
                    logger.error(f"Failed to upload file to S3: {resp.status_code}, {resp.text}")
                    raise HTTPException(status_code=resp.status_code, detail=f"Failed to upload file: {resp.text}")
                logger.info(f"Response from upload-file: {resp.status_code}, {resp.text}")
            print("id_ref:", id_ref)
            ref_img_path = f"s3://certcheck-users/user_{user_id}/{id_ref}"
            real_img_path = f"s3://certcheck-users/user_{user_id}/real_time_captured.jpg"
            if response.verified == True:
                res = "approved"
            else:
                res = "rejected"
            cursor.execute(
                "INSERT INTO id_verifications (user_id, id_image_url, realtime_photo_url, status, verified_at) " \
                "VALUES (%s, %s, %s, %s, NOW())",
                (user_id, ref_img_path, real_img_path, res)
            )
            db.commit()
            json_response = response.model_dump()
            json_response["user_id"] = user_id
            json_response["id_image_url"] = ref_img_path
            json_response["realtime_photo_url"] = real_img_path
            json_response["status"] = res
            json_file_name = f"{user_id}_facial_recognition.json"
            json_temp_path = os.path.join(tempfile.gettempdir(), json_file_name)
            with open(json_temp_path, "w") as json_file:
                json.dump(json_response, json_file, indent=4)
            async with httpx.AsyncClient() as api_client:
                json_resp = await api_client.post(
                    f"http://aws_container:8001/upload-file/?user_id={user_id}",
                    files={"file": (json_file_name, open(json_temp_path, "rb"), "application/json")}
                )
                if json_resp.status_code != 200:
                    logger.error(f"Failed to upload JSON file to S3: {json_resp.status_code}, {json_resp.text}")
                    raise HTTPException(status_code=json_resp.status_code, detail=f"Failed to upload JSON file: {json_resp.text}")
                logger.info(f"Response from upload-file for JSON: {json_resp.status_code}, {json_resp.text}")
            return response

        except Exception as e:
            logger.error(f"Error during facial recognition: {e}")
            raise HTTPException(status_code=500, detail=f"Facial recognition error: {str(e)}")

        finally:
            try:
                if os.path.exists(ref_temp_path):
                    os.unlink(ref_temp_path)
                if os.path.exists(comp_temp_path):
                    os.unlink(comp_temp_path)
                logger.debug(f"Temporary files {ref_temp_path} and {comp_temp_path} deleted.")
            except Exception as e:
                logger.error(f"Error deleting temporary files: {e}")



@app.post("/facial-recognition_test", response_model=FacialRecognitionResponse)
async def facial_recognition_test(
    reference_image: UploadFile = File(...),
    comparison_image: UploadFile = File(...)
):
    validate_image_file(reference_image)
    validate_image_file(comparison_image)

    ref_temp_path = None
    comp_temp_path = None

    id_ref = reference_image.filename
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{reference_image.filename.split('.')[-1]}") as ref_temp_file, \
         tempfile.NamedTemporaryFile(delete=False, suffix=f".{comparison_image.filename.split('.')[-1]}") as comp_temp_file:
        
        ref_temp_path = ref_temp_file.name
        comp_temp_path = comp_temp_file.name
        
        try:
            ref_image_bytes = await reference_image.read()
            comp_image_bytes = await comparison_image.read()
            # ref_temp_file.write(await reference_image.read())
            # comp_temp_file.write(await comparison_image.read())
            if not ref_image_bytes or not comp_image_bytes:
                raise HTTPException(status_code=400, detail="One or both image files are empty or invalid.")
            ref_temp_file.write(ref_image_bytes)
            comp_temp_file.write(comp_image_bytes)

            ref_temp_file.flush()
            comp_temp_file.flush()

            # Check OpenCV can read
            # if cv2.imread(ref_temp_path) is None or cv2.imread(comp_temp_path) is None:
            #     raise HTTPException(status_code=400, detail="Failed to read image files using OpenCV.")

        except Exception as e:
            logger.error(f"Error saving temporary files: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save images: {e}")
        
        try:
            print("ref_temp_path:", ref_temp_path)
            print("comp_temp_path:", comp_temp_path)
            face1 = DeepFace.extract_faces(ref_temp_path, detector_backend='opencv')
            if face1 is None:
                raise HTTPException(status_code=400, detail="No face detected in the uploaded ID image.")
            face2  = DeepFace.extract_faces(comp_temp_path, detector_backend='opencv', anti_spoofing=True)
            if face2 is None:
                raise HTTPException(status_code=400, detail="No face detected in the uploaded comparison image.")
            result = DeepFace.verify(
                img1_path=ref_temp_path,
                img2_path=comp_temp_path,
                model_name='Facenet512',
                detector_backend='retinaface',
                threshold=0.5
            )
            logger.info(f"Facial recognition result: verified={result['verified']}, distance={result['distance']}")
            response = FacialRecognitionResponse(
                verified=result['verified'],
                distance=result['distance'],
                threshold=result['threshold'],
                model=result['model'],
                detector_backend=result['detector_backend'],
                facial_areas=result['facial_areas']
            )
            print(response)
            return response
        except Exception as e:
            logger.error(f"Error during facial recognition: {e}")
            raise HTTPException(status_code=500, detail=f"Facial recognition error: {str(e)}")
        

if __name__ == "__main__":
    import uvicorn                          # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8002)