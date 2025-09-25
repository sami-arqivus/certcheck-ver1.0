FROM python:3.11-slim      

RUN apt-get update && apt-get upgrade -y && apt-get clean

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt --default-timeout=1000

COPY . .

EXPOSE 8000

CMD ["uvicorn", "user_login_and_register:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
