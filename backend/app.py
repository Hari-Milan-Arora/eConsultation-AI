"""
eConsultation AI Backend - Optimized FastAPI Application
High-performance backend with faster processing and optimized text limits.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import sqlite3
import pandas as pd
from datetime import datetime
import os
import io
import logging
import uvicorn
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading

# Import monitoring system
from monitoring import (
    setup_secure_logging, 
    PerformanceMonitor, 
    HealthChecker, 
    monitor_performance,
    performance_monitor,
    log_error_safely
)

# AI/ML imports
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch
from wordcloud import WordCloud
import matplotlib.pyplot as plt

# Configure secure logging with monitoring
logger = setup_secure_logging()
logger = logging.getLogger(__name__)

# Initialize health checker
health_checker = HealthChecker("eConsultation.db")

# Initialize FastAPI app with optimizations
app = FastAPI(
    title="eConsultation AI API - Optimized",
    description="High-performance AI system for analyzing government consultation comments",
    version="2.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:3001",  # Alternative React port
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://frontend:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Thread pool for parallel processing
executor = ThreadPoolExecutor(max_workers=4)

# Optimized AI Models with caching and faster processing
class OptimizedAIModels:
    """Handles loading and management of AI models with performance optimizations"""
    
    def __init__(self):
        self.sentiment_analyzer = None
        self.summarizer = None
        self.sentiment_cache = {}  # Cache for sentiment results
        self.summary_cache = {}    # Cache for summary results
        self.cache_lock = threading.Lock()
        self._load_models()
    
    def _load_models(self):
        """Load optimized models for faster processing"""
        try:
            logger.info("Loading optimized AI models...")
            
            # Load lightweight sentiment model
            try:
                logger.info("Loading fast sentiment model...")
                self.sentiment_analyzer = pipeline(
                    "sentiment-analysis",
                    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                    return_all_scores=True,
                    device=-1,  # CPU
                    framework="pt"
                )
                logger.info("Fast sentiment model loaded successfully")
            except Exception as e:
                logger.warning(f"Fast model failed, using fallback: {e}")
                self._create_fast_fallback_sentiment()
            
            # Load lightweight summarization model
            try:
                logger.info("Loading fast summarization model...")
                self.summarizer = pipeline(
                    "summarization",
                    model="sshleifer/distilbart-cnn-6-6",  # Smaller, faster model
                    max_length=50,   # Max 50 characters for summary
                    min_length=10,   # Min 10 characters
                    do_sample=False,
                    device=-1,       # CPU
                    framework="pt"
                )
                logger.info("Fast summarization model loaded successfully")
            except Exception as e:
                logger.warning(f"Fast summarization model failed, using fallback: {e}")
                self._create_fast_fallback_summarizer()
            
            logger.info("All optimized models loaded successfully!")
            
        except Exception as e:
            logger.error(f"Error loading optimized models: {str(e)}")
            self._create_fast_fallback_models()
    
    def _create_fast_fallback_sentiment(self):
        """Create ultra-fast sentiment analyzer"""
        class FastSentimentAnalyzer:
            def __init__(self):
                # Pre-compiled sentiment keywords for speed
                self.positive_keywords = {
                    'excellent', 'great', 'good', 'positive', 'support', 'benefit', 
                    'improve', 'welcome', 'appreciate', 'effective', 'successful', 
                    'helpful', 'valuable', 'outstanding', 'wonderful', 'amazing', 
                    'fantastic', 'brilliant', 'perfect', 'love', 'like', 'enjoy'
                }
                self.negative_keywords = {
                    'terrible', 'bad', 'negative', 'oppose', 'against', 'harm', 
                    'problem', 'concerned', 'worried', 'disappointed', 'frustrated', 
                    'angry', 'upset', 'awful', 'horrible', 'hate', 'dislike', 
                    'reject', 'refuse', 'fail', 'failure', 'wrong', 'error'
                }
            
            def __call__(self, text):
                text_lower = text.lower()
                words = set(text_lower.split())
                
                pos_score = len(words & self.positive_keywords)
                neg_score = len(words & self.negative_keywords)
                
                if pos_score > neg_score:
                    confidence = min(0.95, 0.7 + (pos_score - neg_score) * 0.1)
                    return [{'label': 'POSITIVE', 'score': confidence}]
                elif neg_score > pos_score:
                    confidence = min(0.95, 0.7 + (neg_score - pos_score) * 0.1)
                    return [{'label': 'NEGATIVE', 'score': confidence}]
                else:
                    return [{'label': 'NEUTRAL', 'score': 0.6}]
        
        self.sentiment_analyzer = FastSentimentAnalyzer()
        logger.info("Fast fallback sentiment analyzer created")
    
    def _create_fast_fallback_summarizer(self):
        """Create ultra-fast summarizer with 50 char limit"""
        class FastSummarizer:
            def __call__(self, text, **kwargs):
                if not text or len(text.strip()) == 0:
                    return [{'summary_text': "No content"}]
                
                text = text.strip()
                
                # If already short enough, return as-is
                if len(text) <= 50:
                    return [{'summary_text': text}]
                
                # Fast sentence extraction
                sentences = []
                for delimiter in ['. ', '! ', '? ']:
                    if delimiter in text:
                        sentences = [s.strip() for s in text.split(delimiter) if s.strip()]
                        break
                
                if sentences:
                    # Take first sentence and truncate to 50 chars
                    summary = sentences[0]
                    if len(summary) > 47:
                        summary = summary[:47] + "..."
                    return [{'summary_text': summary}]
                else:
                    # No sentences, just truncate
                    summary = text[:47] + "..." if len(text) > 47 else text
                    return [{'summary_text': summary}]
        
        self.summarizer = FastSummarizer()
        logger.info("Fast fallback summarizer created (50 char limit)")
    
    def _create_fast_fallback_models(self):
        """Create all fast fallback models"""
        self._create_fast_fallback_sentiment()
        self._create_fast_fallback_summarizer()
        logger.info("All fast fallback models created")
    
    def get_sentiment_cached(self, text):
        """Get sentiment with caching for performance"""
        text_hash = hash(text)
        
        with self.cache_lock:
            if text_hash in self.sentiment_cache:
                return self.sentiment_cache[text_hash]
        
        # Process sentiment
        result = self.sentiment_analyzer(text)
        
        with self.cache_lock:
            self.sentiment_cache[text_hash] = result
            # Limit cache size
            if len(self.sentiment_cache) > 1000:
                # Remove oldest entries
                keys_to_remove = list(self.sentiment_cache.keys())[:100]
                for key in keys_to_remove:
                    del self.sentiment_cache[key]
        
        return result
    
    def get_summary_cached(self, text):
        """Get summary with caching for performance"""
        text_hash = hash(text)
        
        with self.cache_lock:
            if text_hash in self.summary_cache:
                return self.summary_cache[text_hash]
        
        # Process summary
        result = self.summarizer(text, max_length=50, min_length=10)
        
        with self.cache_lock:
            self.summary_cache[text_hash] = result
            # Limit cache size
            if len(self.summary_cache) > 1000:
                # Remove oldest entries
                keys_to_remove = list(self.summary_cache.keys())[:100]
                for key in keys_to_remove:
                    del self.summary_cache[key]
        
        return result

# Initialize optimized models globally
ai_models = OptimizedAIModels()

# Database setup with connection pooling
DATABASE_PATH = "eConsultation.db"

class DatabaseManager:
    """Optimized database manager with connection pooling"""
    
    def __init__(self):
        self.db_lock = threading.Lock()
        self.init_database()
    
    def init_database(self):
        """Initialize SQLite database with optimized settings"""
        with self.db_lock:
            conn = sqlite3.connect(DATABASE_PATH)
            conn.execute("PRAGMA journal_mode=WAL")  # Write-Ahead Logging for better performance
            conn.execute("PRAGMA synchronous=NORMAL")  # Faster writes
            conn.execute("PRAGMA cache_size=10000")    # Larger cache
            conn.execute("PRAGMA temp_store=MEMORY")   # Use memory for temp storage
            
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS comments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    stakeholder_type TEXT NOT NULL,
                    raw_text TEXT NOT NULL CHECK(length(raw_text) <= 300),
                    sentiment_label TEXT,
                    sentiment_score REAL,
                    summary TEXT CHECK(length(summary) <= 50),
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create indexes for better performance
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_sentiment ON comments(sentiment_label)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON comments(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_stakeholder ON comments(stakeholder_type)')
            
            conn.commit()
            conn.close()
            logger.info("Optimized database initialized successfully")
    
    def get_connection(self):
        """Get optimized database connection"""
        conn = sqlite3.connect(DATABASE_PATH, timeout=30.0)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        return conn

# Initialize database manager
db_manager = DatabaseManager()

# Pydantic models with validation
class CommentInput(BaseModel):
    """Input model for single comment submission with validation"""
    stakeholder_type: str = Field(..., pattern="^(citizen|business|ngo|academic)$")
    raw_text: str = Field(..., min_length=1, max_length=300, description="Comment text (max 300 characters)")

class CommentResponse(BaseModel):
    """Response model for processed comment"""
    id: int
    timestamp: str
    stakeholder_type: str
    raw_text: str = Field(..., max_length=300)
    sentiment_label: str
    sentiment_score: float
    summary: str = Field(..., max_length=50)
    created_at: str

class DashboardStats(BaseModel):
    """Model for dashboard statistics"""
    total_comments: int
    positive_percentage: float
    neutral_percentage: float
    negative_percentage: float
    recent_comments: List[CommentResponse]

# Optimized helper functions
def analyze_sentiment_fast(text: str) -> tuple:
    """
    Fast sentiment analysis with caching
    Returns: (sentiment_label, confidence_score)
    """
    try:
        results = ai_models.get_sentiment_cached(text)
        
        # Handle different model output formats
        if isinstance(results[0], list):
            results = results[0]
        
        # Find highest scoring sentiment
        best_result = max(results, key=lambda x: x['score'])
        
        # Map labels to standard format
        label_mapping = {
            'LABEL_0': 'negative',
            'LABEL_1': 'neutral', 
            'LABEL_2': 'positive',
            'NEGATIVE': 'negative',
            'NEUTRAL': 'neutral',
            'POSITIVE': 'positive'
        }
        
        sentiment_label = label_mapping.get(best_result['label'], best_result['label'].lower())
        confidence_score = best_result['score']
        
        return sentiment_label, confidence_score
        
    except Exception as e:
        logger.error(f"Error in fast sentiment analysis: {str(e)}")
        return "neutral", 0.5

def generate_summary_fast(text: str) -> str:
    """
    Fast summary generation with 50 character limit and caching
    Returns: summary string (max 50 chars)
    """
    try:
        # Skip very short texts
        if len(text.split()) < 3:
            return text[:50] if len(text) <= 50 else text[:47] + "..."
        
        # Generate summary with caching
        summary_result = ai_models.get_summary_cached(text)
        summary = summary_result[0]['summary_text']
        
        # Ensure 50 character limit
        if len(summary) > 50:
            summary = summary[:47] + "..."
        
        return summary
        
    except Exception as e:
        logger.error(f"Error in fast summarization: {str(e)}")
        # Fallback: return first 50 characters
        return text[:47] + "..." if len(text) > 47 else text

async def process_comment_async(stakeholder_type: str, raw_text: str) -> dict:
    """
    Asynchronously process a single comment through the optimized AI pipeline
    Returns: processed comment data
    """
    # Validate text length
    if len(raw_text) > 300:
        raw_text = raw_text[:300]
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Run AI processing in thread pool for better performance
    loop = asyncio.get_event_loop()
    
    # Process sentiment and summary in parallel
    sentiment_task = loop.run_in_executor(executor, analyze_sentiment_fast, raw_text)
    summary_task = loop.run_in_executor(executor, generate_summary_fast, raw_text)
    
    # Wait for both tasks to complete
    sentiment_result, summary = await asyncio.gather(sentiment_task, summary_task)
    sentiment_label, sentiment_score = sentiment_result
    
    return {
        'timestamp': timestamp,
        'stakeholder_type': stakeholder_type,
        'raw_text': raw_text,
        'sentiment_label': sentiment_label,
        'sentiment_score': sentiment_score,
        'summary': summary
    }

def save_comment_to_db_fast(comment_data: dict) -> int:
    """Save processed comment to database with optimized connection"""
    conn = db_manager.get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO comments (timestamp, stakeholder_type, raw_text, sentiment_label, sentiment_score, summary)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        comment_data['timestamp'],
        comment_data['stakeholder_type'],
        comment_data['raw_text'][:300],  # Ensure 300 char limit
        comment_data['sentiment_label'],
        comment_data['sentiment_score'],
        comment_data['summary'][:50]     # Ensure 50 char limit
    ))
    
    comment_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return comment_id

# Optimized API Endpoints

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "eConsultation AI API - Optimized Version", 
        "version": "2.0.0", 
        "status": "healthy",
        "features": {
            "max_comment_length": 300,
            "max_summary_length": 50,
            "caching_enabled": True,
            "async_processing": True
        }
    }

@app.get("/health")
@monitor_performance("health_check")
async def health_check():
    """Basic health check endpoint for load balancers"""
    try:
        # Quick database ping
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        conn.close()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "2.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": "Database connection failed",
            "timestamp": datetime.now().isoformat(),
            "version": "2.0.0"
        }

@app.get("/health/detailed")
@monitor_performance("detailed_health_check")
async def detailed_health_check():
    """Comprehensive health check with performance metrics"""
    import time
    import psutil
    import sys
    
    start_time = time.time()
    health_data = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "checks": {}
    }
    
    try:
        # Database health check
        db_start = time.time()
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM comments")
        comment_count = cursor.fetchone()[0]
        
        # Check database performance
        cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
        table_count = cursor.fetchone()[0]
        
        # Check database size
        cursor.execute("PRAGMA page_count")
        page_count = cursor.fetchone()[0]
        cursor.execute("PRAGMA page_size")
        page_size = cursor.fetchone()[0]
        db_size_mb = (page_count * page_size) / (1024 * 1024)
        
        conn.close()
        db_time = time.time() - db_start
        
        health_data["checks"]["database"] = {
            "status": "healthy",
            "response_time_ms": round(db_time * 1000, 2),
            "comment_count": comment_count,
            "table_count": table_count,
            "size_mb": round(db_size_mb, 2),
            "connection_pool": "active"
        }
        
        # AI Models health check
        models_start = time.time()
        models_status = {
            "sentiment_analyzer": {
                "loaded": ai_models.sentiment_analyzer is not None,
                "cache_size": len(ai_models.sentiment_cache),
                "type": type(ai_models.sentiment_analyzer).__name__
            },
            "summarizer": {
                "loaded": ai_models.summarizer is not None,
                "cache_size": len(ai_models.summary_cache),
                "type": type(ai_models.summarizer).__name__
            }
        }
        
        # Test model performance
        test_text = "This is a test comment for performance measurement."
        sentiment_result = ai_models.get_sentiment_cached(test_text)
        summary_result = ai_models.get_summary_cached(test_text)
        
        models_time = time.time() - models_start
        
        health_data["checks"]["ai_models"] = {
            "status": "healthy",
            "response_time_ms": round(models_time * 1000, 2),
            "models": models_status,
            "test_results": {
                "sentiment_test": sentiment_result[0] if sentiment_result else None,
                "summary_test": summary_result[0]['summary_text'] if summary_result else None
            }
        }
        
        # System resources check
        memory_info = psutil.virtual_memory()
        disk_info = psutil.disk_usage('.')
        
        health_data["checks"]["system"] = {
            "status": "healthy",
            "memory": {
                "total_gb": round(memory_info.total / (1024**3), 2),
                "available_gb": round(memory_info.available / (1024**3), 2),
                "percent_used": memory_info.percent
            },
            "disk": {
                "total_gb": round(disk_info.total / (1024**3), 2),
                "free_gb": round(disk_info.free / (1024**3), 2),
                "percent_used": round((disk_info.used / disk_info.total) * 100, 2)
            },
            "python_version": sys.version.split()[0]
        }
        
        # Performance metrics
        total_time = time.time() - start_time
        health_data["performance"] = {
            "total_check_time_ms": round(total_time * 1000, 2),
            "database_time_ms": round(db_time * 1000, 2),
            "models_time_ms": round(models_time * 1000, 2)
        }
        
        # Optimizations status
        health_data["optimizations"] = {
            "caching_enabled": True,
            "async_processing": True,
            "connection_pooling": True,
            "wal_mode": True,
            "text_limits": {
                "comment_max_chars": 300,
                "summary_max_chars": 50
            },
            "cache_stats": {
                "sentiment_cache_size": len(ai_models.sentiment_cache),
                "summary_cache_size": len(ai_models.summary_cache),
                "cache_hit_optimization": "active"
            }
        }
        
        return health_data
        
    except Exception as e:
        logger.error(f"Detailed health check failed: {str(e)}")
        health_data["status"] = "unhealthy"
        health_data["error"] = str(e)
        health_data["checks"]["error"] = {
            "status": "failed",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }
        return health_data

@app.get("/health/comprehensive")
@monitor_performance("comprehensive_health")
async def comprehensive_health():
    """Comprehensive health check using the monitoring system"""
    try:
        return health_checker.comprehensive_health_check(ai_models)
    except Exception as e:
        log_error_safely(e, "comprehensive_health_check")
        return {
            "status": "error",
            "error": "Health check system failed",
            "timestamp": datetime.now().isoformat()
        }

@app.get("/health/metrics")
@monitor_performance("performance_metrics")
async def performance_metrics():
    """Performance metrics endpoint for monitoring"""
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        # Database performance metrics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_comments,
                COUNT(CASE WHEN sentiment_label = 'positive' THEN 1 END) as positive_count,
                COUNT(CASE WHEN sentiment_label = 'negative' THEN 1 END) as negative_count,
                COUNT(CASE WHEN sentiment_label = 'neutral' THEN 1 END) as neutral_count,
                AVG(sentiment_score) as avg_sentiment_score,
                COUNT(CASE WHEN datetime(created_at) > datetime('now', '-1 hour') THEN 1 END) as recent_comments
            FROM comments
        """)
        
        stats = cursor.fetchone()
        
        # Get recent processing times (simulated - in production you'd track actual times)
        cursor.execute("""
            SELECT COUNT(*) as comments_last_minute
            FROM comments 
            WHERE datetime(created_at) > datetime('now', '-1 minute')
        """)
        recent_activity = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "database_metrics": {
                "total_comments": stats[0],
                "sentiment_distribution": {
                    "positive": stats[1],
                    "negative": stats[2],
                    "neutral": stats[3]
                },
                "average_sentiment_score": round(stats[4] if stats[4] else 0, 3),
                "recent_comments_1h": stats[5],
                "recent_comments_1m": recent_activity
            },
            "cache_metrics": {
                "sentiment_cache_size": len(ai_models.sentiment_cache),
                "summary_cache_size": len(ai_models.summary_cache),
                "cache_efficiency": "optimized"
            },
            "performance_targets": {
                "comment_processing_target_ms": 2000,
                "dashboard_loading_target_ms": 3000,
                "wordcloud_generation_target_ms": 10000,
                "api_response_target_ms": 1000
            }
        }
        
    except Exception as e:
        logger.error(f"Metrics endpoint failed: {str(e)}")
        return {
            "error": "Failed to retrieve metrics",
            "timestamp": datetime.now().isoformat(),
            "status": "error"
        }

@app.get("/monitoring/performance")
@monitor_performance("get_performance_stats")
async def get_performance_stats():
    """Get detailed performance statistics for all monitored endpoints"""
    try:
        overall_stats = performance_monitor.get_overall_stats()
        
        # Get stats for each monitored endpoint
        endpoint_stats = {}
        for endpoint in ['submit_comment', 'get_dashboard_stats', 'generate_wordcloud', 'health_check']:
            endpoint_stats[endpoint] = performance_monitor.get_endpoint_stats(endpoint)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "overall": overall_stats,
            "endpoints": endpoint_stats,
            "performance_targets": {
                "comment_processing_ms": 2000,
                "dashboard_loading_ms": 3000,
                "wordcloud_generation_ms": 10000,
                "api_response_ms": 1000
            }
        }
    except Exception as e:
        log_error_safely(e, "get_performance_stats")
        return {
            "error": "Failed to retrieve performance statistics",
            "timestamp": datetime.now().isoformat()
        }

@app.get("/monitoring/logs")
@monitor_performance("get_recent_logs")
async def get_recent_logs(lines: int = 50):
    """Get recent log entries (sanitized for production)"""
    try:
        import os
        
        logs = []
        log_files = ['logs/app.log', 'logs/error.log']
        
        for log_file in log_files:
            if os.path.exists(log_file):
                try:
                    with open(log_file, 'r') as f:
                        file_lines = f.readlines()
                        recent_lines = file_lines[-lines:] if len(file_lines) > lines else file_lines
                        
                        for line in recent_lines:
                            logs.append({
                                'file': log_file,
                                'content': line.strip(),
                                'timestamp': datetime.now().isoformat()
                            })
                except Exception as e:
                    logs.append({
                        'file': log_file,
                        'error': f"Could not read log file: {str(e)}",
                        'timestamp': datetime.now().isoformat()
                    })
        
        return {
            "timestamp": datetime.now().isoformat(),
            "logs": logs[-lines:],  # Limit to requested number of lines
            "total_entries": len(logs)
        }
        
    except Exception as e:
        log_error_safely(e, "get_recent_logs")
        return {
            "error": "Failed to retrieve logs",
            "timestamp": datetime.now().isoformat()
        }

@app.post("/api/comments", response_model=CommentResponse)
@monitor_performance("submit_comment")
async def submit_comment(comment: CommentInput):
    """
    Submit a single comment for fast processing
    Processes through optimized sentiment analysis and summarization pipeline
    """
    try:
        # Process comment through optimized AI pipeline
        processed_comment = await process_comment_async(comment.stakeholder_type, comment.raw_text)
        
        # Save to database
        comment_id = save_comment_to_db_fast(processed_comment)
        
        # Return processed comment with ID
        return CommentResponse(
            id=comment_id,
            timestamp=processed_comment['timestamp'],
            stakeholder_type=processed_comment['stakeholder_type'],
            raw_text=processed_comment['raw_text'],
            sentiment_label=processed_comment['sentiment_label'],
            sentiment_score=processed_comment['sentiment_score'],
            summary=processed_comment['summary'],
            created_at=processed_comment['timestamp']
        )
        
    except Exception as e:
        log_error_safely(e, "submit_comment", context="comment_processing")
        raise HTTPException(status_code=500, detail="Error processing comment")

@app.post("/api/comments/bulk")
async def submit_bulk_comments(file: UploadFile = File(...)):
    """
    Upload and process multiple comments from CSV file with optimized batch processing
    Expected CSV columns: stakeholder_type, raw_text
    """
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV")
        
        # Read CSV file
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Validate required columns
        required_columns = ['stakeholder_type', 'raw_text']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(
                status_code=400, 
                detail=f"CSV must contain columns: {required_columns}"
            )
        
        # Process comments in batches for better performance
        batch_size = 10
        processed_comments = []
        
        for i in range(0, len(df), batch_size):
            batch = df.iloc[i:i+batch_size]
            
            # Process batch asynchronously
            batch_tasks = []
            for _, row in batch.iterrows():
                if pd.isna(row['raw_text']) or pd.isna(row['stakeholder_type']):
                    continue  # Skip empty rows
                
                # Validate stakeholder type
                if row['stakeholder_type'] not in ['citizen', 'business', 'ngo', 'academic']:
                    continue  # Skip invalid stakeholder types
                
                # Truncate text to 300 characters
                raw_text = str(row['raw_text'])[:300]
                
                task = process_comment_async(row['stakeholder_type'], raw_text)
                batch_tasks.append(task)
            
            # Wait for batch to complete
            if batch_tasks:
                batch_results = await asyncio.gather(*batch_tasks)
                
                # Save batch to database
                for processed_comment in batch_results:
                    comment_id = save_comment_to_db_fast(processed_comment)
                    
                    processed_comments.append(CommentResponse(
                        id=comment_id,
                        timestamp=processed_comment['timestamp'],
                        stakeholder_type=processed_comment['stakeholder_type'],
                        raw_text=processed_comment['raw_text'],
                        sentiment_label=processed_comment['sentiment_label'],
                        sentiment_score=processed_comment['sentiment_score'],
                        summary=processed_comment['summary'],
                        created_at=processed_comment['timestamp']
                    ))
        
        return {
            "message": f"Successfully processed {len(processed_comments)} comments",
            "comments": processed_comments,
            "processing_info": {
                "batch_size": batch_size,
                "total_batches": (len(df) + batch_size - 1) // batch_size,
                "text_limit": 300,
                "summary_limit": 50
            }
        }
        
    except Exception as e:
        log_error_safely(e, "submit_bulk_comments", context="bulk_comment_processing")
        raise HTTPException(status_code=500, detail="Error processing bulk comments")

@app.get("/api/comments", response_model=List[CommentResponse])
async def get_all_comments(limit: int = 100, offset: int = 0):
    """
    Retrieve all comments with pagination and optimized query
    """
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, timestamp, stakeholder_type, raw_text, sentiment_label, 
                   sentiment_score, summary, created_at
            FROM comments
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ''', (limit, offset))
        
        rows = cursor.fetchall()
        conn.close()
        
        comments = []
        for row in rows:
            comments.append(CommentResponse(
                id=row[0],
                timestamp=row[1],
                stakeholder_type=row[2],
                raw_text=row[3],
                sentiment_label=row[4],
                sentiment_score=row[5],
                summary=row[6],
                created_at=row[7]
            ))
        
        return comments
        
    except Exception as e:
        log_error_safely(e, "get_all_comments", context="comment_retrieval")
        raise HTTPException(status_code=500, detail="Error retrieving comments")

@app.get("/api/dashboard", response_model=DashboardStats)
@monitor_performance("get_dashboard_stats")
async def get_dashboard_stats():
    """
    Get dashboard statistics with optimized queries
    """
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        # Get total count
        cursor.execute("SELECT COUNT(*) FROM comments")
        total_comments = cursor.fetchone()[0]
        
        if total_comments == 0:
            return DashboardStats(
                total_comments=0,
                positive_percentage=0.0,
                neutral_percentage=0.0,
                negative_percentage=0.0,
                recent_comments=[]
            )
        
        # Get sentiment distribution
        cursor.execute('''
            SELECT sentiment_label, COUNT(*) 
            FROM comments 
            GROUP BY sentiment_label
        ''')
        sentiment_counts = dict(cursor.fetchall())
        
        # Calculate percentages
        positive_count = sentiment_counts.get('positive', 0)
        negative_count = sentiment_counts.get('negative', 0)
        neutral_count = sentiment_counts.get('neutral', 0)
        
        positive_percentage = (positive_count / total_comments) * 100
        negative_percentage = (negative_count / total_comments) * 100
        neutral_percentage = (neutral_count / total_comments) * 100
        
        # Get recent comments
        cursor.execute('''
            SELECT id, timestamp, stakeholder_type, raw_text, sentiment_label,
                   sentiment_score, summary, created_at
            FROM comments
            ORDER BY created_at DESC
            LIMIT 5
        ''')
        
        recent_rows = cursor.fetchall()
        recent_comments = []
        for row in recent_rows:
            recent_comments.append(CommentResponse(
                id=row[0],
                timestamp=row[1],
                stakeholder_type=row[2],
                raw_text=row[3],
                sentiment_label=row[4],
                sentiment_score=row[5],
                summary=row[6],
                created_at=row[7]
            ))
        
        conn.close()
        
        return DashboardStats(
            total_comments=total_comments,
            positive_percentage=positive_percentage,
            negative_percentage=negative_percentage,
            neutral_percentage=neutral_percentage,
            recent_comments=recent_comments
        )
        
    except Exception as e:
        log_error_safely(e, "get_dashboard_stats", context="dashboard_statistics")
        raise HTTPException(status_code=500, detail="Error getting dashboard stats")

@app.get("/api/wordcloud")
@monitor_performance("generate_wordcloud")
async def generate_wordcloud(sentiment: str = None):
    """
    Generate and return word cloud image from all comments
    Optional sentiment filter: positive, negative, neutral
    """
    try:
        # Import the wordcloud generator
        from wordcloud_generator import WordCloudGenerator
        
        generator = WordCloudGenerator(DATABASE_PATH)
        
        # Generate wordcloud based on sentiment filter
        if sentiment and sentiment in ['positive', 'negative', 'neutral']:
            filename = f"wordcloud_{sentiment}.png"
            text = generator.get_comments_text(sentiment_filter=sentiment)
            if not text:
                raise HTTPException(status_code=404, detail=f"No {sentiment} comments available")
            wordcloud_path = generator.generate_basic_wordcloud(text, filename, sentiment)
        else:
            # Generate general wordcloud
            text = generator.get_comments_text()
            if not text:
                raise HTTPException(status_code=404, detail="No comments available for word cloud")
            wordcloud_path = generator.generate_basic_wordcloud(text, "wordcloud.png")
        
        if not wordcloud_path or not os.path.exists(wordcloud_path):
            raise HTTPException(status_code=500, detail="Failed to generate word cloud")
        
        return FileResponse(
            wordcloud_path,
            media_type="image/png",
            filename=os.path.basename(wordcloud_path)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        log_error_safely(e, "generate_wordcloud", context="wordcloud_generation")
        raise HTTPException(status_code=500, detail="Error generating word cloud")

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize optimizations on startup"""
    logger.info("Starting eConsultation AI - Optimized Backend v2.0.0")
    logger.info("Features: 300 char comments, 50 char summaries, caching, async processing")

if __name__ == "__main__":
    uvicorn.run(
        "app_optimized:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=False,  # Disable reload for better performance
        workers=1,     # Single worker for SQLite compatibility
        log_level="info"
    )