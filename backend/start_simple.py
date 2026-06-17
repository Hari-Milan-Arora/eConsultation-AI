#!/usr/bin/env python3
"""
Simple Backend Start Script
Starts the FastAPI backend server without reloader
"""

import uvicorn
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("🚀 Starting eConsultation AI Backend (Simple Mode)...")
    logger.info("Server will be available at http://localhost:8000")
    logger.info("API Documentation at http://localhost:8000/docs")
    logger.info("Press Ctrl+C to stop")
    
    # Run the server without reloader to avoid memory issues
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Disable reloader
        log_level="info"
    )