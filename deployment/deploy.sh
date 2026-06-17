#!/bin/bash

# eConsultation AI Deployment Script
# This script automates the deployment process

set -e  # Exit on any error

echo "🚀 Starting eConsultation AI Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if required files exist
check_files() {
    required_files=(
        "docker-compose.yml"
        "backend/Dockerfile"
        "frontend/Dockerfile"
        "backend/requirements.txt"
        "frontend/package.json"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Required file $file not found"
            exit 1
        fi
    done
    
    print_success "All required files found"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p backend/logs
    mkdir -p backend/wordclouds
    mkdir -p backend/models
    mkdir -p deployment/ssl
    
    print_success "Directories created"
}

# Set up environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f ".env" ]; then
        print_status "Creating .env file..."
        cat > .env << EOF
# Database Configuration
DB_PASSWORD=secure_password_$(date +%s)
POSTGRES_DB=econsultation
POSTGRES_USER=admin

# Backend Configuration
ENVIRONMENT=production
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000,http://localhost

# Frontend Configuration
REACT_APP_API_URL=http://localhost:8000

# Security
SECRET_KEY=$(openssl rand -hex 32)
EOF
        print_success ".env file created"
    else
        print_warning ".env file already exists, skipping creation"
    fi
}

# Build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Pull latest images
    docker-compose pull
    
    # Build services
    print_status "Building Docker images..."
    docker-compose build --no-cache
    
    # Start services
    print_status "Starting services..."
    docker-compose up -d
    
    print_success "Services started"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be healthy..."
    
    # Wait for database
    print_status "Waiting for database..."
    timeout 60 bash -c 'until docker-compose exec -T db pg_isready -U admin -d econsultation; do sleep 2; done'
    
    # Wait for backend
    print_status "Waiting for backend..."
    timeout 120 bash -c 'until curl -f http://localhost:8000/health; do sleep 5; done'
    
    # Wait for frontend
    print_status "Waiting for frontend..."
    timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 5; done'
    
    print_success "All services are healthy"
}

# Run tests
run_tests() {
    print_status "Running health checks..."
    
    # Test backend API
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    # Test frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
        return 1
    fi
    
    # Test database connection
    if docker-compose exec -T backend python -c "
import psycopg2
import os
try:
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    conn.close()
    print('Database connection successful')
except Exception as e:
    print(f'Database connection failed: {e}')
    exit(1)
"; then
        print_success "Database connection test passed"
    else
        print_error "Database connection test failed"
        return 1
    fi
}

# Show deployment information
show_info() {
    print_success "🎉 Deployment completed successfully!"
    echo
    echo "📊 Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:8000"
    echo "  API Documentation: http://localhost:8000/docs"
    echo "  Database: localhost:5432"
    echo
    echo "🔧 Management Commands:"
    echo "  View logs: docker-compose logs -f"
    echo "  Stop services: docker-compose down"
    echo "  Restart services: docker-compose restart"
    echo "  Update services: docker-compose pull && docker-compose up -d"
    echo
    echo "📈 Monitoring:"
    echo "  Health check: curl http://localhost:8000/health"
    echo "  System stats: docker stats"
    echo
}

# Cleanup function
cleanup() {
    if [ $? -ne 0 ]; then
        print_error "Deployment failed. Cleaning up..."
        docker-compose down
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main deployment process
main() {
    print_status "Starting eConsultation AI deployment process..."
    
    check_docker
    check_files
    create_directories
    setup_environment
    deploy_services
    wait_for_services
    
    if run_tests; then
        show_info
    else
        print_error "Health checks failed. Please check the logs."
        docker-compose logs
        exit 1
    fi
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "stop")
        print_status "Stopping services..."
        docker-compose down
        print_success "Services stopped"
        ;;
    "restart")
        print_status "Restarting services..."
        docker-compose restart
        print_success "Services restarted"
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "status")
        docker-compose ps
        ;;
    "clean")
        print_status "Cleaning up..."
        docker-compose down -v
        docker system prune -f
        print_success "Cleanup completed"
        ;;
    *)
        echo "Usage: $0 {deploy|stop|restart|logs|status|clean}"
        echo
        echo "Commands:"
        echo "  deploy  - Deploy the application (default)"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        echo "  logs    - Show service logs"
        echo "  status  - Show service status"
        echo "  clean   - Stop services and clean up"
        exit 1
        ;;
esac