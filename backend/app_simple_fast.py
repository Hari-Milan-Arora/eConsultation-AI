"""
eConsultation AI Backend - Simple Fast Version
Works reliably with 300 char comments, 50 char summaries
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import pandas as pd
import os
import io
import logging
import time
import json

# Simple AI processing
from textblob import TextBlob
from wordcloud import WordCloud
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="eConsultation AI API - Simple Fast",
    description="Simple, fast AI system for analyzing comments",
    version="3.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_PATH = "comments.db"

def init_database():
    """Initialize SQLite database"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stakeholder_type TEXT NOT NULL,
            raw_text TEXT NOT NULL,
            sentiment_label TEXT NOT NULL,
            sentiment_score REAL NOT NULL,
            summary TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()
    logger.info("✅ Database initialized")

# Pydantic models
class CommentRequest(BaseModel):
    stakeholder_type: str
    raw_text: str

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

# Initialize database on startup
init_database()

def process_comment_simple(text: str) -> tuple:
    """Simple, fast comment processing using TextBlob"""
    try:
        # Limit to 300 characters
        text = text[:300].strip()
        
        # Simple sentiment analysis using TextBlob
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity
        
        # Map polarity to sentiment
        if polarity > 0.1:
            sentiment_label = "positive"
            sentiment_score = min(0.5 + polarity/2, 1.0)
        elif polarity < -0.1:
            sentiment_label = "negative"
            sentiment_score = max(0.5 + polarity/2, 0.0)
        else:
            sentiment_label = "neutral"
            sentiment_score = 0.5
        
        # Simple summarization - limit to 50 characters
        if len(text) > 50:
            # Take first sentence or first 47 chars + "..."
            sentences = text.split('.')
            if len(sentences[0]) <= 47:
                summary = sentences[0] + "."
            else:
                summary = text[:47] + "..."
        else:
            summary = text
        
        # Ensure summary is max 50 chars
        summary = summary[:50]
        
        return sentiment_label, sentiment_score, summary
        
    except Exception as e:
        logger.error(f"Error processing comment: {e}")
        return "neutral", 0.5, text[:50]

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
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
                "sentiment_analyzer": True,
                "summarizer": True
            },
            "version": "3.1.0",
            "performance": "simple-fast"
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

@app.post("/api/comments", response_model=CommentResponse)
async def create_comment(comment: CommentRequest):
    """Create and analyze a new comment"""
    try:
        start_time = time.time()
        
        # Validate input
        if not comment.raw_text.strip():
            raise HTTPException(status_code=400, detail="Comment text cannot be empty")
        
        if comment.stakeholder_type not in ['citizen', 'business', 'ngo', 'academic']:
            raise HTTPException(status_code=400, detail="Invalid stakeholder type")
        
        # Limit text to 300 characters
        raw_text = comment.raw_text.strip()[:300]
        
        # Process comment
        sentiment_label, sentiment_score, summary = process_comment_simple(raw_text)
        
        # Store in database
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO comments (stakeholder_type, raw_text, sentiment_label, sentiment_score, summary)
            VALUES (?, ?, ?, ?, ?)
        """, (comment.stakeholder_type, raw_text, sentiment_label, sentiment_score, summary))
        
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
        logger.info(f"✅ Comment processed in {processing_time:.3f}s")
        
        return CommentResponse(
            id=row[0],
            stakeholder_type=row[1],
            raw_text=row[2],
            sentiment_label=row[3],
            sentiment_score=row[4],
            summary=row[5],
            timestamp=row[6]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating comment: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing comment: {str(e)}")

@app.get("/api/comments", response_model=List[CommentResponse])
async def get_comments(limit: int = 50):
    """Get comments"""
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
    """Bulk upload of comments from CSV"""
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
        
        # Process comments
        processed_comments = []
        failed_count = 0
        
        for _, row in df.iterrows():
            try:
                stakeholder_type = str(row['stakeholder_type']).strip()
                raw_text = str(row['raw_text']).strip()[:300]  # Limit to 300 chars
                
                if not raw_text or stakeholder_type not in ['citizen', 'business', 'ngo', 'academic']:
                    failed_count += 1
                    continue
                
                # Process comment
                sentiment_label, sentiment_score, summary = process_comment_simple(raw_text)
                
                processed_comments.append((
                    stakeholder_type, raw_text, sentiment_label, sentiment_score, summary
                ))
                
            except Exception as e:
                logger.error(f"Error processing row: {e}")
                failed_count += 1
        
        # Bulk insert to database
        if processed_comments:
            conn = sqlite3.connect(DATABASE_PATH)
            cursor = conn.cursor()
            
            cursor.executemany("""
                INSERT INTO comments (stakeholder_type, raw_text, sentiment_label, sentiment_score, summary)
                VALUES (?, ?, ?, ?, ?)
            """, processed_comments)
            
            conn.commit()
            conn.close()
        
        processing_time = time.time() - start_time
        logger.info(f"✅ Bulk upload completed in {processing_time:.2f}s")
        
        return {
            "message": f"Successfully processed {len(processed_comments)} comments",
            "comments": [{"id": i+1, "processed": True} for i in range(len(processed_comments))],
            "processing_time": f"{processing_time:.2f}s",
            "failed_rows": failed_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk upload: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")

@app.get("/api/dashboard", response_model=DashboardResponse)
async def get_dashboard():
    """Get dashboard statistics"""
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
    """Generate word cloud"""
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
        
        # Generate word cloud
        combined_text = " ".join(texts)
        
        wordcloud = WordCloud(
            width=800, 
            height=400, 
            background_color='white',
            max_words=100,
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating wordcloud: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating wordcloud: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    
    # Create static directory
    os.makedirs("static", exist_ok=True)
    
    print("🚀 Starting Simple Fast Backend...")
    print("📊 Features:")
    print("   • 300 character limit for comments")
    print("   • 50 character limit for summaries")
    print("   • Fast TextBlob sentiment analysis")
    print("   • Simple summarization")
    print("   • Bulk CSV upload")
    print("   • Word cloud generation")
    
    uvicorn.run(
        "app_simple_fast:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )