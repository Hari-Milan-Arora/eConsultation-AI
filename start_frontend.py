#!/usr/bin/env python3
"""
Frontend Start Script
Starts the React frontend development server
"""

import os
import sys
import subprocess
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_node_installation():
    """Check if Node.js and npm are installed"""
    try:
        # Check Node.js
        node_result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if node_result.returncode == 0:
            logger.info(f"✅ Node.js version: {node_result.stdout.strip()}")
        else:
            return False
        
        # Check npm
        npm_result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
        if npm_result.returncode == 0:
            logger.info(f"✅ npm version: {npm_result.stdout.strip()}")
            return True
        else:
            return False
            
    except FileNotFoundError:
        return False
    except Exception as e:
        logger.error(f"Error checking Node.js installation: {e}")
        return False

def install_node_instructions():
    """Provide instructions for installing Node.js"""
    logger.error("❌ Node.js is not installed or not found in PATH")
    logger.info("")
    logger.info("📋 To fix this issue:")
    logger.info("1. Download Node.js from: https://nodejs.org/")
    logger.info("2. Install the LTS version (recommended)")
    logger.info("3. Restart your terminal/command prompt")
    logger.info("4. Run this script again")
    logger.info("")
    logger.info("Alternative: Use the built React app")
    logger.info("1. Run: cd frontend")
    logger.info("2. If you have a 'build' folder, run: npx serve -s build")
    logger.info("3. Or use the Docker version: docker-compose up")

def start_frontend():
    """Start the frontend development server"""
    logger.info("🚀 Starting eConsultation AI Frontend...")
    
    # Check if Node.js is installed
    if not check_node_installation():
        install_node_instructions()
        return
    
    # Change to frontend directory
    os.chdir('frontend')
    
    # Check if node_modules exists
    if not os.path.exists('node_modules'):
        logger.info("Installing Node.js dependencies...")
        try:
            result = subprocess.run(['npm', 'install'], check=True)
            logger.info("✅ Dependencies installed successfully")
        except subprocess.CalledProcessError:
            logger.error("❌ Failed to install dependencies")
            logger.info("Try running manually: cd frontend && npm install")
            return
        except Exception as e:
            logger.error(f"❌ Error installing dependencies: {e}")
            return
    
    # Check if build folder exists (for production)
    if os.path.exists('build'):
        logger.info("Found production build folder")
        logger.info("You can also serve the built app with: npx serve -s build")
    
    # Start the development server
    logger.info("Starting React development server on http://localhost:3000")
    logger.info("The application will open in your browser automatically")
    logger.info("Press Ctrl+C to stop the server")
    
    try:
        # Use Windows-compatible script on Windows
        if os.name == 'nt':
            subprocess.run(['npm', 'run', 'start-windows'], check=True)
        else:
            subprocess.run(['npm', 'start'], check=True)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ npm start failed with exit code {e.returncode}")
        logger.info("Try running manually: cd frontend && npm start")
    except FileNotFoundError:
        logger.error("❌ npm command not found")
        install_node_instructions()
    except Exception as e:
        logger.error(f"❌ Error starting server: {e}")
        logger.info("Try running manually: cd frontend && npm start")

if __name__ == "__main__":
    start_frontend()