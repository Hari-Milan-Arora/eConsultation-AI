"""
eConsultation AI Backend - Ultra-Fast Optimized Version
Maximum performance with 300 char comments, 50 char summaries
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import sqlite3
import pandas as pd
from datetime import datetime
import os
import io
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading
import time

# AI/ML imports - optimized loading
from transformers import pipeline
import torch
from wordcloud import WordCloud
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for speed
import matplotlib.pyplot as plt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="eConsultation AI API - Ultra Fast",
    description="Ultra-fast AI system for analyzing government consultation comments",
    version="3.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for models (loaded once)
sentiment_analyzer = None
summarizer = None
executor = ThreadPoolExecutor(max_workers=4)  # Parallel processing

# Database setup
DATABASE_PATH = "comments.db"

def init_database():
    """Initialize SQLite database with optimized schema"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Drop and recreate table for clean start
    cursor.execute("DROP TABLE IF EXISTS comments")
    
    cursor.execute("""
        CREATE TABLE comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stakeholder_type TEXT NOT NULL,
            raw_text TEXT NOT NULL CHECK(length(raw_text) <= 300),
            sentiment_label TEXT NOT NULL,
            sentiment_score REAL NOT NULL,
            summary TEXT NOT NULL CHECK(length(summary) <= 50),
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create indexes for faster queries
    cursor.execute("CREATE INDEX idx_sentiment ON comments(sentiment_label)")
    cursor.execute("CREATE INDEX idx_stakeholder ON comments(stakeholder_type)")
    cursor.execute("CREATE INDEX idx_timestamp ON comments(timestamp)")
    
    conn.commit()
    conn.close()
    logger.info("✅ Database initialized with optimized schema")

def load_models():
    """Load AI models once at startup for speed"""
    global sentiment_analyzer, summarizer
    
    try:
        logger.info("🚀 Loading AI models...")
        
        # Load lightweight, fast models
        sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            device=0 if torch.cuda.is_available() else -1,
            return_all_scores=True
        )
        
        # Use a faster, smaller summarization model
        summarizer = pipeline(
            "summarization",
            model="facebook/bart-large-cnn",
            device=0 if torch.cuda.is_available() else -1,
            max_length=50,  # Max 50 characters for summary
            min_length=10,
            do_sample=False
        )
        
        logger.info("✅ AI models loaded successfully")
        
    except Exception as e:
        logger.error(f"❌ Error loading models: {e}")
        # Fallback to CPU models
        sentiment_analyzer = pipeline("sentiment-analysis", device=-1)
        summarizer = pipeline("summarization", device=-1, max_length=50, min_length=10)

# Pydantic models with validation
class CommentRequest(BaseModel):
    stakeholder_type: str = Field(..., regex="^(citizen|business|ngo|academic)$")
    raw_text: str = Field(..., min_length=1, max_length=300)
    
    @validator('raw_text')
    def validate_text(cls, v):
        if len(v.strip()) == 0:
            raise ValueError('Comment text cannot be empty')
        return v.strip()

class CommentResponse(BaseModel):
    id: int
    stakeholder_type: str
    raw_text: str
    sentiment_label: str
    sentiment_score: float
    summary: str
    timestamp: str

class DashboardResponse(BaseModel):
    total_comments: int
    positive_percentage: float
    negative_percentage: float
    neutral_percentage: float
    stakeholder_breakdown: dict

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database and load models on startup"""
    init_database()
    # Load models in background thread to not block startup
    loop = asyncio.get_event_loop()
    loop.run_in_executor(executor, load_models)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Fast health check endpoint"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM comments")
    comment_count = cursor.fetchone()[0]
    conn.close()
    
    return {
        "status": "healthy",
        "database": "connected",
        "comment_count": comment_count,
        "models": {
            "sentiment_analyzer": sentiment_analyzer is not None,
            "summarizer": summarizer is not None
        },
        "version": "3.0.0",
        "performance": "ultra-fast"
    }

def process_comment_fast(text: str) -> tuple:
    """Ultra-fast comment processing"""
    try:
        # Truncate text to 300 chars if needed
        text = text[:300].strip()
        
        # Fast sentiment analysis
        sentiment_result = sentiment_analyzer(text)[0]
        
        # Map sentiment labels
        label_mapping = {
            'LABEL_0': 'negative',
            'LABEL_1': 'neutral', 
            'LABEL_2': 'positive',
            'NEGATIVE': 'negative',
            'NEUTRAL': 'neutral',
            'POSITIVE': 'positive'
        }
        
        sentiment_label = label_mapping.get(sentiment_result['label'], sentiment_result['label'].lower())
        sentiment_score = sentiment_result['score']
        
        # Fast summarization - limit to 50 chars
        if len(text) > 100:  # Only summarize if text is long enough
            try:
                summary_result = summarizer(text, max_length=50, min_length=10, do_sample=False)
                summary = summary_result[0]['summary_text'][:50]  # Ensure 50 char limit
            except:
                # Fallback: simple truncation
                summary = text[:47] + "..." if len(text) > 50 else text
        else:
            summary = text[:50]  # Use original text if short
        
        return sentiment_label, sentiment_score, summary
        
    except Exception as e:
        logger.error(f"Error processing comment: {e}")
        # Fallback processing
        return "neutral", 0.5, text[:50]

@app.post("/api/comments", response_model=CommentResponse)
async def create_comment(comment: CommentRequest):
    """Create and analyze a new comment - ultra fast"""
    try:
        start_time = time.time()
        
        # Process comment in thread pool for speed
        loop = asyncio.get_event_loop()
        sentiment_label, sentiment_score, summary = await loop.run_in_executor(
            executor, process_comment_fast, comment.raw_text
        )
        
        # Store in database
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO comments (stakeholder_type, raw_text, sentiment_label, sentiment_score, summary)
            VALUES (?, ?, ?, ?, ?)
        """, (comment.stakeholder_type, comment.raw_text, sentiment_label, sentiment_score, summary))
        
        comment_id = cursor.lastrowid
        
        # Get the created comment
        cursor.execute("""
            SELECT id, stakeholder_type, raw_text, sentiment_label, sentiment_score, summary, timestamp
            FROM comments WHERE id = ?
        """, (comment_id,))
        
        row = cursor.fetchone()
        conn.commit()
        conn.close()
        
        processing_time = time.time() - start_time
        logger.info(f"✅ Comment processed in {processing_time:.2f}s")
        
        return CommentResponse(
            id=row[0],
            stakeholder_type=row[1],
            raw_text=row[2],
            sentiment_label=row[3],
            sentiment_score=row[4],
            summary=row[5],
            timestamp=row[6]
        )
        
    except Exception as e:
        logger.error(f"Error creating comment: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing comment: {str(e)}")

@app.get("/api/comments", response_model=List[CommentResponse])
async def get_comments(limit: int = 50):
    """Get comments with fast pagination"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, stakeholder_type, raw_text, sentiment_label, sentiment_score, summary, timestamp
            FROM comments 
            ORDER BY timestamp DESC 
            LIMIT ?
        """, (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [
            CommentResponse(
                id=row[0],
                stakeholder_type=row[1],
                raw_text=row[2],
                sentiment_label=row[3],
                sentiment_score=row[4],
                summary=row[5],
                timestamp=row[6]
            )
            for row in rows
        ]
        
    except Exception as e:
        logger.error(f"Error fetching comments: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching comments: {str(e)}")

@app.post("/api/comments/bulk")
async def upload_comments_bulk(file: UploadFile = File(...)):
    """Fast bulk upload of comments from CSV"""
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV")
        
        start_time = time.time()
        
        # Read CSV
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Validate CSV structure
        required_columns = ['stakeholder_type', 'raw_text']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(
                status_code=400, 
                detail=f"CSV must contain columns: {required_columns}"
            )
        
        # Process comments in parallel
        processed_comments = []
        
        async def process_row(row):
            try:
                # Validate and truncate
                stakeholder_type = str(row['stakeholder_type']).strip()
                raw_text = str(row['raw_text']).strip()[:300]  # Enforce 300 char limit
                
                if not raw_text or stakeholder_type not in ['citizen', 'business', 'ngo', 'academic']:
                    return None
                
                # Process comment
                sentiment_label, sentiment_score, summary = await asyncio.get_event_loop().run_in_executor(
                    executor, process_comment_fast, raw_text
                )
                
                return (stakeholder_type, raw_text, sentiment_label, sentiment_score, summary)
                
            except Exception as e:
                logger.error(f"Error processing row: {e}")
                return None
        
        # Process all rows in parallel
        tasks = [process_row(row) for _, row in df.iterrows()]
        results = await asyncio.gather(*tasks)
        
        # Filter out failed processing
        valid_results = [r for r in results if r is not None]
        
        # Bulk insert to database
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.executemany("""
            INSERT INTO comments (stakeholder_type, raw_text, sentiment_label, sentiment_score, summary)
            VALUES (?, ?, ?, ?, ?)
        """, valid_results)
        
        conn.commit()
        conn.close()
        
        processing_time = time.time() - start_time
        logger.info(f"✅ Bulk upload completed in {processing_time:.2f}s")
        
        return {
            "message": f"Successfully processed {len(valid_results)} comments",
            "comments": [{"id": i+1, "processed": True} for i in range(len(valid_results))],
            "processing_time": f"{processing_time:.2f}s",
            "failed_rows": len(df) - len(valid_results)
        }
        
    except Exception as e:
        logger.error(f"Error in bulk upload: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")

@app.get("/api/dashboard", response_model=DashboardResponse)
async def get_dashboard():
    """Fast dashboard statistics"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Get total count
        cursor.execute("SELECT COUNT(*) FROM comments")
        total_comments = cursor.fetchone()[0]
        
        if total_comments == 0:
            return DashboardResponse(
                total_comments=0,
                positive_percentage=0.0,
                negative_percentage=0.0,
                neutral_percentage=0.0,
                stakeholder_breakdown={}
            )
        
        # Get sentiment breakdown
        cursor.execute("""
            SELECT sentiment_label, COUNT(*) 
            FROM comments 
            GROUP BY sentiment_label
        """)
        sentiment_counts = dict(cursor.fetchall())
        
        # Get stakeholder breakdown
        cursor.execute("""
            SELECT stakeholder_type, COUNT(*) 
            FROM comments 
            GROUP BY stakeholder_type
        """)
        stakeholder_counts = dict(cursor.fetchall())
        
        conn.close()
        
        # Calculate percentages
        positive_count = sentiment_counts.get('positive', 0)
        negative_count = sentiment_counts.get('negative', 0)
        neutral_count = sentiment_counts.get('neutral', 0)
        
        return DashboardResponse(
            total_comments=total_comments,
            positive_percentage=(positive_count / total_comments) * 100,
            negative_percentage=(negative_count / total_comments) * 100,
            neutral_percentage=(neutral_count / total_comments) * 100,
            stakeholder_breakdown=stakeholder_counts
        )
        
    except Exception as e:
        logger.error(f"Error getting dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting dashboard: {str(e)}")

@app.get("/api/wordcloud")
async def generate_wordcloud(sentiment: Optional[str] = None):
    """Fast word cloud generation"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        if sentiment:
            cursor.execute("SELECT raw_text FROM comments WHERE sentiment_label = ?", (sentiment,))
        else:
            cursor.execute("SELECT raw_text FROM comments")
        
        texts = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        if not texts:
            raise HTTPException(status_code=404, detail="No comments found")
        
        # Generate word cloud quickly
        combined_text = " ".join(texts)
        
        wordcloud = WordCloud(
            width=800, 
            height=400, 
            background_color='white',
            max_words=100,  # Limit for speed
            colormap='viridis'
        ).generate(combined_text)
        
        # Save to file
        filename = f"wordcloud_{sentiment or 'all'}_{int(time.time())}.png"
        filepath = os.path.join("static", filename)
        
        # Ensure static directory exists
        os.makedirs("static", exist_ok=True)
        
        plt.figure(figsize=(10, 5))
        plt.imshow(wordcloud, interpolation='bilinear')
        plt.axis('off')
        plt.tight_layout(pad=0)
        plt.savefig(filepath, bbox_inches='tight', dpi=150)
        plt.close()
        
        return FileResponse(filepath, media_type="image/png")
        
    except Exception as e:
        logger.error(f"Error generating wordcloud: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating wordcloud: {str(e)}")

if __name__ == "__main__":
    # Create static directory
    os.makedirs("static", exist_ok=True)
    
    # Run with optimized settings
    uvicorn.run(
        "app_fast:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Disable reload for speed
        workers=1,
        loop="asyncio",
        log_level="info"
    )