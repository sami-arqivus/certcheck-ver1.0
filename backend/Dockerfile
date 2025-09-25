FROM python:3.11-slim      

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install OS dependencies for Playwright
RUN apt-get update && apt-get install -y wget curl unzip \
    && apt-get install -y libnss3 libatk-bridge2.0-0 libxss1 libasound2 libxshmfence1 libgbm1 libgtk-3-0 libdrm2 \
    && apt-get clean

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt --default-timeout=1000

COPY . .

EXPOSE 8003

CMD ["uvicorn", "backend:app", "--host", "0.0.0.0", "--port", "8003", "--reload"]