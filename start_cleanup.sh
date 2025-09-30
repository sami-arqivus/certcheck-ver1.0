#!/bin/bash
# CertCheck Cleanup Jobs Startup Script

cd /Users/arqivus1/Desktop/Arq_CC/certcheck/certcheck-ver1.0
source auth_venv/bin/activate
python3 auth/cleanup_jobs.py --mode schedule
