#!/usr/bin/env python3
"""
eConsultation AI Setup Script
Automated setup for the entire application
"""

import os
import sys
import subprocess
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_command(command, cwd=None):
    """Run a command and return success status"""
    try:
        logger.info(f"Running: {command}")
        result = subprocess.run(command, shell=True, cwd=cwd, capture_output=True, text=True)
        if result.returncode == 0:
            logger.info("✅ Command succeeded")
            return True
        else:
            logger.error(f"❌ Command failed: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"❌ Error running command: {e}")
        return False

def setup_backend():
    """Setup backend environment"""
    logger.info("🔧 Setting up backend...")
    
    # Change to backend directory
    os.chdir('backend')
    
    # Create virtual environment if it doesn't exist
    if not os.path.exists('venv'):
        logger.info("Creating virtual environment...")
        if not run_command(f"{sys.executable} -m venv venv"):
            return False
    
    # Determine activation script
    if os.name == 'nt':  # Windows
        activate_script = 'venv\\Scripts\\activate'
        pip_command = 'venv\\Scripts\\pip'
        python_command = 'venv\\Scripts\\python'
    else:  # Unix/Linux/Mac
        activate_script = 'source venv/bin/activate'
        pip_command = 'venv/bin/pip'
        python_command = 'venv/bin/python'
    
    # Install requirements
    logger.info("Installing Python dependencies...")
    if not run_command(f"{pip_command} install --upgrade pip"):
        return False
    
    if not run_command(f"{pip_command} install -r requirements.txt"):
        return False
    
    # Create instant models
    logger.info("Creating instant AI models...")
    if not run_command(f"{python_command} instant_train.py"):
        logger.warning("Instant training failed, but continuing...")
    
    # Initialize database
    logger.info("Initializing database...")
    if not run_command(f"{python_command} -c \"from app_optimized import init_database; init_database()\""):
        logger.warning("Database initialization failed, but continuing...")
    
    os.chdir('..')
    logger.info("✅ Backend setup completed")
    return True

def setup_frontend():
    """Setup frontend environment"""
    logger.info("🔧 Setting up frontend...")
    
    # Change to frontend directory
    os.chdir('frontend')
    
    # Install npm dependencies
    logger.info("Installing Node.js dependencies...")
    if not run_command("npm install"):
        logger.error("❌ npm install failed")
        os.chdir('..')
        return False
    
    # Build the frontend
    logger.info("Building frontend...")
    if not run_command("npm run build"):
        logger.warning("Frontend build failed, but continuing...")
    
    os.chdir('..')
    logger.info("✅ Frontend setup completed")
    return True

def setup_docker():
    """Setup Docker environment"""
    logger.info("🔧 Setting up Docker environment...")
    
    # Check if Docker is available
    if not run_command("docker --version"):
        logger.warning("Docker not available, skipping Docker setup")
        return True
    
    # Build Docker images
    logger.info("Building Docker images...")
    if not run_command("docker-compose build"):
        logger.warning("Docker build failed, but continuing...")
        return True
    
    logger.info("✅ Docker setup completed")
    return True

def load_sample_data():
    """Load sample data into the system"""
    logger.info("📊 Loading sample data...")
    
    try:
        # Change to backend directory
        os.chdir('backend')
        
        # Determine python command
        if os.name == 'nt':  # Windows
            python_command = 'venv\\Scripts\\python'
        else:  # Unix/Linux/Mac
            python_command = 'venv/bin/python'
        
        # Load sample data
        load_script = '''
import pandas as pd
import sqlite3
from datetime import datetime

# Read sample data
df = pd.read_csv("../data/sample_comments.csv")

# Connect to database
conn = sqlite3.connect("eConsultation.db")
cursor = conn.cursor()

# Insert sample data
for _, row in df.iterrows():
    cursor.execute("""
        INSERT INTO comments (timestamp, stakeholder_type, raw_text, sentiment_label, sentiment_score, summary)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        row["timestamp"],
        row["stakeholder_type"], 
        row["raw_text"],
        row["sentiment_label"],
        0.8,  # Default confidence
        row["raw_text"][:100] + "..." if len(row["raw_text"]) > 100 else row["raw_text"]
    ))

conn.commit()
conn.close()
print(f"Loaded {len(df)} sample comments into database")
'''
        
        with open('load_sample_data.py', 'w') as f:
            f.write(load_script)
        
        if run_command(f"{python_command} load_sample_data.py"):
            logger.info("✅ Sample data loaded successfully")
        else:
            logger.warning("Sample data loading failed, but continuing...")
        
        # Clean up
        if os.path.exists('load_sample_data.py'):
            os.remove('load_sample_data.py')
        
        os.chdir('..')
        
    except Exception as e:
        logger.error(f"Error loading sample data: {e}")
        os.chdir('..')

def main():
    """Main setup function"""
    logger.info("🚀 Starting eConsultation AI Setup")
    logger.info("=" * 50)
    
    # Check Python version
    if sys.version_info < (3, 8):
        logger.error("❌ Python 3.8 or higher is required")
        return False
    
    # Setup backend
    if not setup_backend():
        logger.error("❌ Backend setup failed")
        return False
    
    # Setup frontend
    if not setup_frontend():
        logger.error("❌ Frontend setup failed")
        return False
    
    # Setup Docker (optional)
    setup_docker()
    
    # Load sample data
    load_sample_data()
    
    logger.info("=" * 50)
    logger.info("🎉 Setup completed successfully!")
    logger.info("")
    logger.info("To start the application:")
    logger.info("1. Backend: cd backend && venv/Scripts/activate && python app.py")
    logger.info("2. Frontend: cd frontend && npm start")
    logger.info("3. Or use Docker: docker-compose up")
    logger.info("")
    logger.info("Access the application at:")
    logger.info("- Frontend: http://localhost:3000")
    logger.info("- Backend API: http://localhost:8000")
    logger.info("- API Docs: http://localhost:8000/docs")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
# Codex note: refreshed to remove stale helper references.
