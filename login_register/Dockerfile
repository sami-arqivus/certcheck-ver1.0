FROM python:3.11-slim      

# Install system dependencies for security features
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y libmagic1 libmagic-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create logs directory
RUN mkdir -p /app/logs

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt --default-timeout=1000

COPY . .

EXPOSE 8000

CMD ["uvicorn", "enhanced_user_login_and_register:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
