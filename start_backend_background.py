#!/usr/bin/env python3
"""
Background Backend Start Script
Starts the backend in the background for testing
"""

import subprocess
import sys
import os
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def start_backend_background():
    """Start backend in background"""
    logger.info("🚀 Starting backend in background...")
    
    # Change to backend directory
    backend_dir = os.path.join(os.getcwd(), 'backend')
    
    # Start backend process
    if os.name == 'nt':  # Windows
        # Use start command to run in background
        process = subprocess.Popen(
            ['python', 'start_simple.py'],
            cwd=backend_dir,
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
    else:  # Unix/Linux/Mac
        process = subprocess.Popen(
            ['python3', 'start_simple.py'],
            cwd=backend_dir
        )
    
    logger.info(f"Backend started with PID: {process.pid}")
    logger.info("Waiting for backend to initialize...")
    
    # Wait a bit for startup
    time.sleep(10)
    
    return process

if __name__ == "__main__":
    process = start_backend_background()
    
    try:
        # Keep the script running
        logger.info("Backend is running. Press Ctrl+C to stop.")
        process.wait()
    except KeyboardInterrupt:
        logger.info("Stopping backend...")
        process.terminate()
        process.wait()
        logger.info("Backend stopped.")