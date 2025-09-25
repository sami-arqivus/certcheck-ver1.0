FROM python:3.11-slim


ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

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
    ffmpeg \
    valkey-tools \
    tesseract-ocr \
    tesseract-ocr-eng \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Playwright and browsers
RUN pip install --no-cache-dir --user playwright
ENV PATH="/root/.local/bin:${PATH}"
RUN playwright install chromium

RUN useradd -m celeryuser -u 1000 && \
    mkdir -p /app /etc/ssl/certs && \
    chown -R celeryuser:celeryuser /app

RUN curl -sSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o /app/aws-global-bundle.pem && \
    mv /app/aws-global-bundle.pem /etc/ssl/certs/aws-global-bundle.pem && \
    chown root:root /etc/ssl/certs/aws-global-bundle.pem && \
    chmod 644 /etc/ssl/certs/aws-global-bundle.pem

# COPY aws-global-bundle.pem /etc/ssl/certs/aws-global-bundle.pem
# RUN chown root:root /etc/ssl/certs/aws-global-bundle.pem && \
#     chmod 644 /etc/ssl/certs/aws-global-bundle.pem
    
USER celeryuser
WORKDIR /app


COPY requirements.txt .


RUN pip install --no-cache-dir --user -r requirements.txt --default-timeout=1000

ENV PATH="/home/celeryuser/.local/bin:${PATH}"


COPY . .



EXPOSE 8004

CMD ["uvicorn", "tasks_api:app", "--host", "0.0.0.0", "--port", "8004", "--reload"]






# RUN pip install --no-cache-dir -r requirements.txt
# RUN pip install --no-cache-dir playwright
# RUN npx playwright install --with-deps
# RUN playwright install --with-deps
# RUN playwright install chromium
# # RUN playwright install-deps
# RUN playwright install
# RUN pip install --no-cache-dir playwright-recaptcha

# RUN useradd -m celeryuser -u 1000
# USER celeryuser
# Copy application code

# Ensure ~/.local/bin is in PATH for playwright install


# USER celeryuser
# Expose port for Uvicorn



# RUN curl -o /etc/ssl/certs/aws-global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
# COPY --chown=celeryuser:celeryuser . .
# Install Python dependencies
