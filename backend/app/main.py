"""
eConsultation AI Backend - FastAPI Application
Main backend server handling comment processing, sentiment analysis, and summarization.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import pandas as pd
from datetime import datetime
import os
import io
import logging
import uvicorn

# AI/ML imports
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch
from wordcloud import WordCloud
import matplotlib.pyplot as plt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="eConsultation AI API",
    description="AI-powered system for analyzing government consultation comments",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI models
class AIModels:
    """Handles loading and management of AI models"""
    
    def __init__(self):
        self.sentiment_analyzer = None
        self.summarizer = None
        self._load_models()
    
    def _load_models(self):
        """Load pre-trained models for sentiment analysis and summarization"""
        try:
            logger.info("Loading sentiment analysis model...")
            
            # Try custom trained model first
            custom_model_paths = [
                "models/sentiment_model",
                "models/simple_sentiment_model", 
                "models/instant_sentiment_model"
            ]
            
            model_loaded = False
            for model_path in custom_model_paths:
                if os.path.exists(model_path):
                    try:
                        logger.info(f"Attempting to load custom model from {model_path}")
                        
                        # Fix the config file if it has wrong model_type
                        config_path = os.path.join(model_path, "config.json")
                        if os.path.exists(config_path):
                            import json
                            with open(config_path, 'r') as f:
                                config = json.load(f)
                            
                            # Fix incorrect model_type
                            if config.get("model_type") == "sentiment_analysis":
                                config["model_type"] = "distilbert"
                                config["architectures"] = ["DistilBertForSequenceClassification"]
                                
                                # Save corrected config
                                with open(config_path, 'w') as f:
                                    json.dump(config, f, indent=2)
                                logger.info(f"Fixed model config in {config_path}")
                        
                        # Load the corrected model
                        self.sentiment_analyzer = pipeline(
                            "text-classification",
                            model=model_path,
                            tokenizer=model_path,
                            return_all_scores=True,
                            device=-1  # Force CPU usage
                        )
                        logger.info(f"Successfully loaded custom model from {model_path}")
                        model_loaded = True
                        break
                        
                    except Exception as e:
                        logger.warning(f"Failed to load custom model from {model_path}: {str(e)}")
                        continue
            
            # Fallback to pre-trained model if custom model fails
            if not model_loaded:
                logger.info("Loading fallback pre-trained sentiment model...")
                self.sentiment_analyzer = pipeline(
                    "sentiment-analysis",
                    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                    return_all_scores=True,
                    device=-1  # Force CPU usage
                )
                logger.info("Loaded fallback sentiment model successfully")
            
            logger.info("Loading summarization model...")
            self.summarizer = pipeline(
                "summarization",
                model="facebook/bart-large-cnn",
                max_length=50,
                min_length=10,
                do_sample=False,
                device=-1  # Force CPU usage
            )
            
            logger.info("All models loaded successfully!")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            # Create fallback functions if model loading fails completely
            self._create_fallback_models()
    
    def _create_fallback_models(self):
        """Create simple fallback models if main models fail to load"""
        logger.warning("Creating fallback models...")
        
        class FallbackSentimentAnalyzer:
            def __call__(self, text):
                # Simple keyword-based sentiment analysis
                positive_words = ['good', 'great', 'excellent', 'positive', 'support', 'benefit', 'improve']
                negative_words = ['bad', 'terrible', 'negative', 'oppose', 'against', 'harm', 'problem']
                
                text_lower = text.lower()
                positive_score = sum(1 for word in positive_words if word in text_lower)
                negative_score = sum(1 for word in negative_words if word in text_lower)
                
                if positive_score > negative_score:
                    return [{'label': 'POSITIVE', 'score': 0.7}]
                elif negative_score > positive_score:
                    return [{'label': 'NEGATIVE', 'score': 0.7}]
                else:
                    return [{'label': 'NEUTRAL', 'score': 0.6}]
        
        class FallbackSummarizer:
            def __call__(self, text, **kwargs):
                # Simple text truncation
                sentences = text.split('.')
                if len(sentences) > 2:
                    summary = '. '.join(sentences[:2]) + '.'
                else:
                    summary = text[:100] + "..." if len(text) > 100 else text
                return [{'summary_text': summary}]
        
        self.sentiment_analyzer = FallbackSentimentAnalyzer()
        self.summarizer = FallbackSummarizer()
        logger.info("Fallback models created successfully")

# Initialize models globally
ai_models = AIModels()

# Database setup
DATABASE_PATH = "eConsultation.db"

def init_database():
    """Initialize SQLite database with comments table"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            stakeholder_type TEXT NOT NULL,
            raw_text TEXT NOT NULL,
            sentiment_label TEXT,
            sentiment_score REAL,
            summary TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully")

# Initialize database on startup
init_database()

# Pydantic models for API
class CommentInput(BaseModel):
    """Input model for single comment submission"""
    stakeholder_type: str
    raw_text: str

class CommentResponse(BaseModel):
    """Response model for processed comment"""
    id: int
    timestamp: str
    stakeholder_type: str
    raw_text: str
    sentiment_label: str
    sentiment_score: float
    summary: str
    created_at: str

class DashboardStats(BaseModel):
    """Model for dashboard statistics"""
    total_comments: int
    positive_percentage: float
    neutral_percentage: float
    negative_percentage: float
    recent_comments: List[CommentResponse]

# Helper functions
def analyze_sentiment(text: str) -> tuple:
    """
    Analyze sentiment of text using trained model
    Returns: (sentiment_label, confidence_score)
    """
    try:
        results = ai_models.sentiment_analyzer(text)
        
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
        logger.error(f"Error in sentiment analysis: {str(e)}")
        return "neutral", 0.5

def generate_summary(text: str) -> str:
    """
    Generate one-line summary of comment text
    Returns: summary string
    """
    try:
        # Skip very short texts
        if len(text.split()) < 10:
            return text[:100] + "..." if len(text) > 100 else text
        
        # Generate summary
        summary_result = ai_models.summarizer(
            text,
            max_length=40,
            min_length=5,
            do_sample=False
        )
        
        summary = summary_result[0]['summary_text']
        
        # Ensure it's one line and reasonable length
        summary = summary.replace('\n', ' ').strip()
        if len(summary) > 150:
            summary = summary[:147] + "..."
            
        return summary
        
    except Exception as e:
        logger.error(f"Error in summarization: {str(e)}")
        # Fallback: return first 100 characters
        return text[:100] + "..." if len(text) > 100 else text

def process_comment(stakeholder_type: str, raw_text: str) -> dict:
    """
    Process a single comment through the AI pipeline
    Returns: processed comment data
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Run AI processing
    sentiment_label, sentiment_score = analyze_sentiment(raw_text)
    summary = generate_summary(raw_text)
    
    return {
        'timestamp': timestamp,
        'stakeholder_type': stakeholder_type,
        'raw_text': raw_text,
        'sentiment_label': sentiment_label,
        'sentiment_score': sentiment_score,
        'summary': summary
    }

def save_comment_to_db(comment_data: dict) -> int:
    """Save processed comment to database and return ID"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO comments (timestamp, stakeholder_type, raw_text, sentiment_label, sentiment_score, summary)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        comment_data['timestamp'],
        comment_data['stakeholder_type'],
        comment_data['raw_text'],
        comment_data['sentiment_label'],
        comment_data['sentiment_score'],
        comment_data['summary']
    ))
    
    comment_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return comment_id

# API Endpoints

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "eConsultation AI API is running", "version": "1.0.0"}

@app.post("/api/comments", response_model=CommentResponse)
async def submit_comment(comment: CommentInput):
    """
    Submit a single comment for processing
    Processes through sentiment analysis and summarization pipeline
    """
    try:
        # Process comment through AI pipeline
        processed_comment = process_comment(comment.stakeholder_type, comment.raw_text)
        
        # Save to database
        comment_id = save_comment_to_db(processed_comment)
        
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
        logger.error(f"Error processing comment: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing comment")

@app.post("/api/comments/bulk")
async def submit_bulk_comments(file: UploadFile = File(...)):
    """
    Upload and process multiple comments from CSV file
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
        
        processed_comments = []
        
        # Process each comment
        for _, row in df.iterrows():
            if pd.isna(row['raw_text']) or pd.isna(row['stakeholder_type']):
                continue  # Skip empty rows
                
            processed_comment = process_comment(
                row['stakeholder_type'], 
                str(row['raw_text'])
            )
            
            comment_id = save_comment_to_db(processed_comment)
            
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
            "comments": processed_comments
        }
        
    except Exception as e:
        logger.error(f"Error processing bulk comments: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing bulk comments")

@app.get("/api/comments", response_model=List[CommentResponse])
async def get_all_comments(limit: int = 100, offset: int = 0):
    """
    Retrieve all comments with pagination
    """
    try:
        conn = sqlite3.connect(DATABASE_PATH)
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
        logger.error(f"Error retrieving comments: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving comments")

@app.get("/api/comments/{comment_id}", response_model=CommentResponse)
async def get_comment(comment_id: int):
    """
    Retrieve a single comment by ID
    """
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, timestamp, stakeholder_type, raw_text, sentiment_label,
                   sentiment_score, summary, created_at
            FROM comments
            WHERE id = ?
        ''', (comment_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        return CommentResponse(
            id=row[0],
            timestamp=row[1],
            stakeholder_type=row[2],
            raw_text=row[3],
            sentiment_label=row[4],
            sentiment_score=row[5],
            summary=row[6],
            created_at=row[7]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving comment: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving comment")

@app.get("/api/wordcloud")
async def generate_wordcloud():
    """
    Generate and return word cloud image from all comments
    """
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT raw_text FROM comments')
        rows = cursor.fetchall()
        conn.close()
        
        if not rows:
            raise HTTPException(status_code=404, detail="No comments available for word cloud")
        
        # Combine all comment texts
        all_text = ' '.join([row[0] for row in rows])
        
        # Generate word cloud
        wordcloud = WordCloud(
            width=800,
            height=600,
            background_color='white',
            max_words=100,
            colormap='viridis'
        ).generate(all_text)
        
        # Save to file
        os.makedirs('temp', exist_ok=True)
        wordcloud_path = 'temp/wordcloud.png'
        wordcloud.to_file(wordcloud_path)
        
        return FileResponse(
            wordcloud_path,
            media_type="image/png",
            filename="wordcloud.png"
        )
        
    except Exception as e:
        logger.error(f"Error generating word cloud: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating word cloud")

@app.get("/api/dashboard", response_model=DashboardStats)
async def get_dashboard_stats():
    """
    Get dashboard statistics including sentiment distribution
    """
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Get total count
        cursor.execute('SELECT COUNT(*) FROM comments')
        total_comments = cursor.fetchone()[0]
        
        if total_comments == 0:
            return DashboardStats(
                total_comments=0,
                positive_percentage=0,
                neutral_percentage=0,
                negative_percentage=0,
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
        neutral_count = sentiment_counts.get('neutral', 0)
        negative_count = sentiment_counts.get('negative', 0)
        
        positive_percentage = (positive_count / total_comments) * 100
        neutral_percentage = (neutral_count / total_comments) * 100
        negative_percentage = (negative_count / total_comments) * 100
        
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
            positive_percentage=round(positive_percentage, 2),
            neutral_percentage=round(neutral_percentage, 2),
            negative_percentage=round(negative_percentage, 2),
            recent_comments=recent_comments
        )
        
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving dashboard statistics")

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )