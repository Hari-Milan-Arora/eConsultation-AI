@echo off
REM eConsultation AI Deployment Script for Windows
REM This script automates the deployment process

setlocal enabledelayedexpansion

echo 🚀 Starting eConsultation AI Deployment...

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

echo [SUCCESS] Docker and Docker Compose are installed

REM Check if required files exist
if not exist "docker-compose.yml" (
    echo [ERROR] docker-compose.yml not found
    pause
    exit /b 1
)

if not exist "backend\Dockerfile" (
    echo [ERROR] backend\Dockerfile not found
    pause
    exit /b 1
)

if not exist "frontend\Dockerfile" (
    echo [ERROR] frontend\Dockerfile not found
    pause
    exit /b 1
)

echo [SUCCESS] All required files found

REM Create necessary directories
echo [INFO] Creating necessary directories...
if not exist "backend\logs" mkdir backend\logs
if not exist "backend\wordclouds" mkdir backend\wordclouds
if not exist "backend\models" mkdir backend\models
if not exist "deployment\ssl" mkdir deployment\ssl

echo [SUCCESS] Directories created

REM Set up environment variables
if not exist ".env" (
    echo [INFO] Creating .env file...
    (
        echo # Database Configuration
        echo DB_PASSWORD=secure_password_%random%
        echo POSTGRES_DB=econsultation
        echo POSTGRES_USER=admin
        echo.
        echo # Backend Configuration
        echo ENVIRONMENT=production
        echo LOG_LEVEL=INFO
        echo CORS_ORIGINS=http://localhost:3000,http://localhost
        echo.
        echo # Frontend Configuration
        echo REACT_APP_API_URL=http://localhost:8000
        echo.
        echo # Security
        echo SECRET_KEY=secret_key_%random%_%random%
    ) > .env
    echo [SUCCESS] .env file created
) else (
    echo [WARNING] .env file already exists, skipping creation
)

REM Build and start services
echo [INFO] Building and starting services...

echo [INFO] Pulling latest images...
docker-compose pull

echo [INFO] Building Docker images...
docker-compose build --no-cache

echo [INFO] Starting services...
docker-compose up -d

echo [SUCCESS] Services started

REM Wait for services to be healthy
echo [INFO] Waiting for services to be healthy...

echo [INFO] Waiting for database...
timeout /t 30 /nobreak >nul

echo [INFO] Waiting for backend...
:wait_backend
timeout /t 5 /nobreak >nul
curl -f http://localhost:8000/health >nul 2>&1
if errorlevel 1 goto wait_backend

echo [INFO] Waiting for frontend...
:wait_frontend
timeout /t 3 /nobreak >nul
curl -f http://localhost:3000 >nul 2>&1
if errorlevel 1 goto wait_frontend

echo [SUCCESS] All services are healthy

REM Run health checks
echo [INFO] Running health checks...

curl -f http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Backend health check failed
    goto cleanup
)
echo [SUCCESS] Backend health check passed

curl -f http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Frontend health check failed
    goto cleanup
)
echo [SUCCESS] Frontend health check passed

REM Show deployment information
echo.
echo [SUCCESS] 🎉 Deployment completed successfully!
echo.
echo 📊 Service URLs:
echo   Frontend: http://localhost:3000
echo   Backend API: http://localhost:8000
echo   API Documentation: http://localhost:8000/docs
echo   Database: localhost:5432
echo.
echo 🔧 Management Commands:
echo   View logs: docker-compose logs -f
echo   Stop services: docker-compose down
echo   Restart services: docker-compose restart
echo   Update services: docker-compose pull ^&^& docker-compose up -d
echo.
echo 📈 Monitoring:
echo   Health check: curl http://localhost:8000/health
echo   System stats: docker stats
echo.

goto end

:cleanup
echo [ERROR] Deployment failed. Cleaning up...
docker-compose down
pause
exit /b 1

:end
echo Press any key to exit...
pause >nul