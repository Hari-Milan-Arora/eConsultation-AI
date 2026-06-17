#!/usr/bin/env python3
"""
Optimized Backend Start Script
Automatically activates virtual environment and starts the optimized backend
"""

import os
import sys
import subprocess
import logging
import time
import shutil

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_venv():
    """Check if virtual environment exists and is properly configured"""
    venv_path = os.path.join('backend', 'venv')
    
    if os.name == 'nt':  # Windows
        python_exe = os.path.join(venv_path, 'Scripts', 'python.exe')
        pip_exe = os.path.join(venv_path, 'Scripts', 'pip.exe')
    else:  # Unix/Linux/Mac
        python_exe = os.path.join(venv_path, 'bin', 'python')
        pip_exe = os.path.join(venv_path, 'bin', 'pip')
    
    if not os.path.exists(python_exe):
        logger.error(f"❌ Virtual environment not found at {venv_path}")
        logger.info("Please run 'python -m venv backend/venv' to create it")
        return False, None, None
    
    logger.info(f"✅ Virtual environment found at {venv_path}")
    return True, python_exe, pip_exe

def ensure_optimized_backend():
    """Ensure app_optimized.py is set as the primary backend"""
    backend_dir = 'backend'
    optimized_path = os.path.join(backend_dir, 'app_optimized.py')
    main_app_path = os.path.join(backend_dir, 'app.py')
    
    if not os.path.exists(optimized_path):
        logger.error(f"❌ Optimized backend not found at {optimized_path}")
        return False
    
    # Backup current app.py if it exists and is different from optimized
    if os.path.exists(main_app_path):
        # Check if current app.py is already the optimized version
        with open(main_app_path, 'r', encoding='utf-8') as f:
            current_content = f.read()
        
        with open(optimized_path, 'r', encoding='utf-8') as f:
            optimized_content = f.read()
        
        if current_content != optimized_content:
            # Backup current version
            backup_path = os.path.join(backend_dir, 'app_backup.py')
            shutil.copy2(main_app_path, backup_path)
            logger.info(f"📦 Backed up current app.py to app_backup.py")
            
            # Copy optimized version to main app.py
            shutil.copy2(optimized_path, main_app_path)
            logger.info(f"🔄 Set app_optimized.py as primary backend")
        else:
            logger.info(f"✅ app.py is already using optimized backend")
    else:
        # Copy optimized version to main app.py
        shutil.copy2(optimized_path, main_app_path)
        logger.info(f"🔄 Set app_optimized.py as primary backend")
    
    return True

def check_dependencies(python_exe, pip_exe):
    """Check if all required dependencies are installed in venv"""
    logger.info("🔍 Checking dependencies in virtual environment...")
    
    try:
        # Check if key packages are installed
        result = subprocess.run([python_exe, '-c', 
            'import fastapi, uvicorn, transformers, torch, pandas, wordcloud; print("All key packages available")'],
            capture_output=True, text=True, cwd='backend')
        
        if result.returncode == 0:
            logger.info("✅ All required dependencies are installed")
            return True
        else:
            logger.warning("⚠️ Some dependencies may be missing")
            logger.info("🔧 Installing dependencies from requirements.txt...")
            
            # Install dependencies
            install_result = subprocess.run([pip_exe, 'install', '-r', 'requirements.txt'],
                                          cwd='backend', capture_output=True, text=True)
            
            if install_result.returncode == 0:
                logger.info("✅ Dependencies installed successfully")
                return True
            else:
                logger.error(f"❌ Failed to install dependencies: {install_result.stderr}")
                return False
                
    except Exception as e:
        logger.error(f"❌ Error checking dependencies: {e}")
        return False

def start_optimized_backend(python_exe):
    """Start the optimized backend using virtual environment"""
    logger.info("🚀 Starting eConsultation AI - Optimized Backend...")
    logger.info("Features:")
    logger.info("  • 300 character limit for comments")
    logger.info("  • 50 character limit for summaries") 
    logger.info("  • AI model caching for faster processing")
    logger.info("  • Async processing for bulk uploads")
    logger.info("  • Optimized database queries")
    logger.info("  • Virtual environment isolation")
    
    logger.info("Server will be available at http://localhost:8000")
    logger.info("API Documentation at http://localhost:8000/docs")
    logger.info("Health Check at http://localhost:8000/health")
    logger.info("Press Ctrl+C to stop")
    
    try:
        # Start the optimized backend
        subprocess.run([python_exe, 'app_optimized.py'], cwd='backend')
    except KeyboardInterrupt:
        logger.info("🛑 Server stopped by user")
    except Exception as e:
        logger.error(f"❌ Error starting server: {e}")

def main():
    """Main function to start optimized backend with venv"""
    print("🚀 eConsultation AI - Optimized Backend Startup")
    print("=" * 60)
    
    # Step 1: Check virtual environment
    venv_ok, python_exe, pip_exe = check_venv()
    if not venv_ok:
        return False
    
    # Step 2: Ensure optimized backend is primary
    if not ensure_optimized_backend():
        return False
    
    # Step 3: Check dependencies
    if not check_dependencies(python_exe, pip_exe):
        return False
    
    # Step 4: Start optimized backend
    start_optimized_backend(python_exe)
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        input("Press Enter to exit...")