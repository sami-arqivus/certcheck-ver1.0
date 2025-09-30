"""
Cleanup Jobs for CertCheck Authentication System
Handles cleanup of expired tokens, rate limits, and audit logs
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import os
import schedule
import time
import logging
from dotenv import load_dotenv

# Import our auth modules
import sys
sys.path.append('/Users/arqivus1/Desktop/Arq_CC/certcheck/certcheck-ver1.0/auth')
from token_manager import TokenManager
from rate_limiter import RateLimiter
from audit_logger import AuditLogger

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/Users/arqivus1/Desktop/Arq_CC/certcheck/certcheck-ver1.0/logs/cleanup.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CleanupManager:
    def __init__(self):
        self.db_connection = self._connect_db()
        self.token_manager = TokenManager(self.db_connection)
        self.rate_limiter = RateLimiter(self.db_connection)
        self.audit_logger = AuditLogger(self.db_connection)
    
    def _connect_db(self):
        """Connect to database"""
        try:
            conn = psycopg2.connect(
                dbname=os.getenv("DB_NAME"),
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASSWORD"),
                host=os.getenv("DB_HOST"),
                port=os.getenv("DB_PORT"),
                cursor_factory=RealDictCursor
            )
            return conn
        except psycopg2.Error as e:
            logger.error(f"Database connection error: {e}")
            raise
    
    def cleanup_expired_tokens(self):
        """Clean up expired tokens and blacklisted tokens"""
        try:
            logger.info("Starting token cleanup...")
            
            # Clean up expired refresh tokens
            tokens_cleaned = self.token_manager.cleanup_expired_tokens()
            logger.info(f"Cleaned up {tokens_cleaned} expired tokens")
            
            return tokens_cleaned
            
        except Exception as e:
            logger.error(f"Error during token cleanup: {e}")
            return 0
    
    def cleanup_rate_limits(self):
        """Clean up expired rate limit entries"""
        try:
            logger.info("Starting rate limit cleanup...")
            
            rate_limits_cleaned = self.rate_limiter.cleanup_expired_limits()
            logger.info(f"Cleaned up {rate_limits_cleaned} expired rate limit entries")
            
            return rate_limits_cleaned
            
        except Exception as e:
            logger.error(f"Error during rate limit cleanup: {e}")
            return 0
    
    def cleanup_audit_logs(self):
        """Clean up old audit logs based on retention policy"""
        try:
            logger.info("Starting audit log cleanup...")
            
            audit_logs_cleaned = self.audit_logger.cleanup_old_logs()
            logger.info(f"Cleaned up {audit_logs_cleaned} old audit log entries")
            
            return audit_logs_cleaned
            
        except Exception as e:
            logger.error(f"Error during audit log cleanup: {e}")
            return 0
    
    def cleanup_account_locks(self):
        """Unlock accounts that have exceeded their lockout period"""
        try:
            logger.info("Starting account unlock cleanup...")
            
            cursor = self.db_connection.cursor()
            
            # Unlock user accounts
            cursor.execute("""
                UPDATE users 
                SET locked_until = NULL, failed_login_attempts = 0
                WHERE locked_until IS NOT NULL 
                AND locked_until < CURRENT_TIMESTAMP
            """)
            users_unlocked = cursor.rowcount
            
            # Unlock admin accounts
            cursor.execute("""
                UPDATE admins 
                SET locked_until = NULL, failed_login_attempts = 0
                WHERE locked_until IS NOT NULL 
                AND locked_until < CURRENT_TIMESTAMP
            """)
            admins_unlocked = cursor.rowcount
            
            self.db_connection.commit()
            total_unlocked = users_unlocked + admins_unlocked
            
            logger.info(f"Unlocked {total_unlocked} accounts ({users_unlocked} users, {admins_unlocked} admins)")
            
            return total_unlocked
            
        except Exception as e:
            logger.error(f"Error during account unlock cleanup: {e}")
            self.db_connection.rollback()
            return 0
        finally:
            cursor.close()
    
    def cleanup_used_refresh_tokens(self):
        """Clean up used refresh tokens older than 24 hours"""
        try:
            logger.info("Starting used refresh token cleanup...")
            
            cursor = self.db_connection.cursor()
            cursor.execute("""
                DELETE FROM refresh_tokens 
                WHERE is_used = TRUE 
                AND last_used_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
            """)
            
            used_tokens_cleaned = cursor.rowcount
            self.db_connection.commit()
            
            logger.info(f"Cleaned up {used_tokens_cleaned} used refresh tokens")
            
            return used_tokens_cleaned
            
        except Exception as e:
            logger.error(f"Error during used refresh token cleanup: {e}")
            self.db_connection.rollback()
            return 0
        finally:
            cursor.close()
    
    def run_full_cleanup(self):
        """Run all cleanup operations"""
        logger.info("Starting full cleanup process...")
        
        start_time = datetime.now()
        
        try:
            # Run all cleanup operations
            tokens_cleaned = self.cleanup_expired_tokens()
            rate_limits_cleaned = self.cleanup_rate_limits()
            audit_logs_cleaned = self.cleanup_audit_logs()
            accounts_unlocked = self.cleanup_account_locks()
            used_tokens_cleaned = self.cleanup_used_refresh_tokens()
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            total_cleaned = (
                tokens_cleaned + 
                rate_limits_cleaned + 
                audit_logs_cleaned + 
                used_tokens_cleaned
            )
            
            logger.info(f"Full cleanup completed in {duration:.2f} seconds")
            logger.info(f"Total items cleaned: {total_cleaned}")
            logger.info(f"Accounts unlocked: {accounts_unlocked}")
            
            return {
                "success": True,
                "duration_seconds": duration,
                "tokens_cleaned": tokens_cleaned,
                "rate_limits_cleaned": rate_limits_cleaned,
                "audit_logs_cleaned": audit_logs_cleaned,
                "accounts_unlocked": accounts_unlocked,
                "used_tokens_cleaned": used_tokens_cleaned,
                "total_cleaned": total_cleaned
            }
            
        except Exception as e:
            logger.error(f"Error during full cleanup: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_cleanup_stats(self):
        """Get statistics about cleanup operations"""
        try:
            cursor = self.db_connection.cursor()
            
            # Get counts of various items
            stats = {}
            
            # Expired tokens
            cursor.execute("""
                SELECT COUNT(*) as count FROM token_blacklist 
                WHERE expires_at < CURRENT_TIMESTAMP
            """)
            stats["expired_blacklisted_tokens"] = cursor.fetchone()["count"]
            
            cursor.execute("""
                SELECT COUNT(*) as count FROM refresh_tokens 
                WHERE expires_at < CURRENT_TIMESTAMP
            """)
            stats["expired_refresh_tokens"] = cursor.fetchone()["count"]
            
            # Expired rate limits
            cursor.execute("""
                SELECT COUNT(*) as count FROM rate_limits 
                WHERE expires_at < CURRENT_TIMESTAMP
            """)
            stats["expired_rate_limits"] = cursor.fetchone()["count"]
            
            # Old audit logs
            cursor.execute("""
                SELECT COUNT(*) as count FROM auth_audit_log 
                WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
            """)
            stats["old_audit_logs"] = cursor.fetchone()["count"]
            
            # Locked accounts
            cursor.execute("""
                SELECT COUNT(*) as count FROM users 
                WHERE locked_until IS NOT NULL AND locked_until > CURRENT_TIMESTAMP
            """)
            stats["locked_users"] = cursor.fetchone()["count"]
            
            cursor.execute("""
                SELECT COUNT(*) as count FROM admins 
                WHERE locked_until IS NOT NULL AND locked_until > CURRENT_TIMESTAMP
            """)
            stats["locked_admins"] = cursor.fetchone()["count"]
            
            # Used refresh tokens
            cursor.execute("""
                SELECT COUNT(*) as count FROM refresh_tokens 
                WHERE is_used = TRUE AND last_used_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
            """)
            stats["old_used_refresh_tokens"] = cursor.fetchone()["count"]
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting cleanup stats: {e}")
            return {}
        finally:
            cursor.close()
    
    def close(self):
        """Close database connection"""
        if self.db_connection:
            self.db_connection.close()

def run_cleanup_job():
    """Function to run cleanup job (for scheduling)"""
    cleanup_manager = CleanupManager()
    try:
        result = cleanup_manager.run_full_cleanup()
        logger.info(f"Cleanup job result: {result}")
    finally:
        cleanup_manager.close()

def run_quick_cleanup():
    """Function to run quick cleanup (tokens and rate limits only)"""
    cleanup_manager = CleanupManager()
    try:
        logger.info("Running quick cleanup...")
        tokens_cleaned = cleanup_manager.cleanup_expired_tokens()
        rate_limits_cleaned = cleanup_manager.cleanup_rate_limits()
        accounts_unlocked = cleanup_manager.cleanup_account_locks()
        
        logger.info(f"Quick cleanup completed: {tokens_cleaned} tokens, {rate_limits_cleaned} rate limits, {accounts_unlocked} accounts unlocked")
    finally:
        cleanup_manager.close()

def run_audit_cleanup():
    """Function to run audit log cleanup"""
    cleanup_manager = CleanupManager()
    try:
        logger.info("Running audit log cleanup...")
        audit_logs_cleaned = cleanup_manager.cleanup_audit_logs()
        logger.info(f"Audit cleanup completed: {audit_logs_cleaned} logs cleaned")
    finally:
        cleanup_manager.close()

def setup_scheduled_cleanup():
    """Setup scheduled cleanup jobs"""
    logger.info("Setting up scheduled cleanup jobs...")
    
    # Quick cleanup every 15 minutes (tokens and rate limits)
    schedule.every(15).minutes.do(run_quick_cleanup)
    
    # Full cleanup every hour
    schedule.every().hour.do(run_cleanup_job)
    
    # Audit log cleanup every 6 hours
    schedule.every(6).hours.do(run_audit_cleanup)
    
    # Account unlock cleanup every 30 minutes
    schedule.every(30).minutes.do(lambda: CleanupManager().cleanup_account_locks())
    
    logger.info("Scheduled cleanup jobs configured:")
    logger.info("- Quick cleanup: every 15 minutes")
    logger.info("- Full cleanup: every hour")
    logger.info("- Audit cleanup: every 6 hours")
    logger.info("- Account unlock: every 30 minutes")

def run_scheduler():
    """Run the scheduler (for background process)"""
    setup_scheduled_cleanup()
    
    logger.info("Starting cleanup scheduler...")
    while True:
        try:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
        except KeyboardInterrupt:
            logger.info("Cleanup scheduler stopped by user")
            break
        except Exception as e:
            logger.error(f"Error in cleanup scheduler: {e}")
            time.sleep(60)  # Wait before retrying

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="CertCheck Cleanup Jobs")
    parser.add_argument("--mode", choices=["run", "schedule", "stats"], default="run",
                       help="Mode: run (one-time), schedule (background), or stats (show statistics)")
    parser.add_argument("--type", choices=["full", "quick", "audit"], default="full",
                       help="Type of cleanup to run")
    
    args = parser.parse_args()
    
    if args.mode == "run":
        cleanup_manager = CleanupManager()
        try:
            if args.type == "full":
                result = cleanup_manager.run_full_cleanup()
                print(f"Cleanup result: {result}")
            elif args.type == "quick":
                run_quick_cleanup()
            elif args.type == "audit":
                run_audit_cleanup()
        finally:
            cleanup_manager.close()
    
    elif args.mode == "schedule":
        run_scheduler()
    
    elif args.mode == "stats":
        cleanup_manager = CleanupManager()
        try:
            stats = cleanup_manager.get_cleanup_stats()
            print("Cleanup Statistics:")
            for key, value in stats.items():
                print(f"  {key}: {value}")
        finally:
            cleanup_manager.close()
