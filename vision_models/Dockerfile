FROM python:3.11-slim


ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV CUDA_VISIBLE_DEVICES=""
ENV TF_CPP_MIN_LOG_LEVEL=2
ENV TF_ENABLE_ONEDNN_OPTS=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    fonts-dejavu \
    libdbus-1-3 \
    libatk1.0-0 \
    libatspi2.0-0 \ 
    libxcomposite1 \
    libxdamage1 \                                 
    libxfixes3 \
    libxrandr2 \
    libxkbcommon0 \
    libasound2 \
    curl \
    libsm6 \
    libxext6 \
    libxi6 \
    libxtst6 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /root/.deepface/weights && \
    curl -L -o /root/.deepface/weights/facenet512_weights.h5 \
    https://github.com/serengil/deepface_models/releases/download/v1.0/facenet512_weights.h5 && \
    curl -L -o /root/.deepface/weights/retinaface.h5 \
    https://github.com/serengil/deepface_models/releases/download/v1.0/retinaface.h5 \
    curl -L -o /root/.deepface/weights/2.7_80x80_MiniFASNetV2.pth \
    https://github.com/minivision-ai/Silent-Face-Anti-Spoofing/raw/master/resources/anti_spoof_models/2.7_80x80_MiniFASNetV2.pth && \
    curl -L -o /root/.deepface/weights/4_0_0_80x80_MiniFASNetV1SE.pth \
    https://github.com/minivision-ai/Silent-Face-Anti-Spoofing/raw/master/resources/anti_spoof_models/4_0_0_80x80_MiniFASNetV1SE.pth

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --default-timeout=1000
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

COPY . .

# Expose port for Uvicorn
EXPOSE 8002

CMD ["gunicorn", "--bind", "0.0.0.0:8002", "--workers", "1", "--worker-class", "uvicorn.workers.UvicornWorker", "--threads", "2", "--timeout", "600", "--log-level", "info", "--preload", "vision_api:app"]
# CMD ["gunicorn", "--bind", "0.0.0.0:8002", "--workers", "1", "--threads", "4", "--timeout", "120", "--log-level", "info", "--preload", "vision_api:app"]
# CMD ["uvicorn", "vision_api:app", "--host", "0.0.0.0", "--port", "8002", "--reload"]
# CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "vision_api:app", "--bind", "0.0.0.0:8002", "--log-level", "info"]
# Start Xvfb, x11vnc, Fluxbox, and Uvicorn
# CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x720x24 & x11vnc -display :99 -rfbport 5900 -forever -nopw & fluxbox & uvicorn vision_api:app --host 0.0.0.0 --port 8002 --workers 1"]
