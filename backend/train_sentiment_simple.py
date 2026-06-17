"""
Simple Sentiment Analysis Model Training Script
Lightweight version that works reliably on any system
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
import pickle
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_data():
    """Load and preprocess the sample data"""
    data_path = '../data/sample_comments.csv'
    if not os.path.exists(data_path):
        data_path = 'data/sample_comments.csv'
    
    if not os.path.exists(data_path):
        logger.error("Sample data file not found!")
        return None
    
    df = pd.read_csv(data_path)
    logger.info(f"Loaded {len(df)} comments")
    
    # Clean data
    df = df.dropna(subset=['raw_text', 'sentiment_label'])
    df['raw_text'] = df['raw_text'].astype(str)
    
    return df

def train_simple_model():
    """Train a simple but effective sentiment model"""
    logger.info("Starting simple sentiment model training...")
    
    # Load data
    df = load_data()
    if df is None:
        return False
    
    # Prepare data
    X = df['raw_text'].values
    y = df['sentiment_label'].values
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Vectorize text
    logger.info("Vectorizing text...")
    vectorizer = TfidfVectorizer(
        max_features=5000,
        stop_words='english',
        ngram_range=(1, 2),
        min_df=2
    )
    
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    
    # Train model
    logger.info("Training logistic regression model...")
    model = LogisticRegression(
        random_state=42,
        max_iter=1000,
        class_weight='balanced'
    )
    
    model.fit(X_train_vec, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_vec)
    accuracy = accuracy_score(y_test, y_pred)
    
    logger.info(f"Model accuracy: {accuracy:.4f}")
    logger.info("\nClassification Report:")
    logger.info(classification_report(y_test, y_pred))
    
    # Save model
    os.makedirs('models', exist_ok=True)
    
    with open('models/simple_sentiment_model.pkl', 'wb') as f:
        pickle.dump({
            'model': model,
            'vectorizer': vectorizer,
            'accuracy': accuracy,
            'labels': ['negative', 'neutral', 'positive']
        }, f)
    
    logger.info("Model saved to models/simple_sentiment_model.pkl")
    return True

def test_model():
    """Test the trained model"""
    try:
        with open('models/simple_sentiment_model.pkl', 'rb') as f:
            model_data = pickle.load(f)
        
        model = model_data['model']
        vectorizer = model_data['vectorizer']
        
        # Test samples
        test_texts = [
            "This policy is excellent and will benefit everyone!",
            "I hate this proposal, it's terrible.",
            "The policy seems okay, nothing special."
        ]
        
        for text in test_texts:
            text_vec = vectorizer.transform([text])
            prediction = model.predict(text_vec)[0]
            probabilities = model.predict_proba(text_vec)[0]
            confidence = max(probabilities)
            
            logger.info(f"Text: {text}")
            logger.info(f"Prediction: {prediction} (confidence: {confidence:.3f})")
            logger.info("-" * 50)
        
        return True
    except Exception as e:
        logger.error(f"Error testing model: {e}")
        return False

if __name__ == "__main__":
    success = train_simple_model()
    if success:
        logger.info("Testing the trained model...")
        test_model()
        logger.info("Simple sentiment model training completed successfully!")
    else:
        logger.error("Training failed!")