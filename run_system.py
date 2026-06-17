#!/usr/bin/env python3
"""
Complete System Runner for eConsultation AI
Handles all scenarios and provides multiple options
"""

import logging
import os
import subprocess
import sys
import threading
import time
import webbrowser

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def check_nodejs():
    """Check if Node.js is installed."""
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False


def check_python():
    """Check Python installation."""
    logger.info("Python %s.%s.%s", sys.version_info.major, sys.version_info.minor, sys.version_info.micro)
    return True


def start_backend_service():
    """Start backend service."""
    logger.info("Starting backend service...")
    try:
        os.chdir("backend")
        python_cmd = get_python_command()

        if not os.path.exists("models/simple_sentiment_model.pkl"):
            logger.info("Creating AI models...")
            subprocess.run([python_cmd, "instant_train.py"])

        logger.info("Backend starting on http://localhost:8000")
        subprocess.run([python_cmd, "app.py"])
    except Exception as e:
        logger.error("Backend failed: %s", e)
    finally:
        os.chdir("..")


def start_frontend_service():
    """Start frontend service."""
    logger.info("Starting frontend service...")

    if check_nodejs():
        try:
            os.chdir("frontend")
            if not os.path.exists("node_modules"):
                logger.info("Installing dependencies...")
                subprocess.run(["npm", "install"], check=True)

            logger.info("Frontend starting on http://localhost:3000")
            subprocess.run(["npm", "start"])
        except Exception as e:
            logger.error("React app failed: %s", e)
            logger.info("Falling back to simple interface...")
            start_simple_frontend()
        finally:
            os.chdir("..")
    else:
        start_simple_frontend()


def start_simple_frontend():
    """Start simple HTML frontend."""
    logger.info("Starting simple frontend...")
    try:
        subprocess.run([sys.executable, "start_frontend_simple.py"])
    except Exception as e:
        logger.error("Simple frontend failed: %s", e)


def get_python_command():
    """Get the appropriate Python command."""
    if os.name == "nt":
        if os.path.exists("venv\\Scripts\\python.exe"):
            return "venv\\Scripts\\python"
        return "python"

    if os.path.exists("venv/bin/python"):
        return "venv/bin/python"
    return "python3"


def open_browser():
    """Open browser after delay."""
    time.sleep(5)
    try:
        webbrowser.open("http://localhost:3000")
        webbrowser.open("http://localhost:8000/docs")
    except Exception:
        pass


def show_menu():
    """Show interactive menu."""
    print("\n" + "=" * 60)
    print("eConsultation AI - System Runner")
    print("=" * 60)
    print("1. Start Complete System (Backend + Frontend)")
    print("2. Start Backend Only")
    print("3. Start Frontend Only (React)")
    print("4. Start Simple Frontend (HTML)")
    print("5. Test System")
    print("6. System Information")
    print("7. Exit")
    print("=" * 60)


def show_system_info():
    """Show system information."""
    logger.info("System Information:")
    logger.info("   Python: %s", sys.version)
    logger.info("   Node.js: %s", "Installed" if check_nodejs() else "Not found")
    logger.info(
        "   Backend Models: %s",
        "Ready" if os.path.exists("backend/models/simple_sentiment_model.pkl") else "Missing",
    )
    logger.info("   Frontend Build: %s", "Ready" if os.path.exists("frontend/build") else "Missing")
    logger.info("   Database: %s", "Ready" if os.path.exists("backend/eConsultation.db") else "Missing")


def main():
    """Main interactive function."""
    while True:
        show_menu()

        try:
            choice = input("\nEnter your choice (1-7): ").strip()

            if choice == "1":
                logger.info("Starting complete system...")
                backend_thread = threading.Thread(target=start_backend_service, daemon=True)
                backend_thread.start()

                time.sleep(3)

                browser_thread = threading.Thread(target=open_browser, daemon=True)
                browser_thread.start()

                start_frontend_service()

            elif choice == "2":
                start_backend_service()

            elif choice == "3":
                start_frontend_service()

            elif choice == "4":
                start_simple_frontend()

            elif choice == "5":
                logger.info("Testing system...")
                try:
                    subprocess.run([sys.executable, "test_system.py"])
                except Exception as e:
                    logger.error("Test failed: %s", e)

            elif choice == "6":
                show_system_info()

            elif choice == "7":
                logger.info("Goodbye!")
                break

            else:
                logger.warning("Invalid choice. Please enter 1-7.")

        except KeyboardInterrupt:
            logger.info("Goodbye!")
            break
        except Exception as e:
            logger.error("Error: %s", e)


if __name__ == "__main__":
    main()
