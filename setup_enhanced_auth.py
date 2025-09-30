#!/usr/bin/env python3
"""
Setup Script for Enhanced Authentication System
This script helps set up the enhanced authentication system for CertCheck
"""

import os
import sys
import subprocess
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        sys.exit(1)
    print("✅ Python version check passed")

def install_dependencies():
    """Install required Python packages"""
    print("📦 Installing dependencies...")
    
    dependencies = [
        "fastapi",
        "uvicorn",
        "psycopg2-binary",
        "python-jose[cryptography]",
        "passlib[bcrypt]",
        "python-multipart",
        "pydantic[email]",
        "python-dotenv",
        "boto3",
        "bcrypt",
        "schedule"
    ]
    
    try:
        for dep in dependencies:
            print(f"Installing {dep}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", dep])
        print("✅ All dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing dependencies: {e}")
        sys.exit(1)

def check_database_connection():
    """Check database connection"""
    print("🔌 Checking database connection...")
    
    try:
        load_dotenv()
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME", "certcheck"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "7622"),
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            cursor_factory=RealDictCursor
        )
        conn.close()
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("Please check your database configuration in .env file")
        return False

def create_database_schema():
    """Create enhanced database schema"""
    print("🗄️ Creating enhanced database schema...")
    
    try:
        load_dotenv()
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME", "certcheck"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "7622"),
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            cursor_factory=RealDictCursor
        )
        
        # Read and execute schema file
        schema_file = "/Users/arqivus1/Desktop/Arq_CC/certcheck/certcheck-ver1.0/database/enhanced_auth_schema.sql"
        
        if os.path.exists(schema_file):
            with open(schema_file, 'r') as f:
                schema_sql = f.read()
            
            cursor = conn.cursor()
            cursor.execute(schema_sql)
            conn.commit()
            cursor.close()
            
            print("✅ Database schema created successfully")
        else:
            print(f"❌ Schema file not found: {schema_file}")
            return False
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error creating database schema: {e}")
        return False

def create_directories():
    """Create necessary directories"""
    print("📁 Creating directories...")
    
    directories = [
        "/Users/arqivus1/Desktop/Arq_CC/certcheck/certcheck-ver1.0/logs",
        "/Users/arqivus1/Desktop/Arq_CC/certcheck/certcheck-ver1.0/auth",
        "/Users/arqivus1/Desktop/Arq_CC/certcheck/certcheck-ver1.0/database"
    ]
    
    for directory in directories:
        try:
            os.makedirs(directory, exist_ok=True)
            print(f"✅ Created directory: {directory}")
        except Exception as e:
            print(f"❌ Error creating directory {directory}: {e}")

def create_env_file():
    """Create .env file if it doesn't exist"""
    print("⚙️ Setting up environment configuration...")
    
    env_file = "/Users/arqivus1/Desktop/Arq_CC/certcheck/certcheck-ver1.0/.env"
    example_file = "/Users/arqivus1/Desktop/Arq_CC/certcheck/certcheck-ver1.0/auth_config.env.example"
    
    if not os.path.exists(env_file):
        if os.path.exists(example_file):
            import shutil
            shutil.copy(example_file, env_file)
            print("✅ Created .env file from example")
            print("⚠️ Please update .env file with your actual configuration values")
        else:
            print("❌ Example .env file not found")
            return False
    else:
        print("✅ .env file already exists")
    
    return True

def test_enhanced_auth():
    """Test the enhanced authentication system"""
    print("🧪 Testing enhanced authentication system...")
    
    try:
        # Import and test our modules
        sys.path.append('/Users/arqivus1/Desktop/Arq_CC/certcheck/certcheck-ver1.0/auth')
        
        from token_manager import TokenManager
        from rate_limiter import RateLimiter
        from audit_logger import AuditLogger
        
        # Test database connection
        load_dotenv()
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME", "certcheck"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "7622"),
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            cursor_factory=RealDictCursor
        )
        
        # Test token manager
        token_manager = TokenManager(conn)
        print("✅ TokenManager initialized successfully")
        
        # Test rate limiter
        rate_limiter = RateLimiter(conn)
        print("✅ RateLimiter initialized successfully")
        
        # Test audit logger
        audit_logger = AuditLogger(conn)
        print("✅ AuditLogger initialized successfully")
        
        conn.close()
        print("✅ Enhanced authentication system test passed")
        return True
        
    except Exception as e:
        print(f"❌ Enhanced authentication system test failed: {e}")
        return False

def create_startup_scripts():
    """Create startup scripts for the enhanced auth system"""
    print("🚀 Creating startup scripts...")
    
    # Create cleanup job startup script
    cleanup_script = """#!/bin/bash
# CertCheck Cleanup Jobs Startup Script

cd /Users/arqivus1/Desktop/Arq_CC/certcheck/certcheck-ver1.0
source venv/bin/activate  # Adjust if using different virtual environment
python auth/cleanup_jobs.py --mode schedule
"""
    
    cleanup_script_path = "/Users/arqivus1/Desktop/Arq_CC/certcheck/certcheck-ver1.0/start_cleanup.sh"
    with open(cleanup_script_path, 'w') as f:
        f.write(cleanup_script)
    
    os.chmod(cleanup_script_path, 0o755)
    print(f"✅ Created cleanup startup script: {cleanup_script_path}")
    
    # Create enhanced auth startup script
    auth_script = """#!/bin/bash
# CertCheck Enhanced Authentication Startup Script

cd /Users/arqivus1/Desktop/Arq_CC/certcheck/certcheck-ver1.0
source venv/bin/activate  # Adjust if using different virtual environment
python login_register/enhanced_user_login_and_register.py
"""
    
    auth_script_path = "/Users/arqivus1/Desktop/Arq_CC/certcheck/certcheck-ver1.0/start_enhanced_auth.sh"
    with open(auth_script_path, 'w') as f:
        f.write(auth_script)
    
    os.chmod(auth_script_path, 0o755)
    print(f"✅ Created enhanced auth startup script: {auth_script_path}")

def main():
    """Main setup function"""
    print("🔐 CertCheck Enhanced Authentication Setup")
    print("=" * 50)
    
    # Check Python version
    check_python_version()
    
    # Create directories
    create_directories()
    
    # Install dependencies
    install_dependencies()
    
    # Create .env file
    if not create_env_file():
        print("❌ Failed to create .env file")
        sys.exit(1)
    
    # Check database connection
    if not check_database_connection():
        print("❌ Database connection failed. Please fix database configuration and run again.")
        sys.exit(1)
    
    # Create database schema
    if not create_database_schema():
        print("❌ Failed to create database schema")
        sys.exit(1)
    
    # Test enhanced auth system
    if not test_enhanced_auth():
        print("❌ Enhanced authentication system test failed")
        sys.exit(1)
    
    # Create startup scripts
    create_startup_scripts()
    
    print("\n" + "=" * 50)
    print("🎉 Enhanced Authentication Setup Complete!")
    print("=" * 50)
    print("\nNext steps:")
    print("1. Update .env file with your actual configuration values")
    print("2. Start the enhanced authentication service:")
    print("   ./start_enhanced_auth.sh")
    print("3. Start the cleanup jobs (in a separate terminal):")
    print("   ./start_cleanup.sh")
    print("\nFor more information, check the documentation in the auth/ directory")

if __name__ == "__main__":
    main()
