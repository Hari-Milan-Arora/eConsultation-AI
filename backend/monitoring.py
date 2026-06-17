"""
Production Monitoring and Logging System
Enhanced monitoring capabilities for the eConsultation AI backend
"""

import logging
import time
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from functools import wraps
import threading
from collections import defaultdict, deque
import psutil
import sqlite3

# Configure secure logging
class SecureFormatter(logging.Formatter):
    """Custom formatter that sanitizes sensitive information"""
    
    SENSITIVE_PATTERNS = [
        'password', 'token', 'key', 'secret', 'auth',
        'credential', 'session', 'cookie'
    ]
    
    def format(self, record):
        # Get the original formatted message
        formatted = super().format(record)
        
        # Sanitize sensitive information
        for pattern in self.SENSITIVE_PATTERNS:
            if pattern.lower() in formatted.lower():
                # Replace sensitive values with [REDACTED]
                import re
                formatted = re.sub(
                    rf'({pattern}["\']?\s*[:=]\s*["\']?)([^"\'\s,}}]+)',
                    r'\1[REDACTED]',
                    formatted,
                    flags=re.IGNORECASE
                )
        
        return formatted

# Set up secure logging
def setup_secure_logging():
    """Configure secure logging with appropriate levels and formatting"""
    
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Configure root logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create secure formatter
    formatter = SecureFormatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # File handler for application logs
    file_handler = logging.FileHandler('logs/app.log')
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    # File handler for error logs
    error_handler = logging.FileHandler('logs/error.log')
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    logger.addHandler(error_handler)
    
    # Console handler for development
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    return logger

# Performance monitoring
class PerformanceMonitor:
    """Monitors API response times and system performance"""
    
    def __init__(self, max_history=1000):
        self.max_history = max_history
        self.response_times = defaultdict(lambda: deque(maxlen=max_history))
        self.error_counts = defaultdict(int)
        self.request_counts = defaultdict(int)
        self.lock = threading.Lock()
        self.start_time = datetime.now()
        
    def record_request(self, endpoint: str, response_time: float, status_code: int):
        """Record a request's performance metrics"""
        with self.lock:
            self.response_times[endpoint].append({
                'timestamp': datetime.now().isoformat(),
                'response_time': response_time,
                'status_code': status_code
            })
            
            self.request_counts[endpoint] += 1
            
            if status_code >= 400:
                self.error_counts[endpoint] += 1
    
    def get_endpoint_stats(self, endpoint: str) -> Dict[str, Any]:
        """Get performance statistics for a specific endpoint"""
        with self.lock:
            times = self.response_times[endpoint]
            if not times:
                return {
                    'endpoint': endpoint,
                    'request_count': 0,
                    'error_count': 0,
                    'avg_response_time': 0,
                    'min_response_time': 0,
                    'max_response_time': 0,
                    'error_rate': 0
                }
            
            response_times_only = [t['response_time'] for t in times]
            
            return {
                'endpoint': endpoint,
                'request_count': self.request_counts[endpoint],
                'error_count': self.error_counts[endpoint],
                'avg_response_time': sum(response_times_only) / len(response_times_only),
                'min_response_time': min(response_times_only),
                'max_response_time': max(response_times_only),
                'error_rate': (self.error_counts[endpoint] / self.request_counts[endpoint]) * 100,
                'recent_requests': list(times)[-10:]  # Last 10 requests
            }
    
    def get_overall_stats(self) -> Dict[str, Any]:
        """Get overall system performance statistics"""
        with self.lock:
            total_requests = sum(self.request_counts.values())
            total_errors = sum(self.error_counts.values())
            
            all_times = []
            for endpoint_times in self.response_times.values():
                all_times.extend([t['response_time'] for t in endpoint_times])
            
            uptime = datetime.now() - self.start_time
            
            return {
                'uptime_seconds': uptime.total_seconds(),
                'uptime_formatted': str(uptime),
                'total_requests': total_requests,
                'total_errors': total_errors,
                'overall_error_rate': (total_errors / total_requests * 100) if total_requests > 0 else 0,
                'avg_response_time': sum(all_times) / len(all_times) if all_times else 0,
                'endpoints_monitored': len(self.response_times),
                'performance_targets': {
                    'comment_processing_target_ms': 2000,
                    'dashboard_loading_target_ms': 3000,
                    'wordcloud_generation_target_ms': 10000,
                    'api_response_target_ms': 1000
                }
            }

# Global performance monitor instance
performance_monitor = PerformanceMonitor()

def monitor_performance(endpoint_name: str = None):
    """Decorator to monitor endpoint performance"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            status_code = 200
            endpoint = endpoint_name or func.__name__
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                status_code = getattr(e, 'status_code', 500)
                raise
            finally:
                response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
                performance_monitor.record_request(endpoint, response_time, status_code)
                
                # Log slow requests
                if response_time > 5000:  # 5 seconds
                    logging.warning(f"Slow request detected: {endpoint} took {response_time:.2f}ms")
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            status_code = 200
            endpoint = endpoint_name or func.__name__
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                status_code = getattr(e, 'status_code', 500)
                raise
            finally:
                response_time = (time.time() - start_time) * 1000
                performance_monitor.record_request(endpoint, response_time, status_code)
                
                if response_time > 5000:
                    logging.warning(f"Slow request detected: {endpoint} took {response_time:.2f}ms")
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

# Health check system
class HealthChecker:
    """Comprehensive health checking system for production monitoring"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.logger = logging.getLogger(__name__)
    
    def check_database_health(self) -> Dict[str, Any]:
        """Check database connectivity and performance"""
        try:
            start_time = time.time()
            
            conn = sqlite3.connect(self.db_path, timeout=5.0)
            cursor = conn.cursor()
            
            # Basic connectivity test
            cursor.execute("SELECT 1")
            cursor.fetchone()
            
            # Check table existence
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            # Check comment count
            cursor.execute("SELECT COUNT(*) FROM comments")
            comment_count = cursor.fetchone()[0]
            
            # Check database size
            cursor.execute("PRAGMA page_count")
            page_count = cursor.fetchone()[0]
            cursor.execute("PRAGMA page_size")
            page_size = cursor.fetchone()[0]
            db_size_mb = (page_count * page_size) / (1024 * 1024)
            
            # Check recent activity
            cursor.execute("""
                SELECT COUNT(*) FROM comments 
                WHERE datetime(created_at) > datetime('now', '-1 hour')
            """)
            recent_activity = cursor.fetchone()[0]
            
            conn.close()
            
            response_time = (time.time() - start_time) * 1000
            
            return {
                'status': 'healthy',
                'response_time_ms': round(response_time, 2),
                'tables': tables,
                'comment_count': comment_count,
                'size_mb': round(db_size_mb, 2),
                'recent_activity_1h': recent_activity,
                'connection_timeout': '5s'
            }
            
        except Exception as e:
            self.logger.error(f"Database health check failed: {str(e)}")
            return {
                'status': 'unhealthy',
                'error': 'Database connection failed',
                'details': str(e)
            }
    
    def check_system_resources(self) -> Dict[str, Any]:
        """Check system resource usage"""
        try:
            # Memory usage
            memory = psutil.virtual_memory()
            
            # Disk usage
            disk = psutil.disk_usage('.')
            
            # CPU usage (average over 1 second)
            cpu_percent = psutil.cpu_percent(interval=1)
            
            return {
                'status': 'healthy',
                'memory': {
                    'total_gb': round(memory.total / (1024**3), 2),
                    'available_gb': round(memory.available / (1024**3), 2),
                    'used_percent': memory.percent,
                    'status': 'healthy' if memory.percent < 85 else 'warning'
                },
                'disk': {
                    'total_gb': round(disk.total / (1024**3), 2),
                    'free_gb': round(disk.free / (1024**3), 2),
                    'used_percent': round((disk.used / disk.total) * 100, 2),
                    'status': 'healthy' if (disk.used / disk.total) < 0.9 else 'warning'
                },
                'cpu': {
                    'usage_percent': cpu_percent,
                    'status': 'healthy' if cpu_percent < 80 else 'warning'
                }
            }
            
        except Exception as e:
            self.logger.error(f"System resource check failed: {str(e)}")
            return {
                'status': 'unhealthy',
                'error': 'Failed to check system resources',
                'details': str(e)
            }
    
    def check_ai_models(self, ai_models) -> Dict[str, Any]:
        """Check AI models health and performance"""
        try:
            start_time = time.time()
            
            # Test sentiment analysis
            test_text = "This is a test comment for health monitoring."
            sentiment_result = ai_models.get_sentiment_cached(test_text)
            
            # Test summarization
            summary_result = ai_models.get_summary_cached(test_text)
            
            response_time = (time.time() - start_time) * 1000
            
            return {
                'status': 'healthy',
                'response_time_ms': round(response_time, 2),
                'sentiment_analyzer': {
                    'loaded': ai_models.sentiment_analyzer is not None,
                    'type': type(ai_models.sentiment_analyzer).__name__,
                    'cache_size': len(ai_models.sentiment_cache),
                    'test_result': sentiment_result[0] if sentiment_result else None
                },
                'summarizer': {
                    'loaded': ai_models.summarizer is not None,
                    'type': type(ai_models.summarizer).__name__,
                    'cache_size': len(ai_models.summary_cache),
                    'test_result': summary_result[0]['summary_text'] if summary_result else None
                }
            }
            
        except Exception as e:
            self.logger.error(f"AI models health check failed: {str(e)}")
            return {
                'status': 'unhealthy',
                'error': 'AI models check failed',
                'details': str(e)
            }
    
    def comprehensive_health_check(self, ai_models) -> Dict[str, Any]:
        """Perform comprehensive health check of all system components"""
        health_data = {
            'timestamp': datetime.now().isoformat(),
            'overall_status': 'healthy',
            'checks': {}
        }
        
        # Database health
        db_health = self.check_database_health()
        health_data['checks']['database'] = db_health
        
        # System resources
        system_health = self.check_system_resources()
        health_data['checks']['system'] = system_health
        
        # AI models
        ai_health = self.check_ai_models(ai_models)
        health_data['checks']['ai_models'] = ai_health
        
        # Performance metrics
        health_data['checks']['performance'] = performance_monitor.get_overall_stats()
        
        # Determine overall status
        unhealthy_checks = [
            check for check in health_data['checks'].values()
            if check.get('status') == 'unhealthy'
        ]
        
        if unhealthy_checks:
            health_data['overall_status'] = 'unhealthy'
            health_data['unhealthy_components'] = len(unhealthy_checks)
        
        return health_data

# Error logging utilities
def log_error_safely(error: Exception, context: str = "", user_id: str = None, **kwargs):
    """Log errors safely without exposing sensitive information"""
    logger = logging.getLogger(__name__)
    
    # Create sanitized error message
    error_msg = str(error)
    
    # Remove sensitive information patterns
    sensitive_patterns = [
        r'password["\']?\s*[:=]\s*["\']?[^"\'\s,}}]+',
        r'token["\']?\s*[:=]\s*["\']?[^"\'\s,}}]+',
        r'key["\']?\s*[:=]\s*["\']?[^"\'\s,}}]+',
        r'secret["\']?\s*[:=]\s*["\']?[^"\'\s,}}]+',
    ]
    
    import re
    for pattern in sensitive_patterns:
        error_msg = re.sub(pattern, '[REDACTED]', error_msg, flags=re.IGNORECASE)
    
    # Log with context
    log_data = {
        'error_type': type(error).__name__,
        'error_message': error_msg,
        'context': context,
        'timestamp': datetime.now().isoformat()
    }
    
    if user_id:
        log_data['user_id'] = user_id
    
    # Add any additional context from kwargs
    for key, value in kwargs.items():
        if key not in log_data:
            log_data[key] = value
    
    logger.error(f"Application error: {json.dumps(log_data)}")

# Initialize logging
setup_secure_logging()