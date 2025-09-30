#!/usr/bin/env python3
"""
Security Testing Script for CertCheck
Tests various security measures and vulnerabilities
"""

import requests
import json
import time
import os
from typing import Dict, List, Tuple
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SecurityTester:
    def __init__(self, base_url: str = "https://localhost"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.verify = False  # For self-signed certificates
        self.results = {
            "passed": [],
            "failed": [],
            "warnings": []
        }
    
    def test_rate_limiting(self) -> bool:
        """Test rate limiting on login endpoint"""
        logger.info("Testing rate limiting...")
        
        login_data = {
            "username": "test@example.com",
            "password": "wrongpassword"
        }
        
        # Try multiple rapid requests
        for i in range(10):
            try:
                response = self.session.post(
                    f"{self.base_url}/user-login",
                    json=login_data,
                    timeout=5
                )
                
                if response.status_code == 429:
                    logger.info(f"Rate limiting triggered after {i+1} requests")
                    self.results["passed"].append("Rate limiting works correctly")
                    return True
                    
            except requests.exceptions.RequestException as e:
                logger.warning(f"Request {i+1} failed: {e}")
        
        self.results["failed"].append("Rate limiting not working - no 429 responses")
        return False
    
    def test_sql_injection(self) -> bool:
        """Test for SQL injection vulnerabilities"""
        logger.info("Testing SQL injection protection...")
        
        # Test login endpoint with SQL injection attempts
        sql_payloads = [
            "admin' OR '1'='1",
            "admin'; DROP TABLE users; --",
            "admin' UNION SELECT * FROM users --",
            "admin' OR 1=1 --"
        ]
        
        for payload in sql_payloads:
            login_data = {
                "username": payload,
                "password": "anything"
            }
            
            try:
                response = self.session.post(
                    f"{self.base_url}/user-login",
                    json=login_data,
                    timeout=5
                )
                
                # Should not return 200 with successful login
                if response.status_code == 200:
                    data = response.json()
                    if "token" in data or "access_token" in data:
                        self.results["failed"].append(f"SQL injection vulnerability found with payload: {payload}")
                        return False
                        
            except requests.exceptions.RequestException as e:
                logger.warning(f"SQL injection test failed: {e}")
        
        self.results["passed"].append("SQL injection protection working")
        return True
    
    def test_file_upload_security(self) -> bool:
        """Test file upload security"""
        logger.info("Testing file upload security...")
        
        # Test with malicious file types
        malicious_files = [
            ("test.php", b"<?php echo 'hacked'; ?>", "application/x-php"),
            ("test.exe", b"MZ\x90\x00", "application/x-executable"),
            ("test.js", b"alert('xss')", "application/javascript")
        ]
        
        for filename, content, content_type in malicious_files:
            try:
                files = {"file": (filename, content, content_type)}
                response = self.session.post(
                    f"{self.base_url}/aws/upload-file/?user_id=1",
                    files=files,
                    timeout=5
                )
                
                # Should reject malicious files
                if response.status_code == 200:
                    self.results["failed"].append(f"Malicious file upload allowed: {filename}")
                    return False
                    
            except requests.exceptions.RequestException as e:
                logger.warning(f"File upload test failed: {e}")
        
        self.results["passed"].append("File upload security working")
        return True
    
    def test_security_headers(self) -> bool:
        """Test security headers"""
        logger.info("Testing security headers...")
        
        try:
            response = self.session.get(f"{self.base_url}/", timeout=5)
            headers = response.headers
            
            required_headers = [
                "X-Content-Type-Options",
                "X-Frame-Options", 
                "X-XSS-Protection",
                "Strict-Transport-Security"
            ]
            
            missing_headers = []
            for header in required_headers:
                if header not in headers:
                    missing_headers.append(header)
            
            if missing_headers:
                self.results["warnings"].append(f"Missing security headers: {missing_headers}")
                return False
            else:
                self.results["passed"].append("Security headers present")
                return True
                
        except requests.exceptions.RequestException as e:
            logger.warning(f"Security headers test failed: {e}")
            return False
    
    def test_cors_configuration(self) -> bool:
        """Test CORS configuration"""
        logger.info("Testing CORS configuration...")
        
        try:
            # Test preflight request
            headers = {
                "Origin": "https://malicious-site.com",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
            
            response = self.session.options(
                f"{self.base_url}/user-login",
                headers=headers,
                timeout=5
            )
            
            cors_headers = response.headers.get("Access-Control-Allow-Origin")
            
            if cors_headers == "*":
                self.results["warnings"].append("CORS allows all origins (*)")
                return False
            elif "malicious-site.com" in str(cors_headers):
                self.results["failed"].append("CORS allows malicious origins")
                return False
            else:
                self.results["passed"].append("CORS configuration secure")
                return True
                
        except requests.exceptions.RequestException as e:
            logger.warning(f"CORS test failed: {e}")
            return False
    
    def test_authentication_bypass(self) -> bool:
        """Test for authentication bypass vulnerabilities"""
        logger.info("Testing authentication bypass...")
        
        # Test accessing protected endpoints without token
        protected_endpoints = [
            "/user/me",
            "/user/profile/",
            "/admin/me"
        ]
        
        for endpoint in protected_endpoints:
            try:
                response = self.session.get(
                    f"{self.base_url}{endpoint}",
                    timeout=5
                )
                
                # Should return 401 or 403
                if response.status_code not in [401, 403]:
                    self.results["failed"].append(f"Authentication bypass possible at {endpoint}")
                    return False
                    
            except requests.exceptions.RequestException as e:
                logger.warning(f"Auth bypass test failed for {endpoint}: {e}")
        
        self.results["passed"].append("Authentication protection working")
        return True
    
    def test_password_security(self) -> bool:
        """Test password security measures"""
        logger.info("Testing password security...")
        
        # Test weak password registration
        weak_passwords = [
            "123456",
            "password",
            "admin",
            "test"
        ]
        
        for weak_password in weak_passwords:
            register_data = {
                "first_name": "Test",
                "last_name": "User",
                "username": f"test{int(time.time())}@example.com",
                "password": weak_password,
                "date_of_birth": "1990-01-01"
            }
            
            try:
                response = self.session.post(
                    f"{self.base_url}/user-register",
                    json=register_data,
                    timeout=5
                )
                
                # Should reject weak passwords
                if response.status_code == 200:
                    self.results["failed"].append(f"Weak password accepted: {weak_password}")
                    return False
                    
            except requests.exceptions.RequestException as e:
                logger.warning(f"Password test failed: {e}")
        
        self.results["passed"].append("Password security working")
        return True
    
    def run_all_tests(self) -> Dict:
        """Run all security tests"""
        logger.info("Starting security tests...")
        
        tests = [
            self.test_rate_limiting,
            self.test_sql_injection,
            self.test_file_upload_security,
            self.test_security_headers,
            self.test_cors_configuration,
            self.test_authentication_bypass,
            self.test_password_security
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                logger.error(f"Test {test.__name__} failed with exception: {e}")
                self.results["failed"].append(f"Test {test.__name__} failed: {e}")
        
        return self.results
    
    def print_results(self):
        """Print test results"""
        print("\n" + "="*50)
        print("SECURITY TEST RESULTS")
        print("="*50)
        
        print(f"\n✅ PASSED ({len(self.results['passed'])}):")
        for item in self.results["passed"]:
            print(f"  - {item}")
        
        print(f"\n❌ FAILED ({len(self.results['failed'])}):")
        for item in self.results["failed"]:
            print(f"  - {item}")
        
        print(f"\n⚠️  WARNINGS ({len(self.results['warnings'])}):")
        for item in self.results["warnings"]:
            print(f"  - {item}")
        
        print("\n" + "="*50)
        
        total_tests = len(self.results["passed"]) + len(self.results["failed"]) + len(self.results["warnings"])
        if total_tests > 0:
            success_rate = len(self.results["passed"]) / total_tests * 100
            print(f"Success Rate: {success_rate:.1f}%")
        
        if self.results["failed"]:
            print("\n🚨 CRITICAL: Security vulnerabilities found!")
            return False
        elif self.results["warnings"]:
            print("\n⚠️  WARNING: Security improvements needed")
            return True
        else:
            print("\n✅ All security tests passed!")
            return True

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Security testing for CertCheck")
    parser.add_argument("--url", default="https://localhost", help="Base URL to test")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    tester = SecurityTester(args.url)
    results = tester.run_all_tests()
    success = tester.print_results()
    
    exit(0 if success else 1)

if __name__ == "__main__":
    main()
