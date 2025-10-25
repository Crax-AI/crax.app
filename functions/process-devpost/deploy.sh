#!/bin/bash

# Deploy script for process-devpost function to Google Cloud Run
# This script builds and deploys a FastAPI application with Selenium/Chrome

set -e

# Configuration variables
PROJECT_ID="crax-475518"  # Replace with your actual GCP project ID
SERVICE_NAME="process-devpost"
REGION="us-west1"  # Change to your preferred region
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
SERVICE_ACCOUNT="197510925717-compute@developer.gserviceaccount.com"  # Optional: replace with your service account

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it from https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    print_status "All dependencies are installed."
}

# Authenticate with Google Cloud
authenticate() {
    print_status "Authenticating with Google Cloud..."
    
    # Check if already authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_status "Please authenticate with Google Cloud..."
        gcloud auth login
    fi
    
    # Set the project
    gcloud config set project ${PROJECT_ID}
    
    # Enable required APIs
    print_status "Enabling required APIs..."
    gcloud services enable cloudbuild.googleapis.com
    gcloud services enable run.googleapis.com
    gcloud services enable containerregistry.googleapis.com
    
    print_status "Authentication complete."
}

# Build and push Docker image
build_and_push() {
    print_status "Building Docker image..."
    
    # Build the image for linux/amd64 platform
    docker build --platform linux/amd64 -t ${IMAGE_NAME} .
    
    print_status "Configuring Docker to use gcloud as a credential helper..."
    gcloud auth configure-docker
    
    print_status "Pushing image to Google Container Registry..."
    docker push ${IMAGE_NAME}
    
    print_status "Image built and pushed successfully."
}

# Deploy to Cloud Run
deploy_to_cloud_run() {
    print_status "Deploying to Cloud Run..."
    
    # Prepare deployment command
    DEPLOY_CMD="gcloud run deploy ${SERVICE_NAME} \
        --image ${IMAGE_NAME} \
        --platform managed \
        --region ${REGION} \
        --allow-unauthenticated \
        --memory 1Gi \
        --cpu 1 \
        --timeout 300 \
        --max-instances 10 \
        --min-instances 0 \
        --port 8080"
    
    # Add service account if provided
    if [ ! -z "${SERVICE_ACCOUNT}" ] && [ "${SERVICE_ACCOUNT}" != "your-service-account@your-project.iam.gserviceaccount.com" ]; then
        DEPLOY_CMD="${DEPLOY_CMD} --service-account ${SERVICE_ACCOUNT}"
    fi
    
    # Execute deployment
    eval ${DEPLOY_CMD}
    
    print_status "Deployment complete!"
}

# Get service URL
get_service_url() {
    print_status "Getting service URL..."
    SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format="value(status.url)")
    print_status "Service URL: ${SERVICE_URL}"
    print_status "Health check: ${SERVICE_URL}/health"
    print_status "API endpoint: ${SERVICE_URL}/process-devpost"
}

# Test the deployment
test_deployment() {
    print_status "Testing deployment..."
    
    if [ ! -z "${SERVICE_URL}" ]; then
        # Test health endpoint
        print_status "Testing health endpoint..."
        if curl -f -s "${SERVICE_URL}/health" > /dev/null; then
            print_status "Health check passed!"
        else
            print_warning "Health check failed. Service might still be starting up."
        fi
        
        # Test API endpoint with sample data
        print_status "Testing API endpoint with sample Devpost URL..."
        SAMPLE_URL="https://devpost.com/software"
        curl -X POST "${SERVICE_URL}/process-devpost" \
            -H "Content-Type: application/json" \
            -d "{\"devpost_url\": \"${SAMPLE_URL}\"}" \
            --max-time 60 || print_warning "API test failed - this might be expected if the sample URL is invalid"
    fi
}

# Cleanup function
cleanup() {
    print_status "Cleaning up local Docker image..."
    docker rmi ${IMAGE_NAME} || true
}

# Main execution
main() {
    print_status "Starting deployment process for ${SERVICE_NAME}..."
    
    # Validate configuration
    if [ "${PROJECT_ID}" = "your-gcp-project-id" ]; then
        print_error "Please update PROJECT_ID in the script with your actual GCP project ID"
        exit 1
    fi
    
    check_dependencies
    authenticate
    build_and_push
    deploy_to_cloud_run
    get_service_url
    test_deployment
    cleanup
    
    print_status "Deployment completed successfully!"
    print_status "Your service is now running at: ${SERVICE_URL}"
}

# Run main function
main "$@"
