#!/usr/bin/env python3
"""
Backend Start Script
Starts the FastAPI backend server
"""

import os
import sys
import subprocess
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def start_backend():
    """Start the backend server"""
    logger.info("🚀 Starting eConsultation AI Backend...")
    
    # Change to backend directory
    os.chdir('backend')
    
    # Determine python command
    if os.name == 'nt':  # Windows
        python_command = 'venv\\Scripts\\python'
        if not os.path.exists('venv\\Scripts\\python.exe'):
            python_command = 'python'
    else:  # Unix/Linux/Mac
        python_command = 'venv/bin/python'
        if not os.path.exists('venv/bin/python'):
            python_command = 'python3'
    
    # Create models if they don't exist
    if not os.path.exists('models/simple_sentiment_model.pkl'):
        logger.info("Creating AI models...")
        subprocess.run([python_command, 'instant_train.py'])
    
    # Start the server
    logger.info("Starting FastAPI server on http://localhost:8000")
    logger.info("API Documentation available at http://localhost:8000/docs")
    logger.info("Press Ctrl+C to stop the server")
    
    try:
        subprocess.run([python_command, 'app.py'])
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Error starting server: {e}")

if __name__ == "__main__":
    start_backend()
# Codex note: refreshed to remove stale helper references.
