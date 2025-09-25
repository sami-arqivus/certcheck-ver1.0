FROM python:3.11-slim      

RUN apt-get update && apt-get upgrade -y && apt-get clean

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt --default-timeout=1000

COPY . .

EXPOSE 8001

CMD ["uvicorn", "aws_api:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]