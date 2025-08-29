#!/bin/bash
# Deployment script for Doshi Sensei Review Hub

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="doshi-sensei"
NAMESPACE="doshi-sensei"
CLUSTER_NAME="doshi-sensei-cluster"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check for kubectl
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi
    
    # Check for docker
    if ! command -v docker &> /dev/null; then
        print_error "docker is not installed"
        exit 1
    fi
    
    # Check for helm (optional)
    if command -v helm &> /dev/null; then
        print_status "Helm is installed"
    else
        print_warning "Helm is not installed, skipping Helm deployments"
    fi
    
    print_status "Prerequisites check completed"
}

# Function to build Docker images
build_images() {
    print_status "Building Docker images..."
    
    # Build main application
    docker build -t ${PROJECT_NAME}:latest -f deploy/docker/Dockerfile .
    
    # Build WebSocket server
    docker build -t ${PROJECT_NAME}-websocket:latest -f deploy/docker/Dockerfile.websocket .
    
    print_status "Docker images built successfully"
}

# Function to deploy to Kubernetes
deploy_kubernetes() {
    print_status "Deploying to Kubernetes..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply configurations
    print_status "Applying ConfigMaps..."
    kubectl apply -f deploy/kubernetes/configmap.yaml
    
    print_status "Applying Secrets..."
    kubectl apply -f deploy/kubernetes/secrets.yaml
    
    print_status "Deploying PostgreSQL..."
    kubectl apply -f deploy/kubernetes/deployments/postgres-deployment.yaml
    
    print_status "Deploying Redis..."
    kubectl apply -f deploy/kubernetes/deployments/redis-deployment.yaml
    
    # Wait for databases to be ready
    print_status "Waiting for databases to be ready..."
    kubectl wait --for=condition=ready pod -l component=postgres -n ${NAMESPACE} --timeout=300s
    kubectl wait --for=condition=ready pod -l component=redis -n ${NAMESPACE} --timeout=300s
    
    print_status "Deploying WebSocket service..."
    kubectl apply -f deploy/kubernetes/deployments/websocket-deployment.yaml
    
    print_status "Deploying main application..."
    kubectl apply -f deploy/kubernetes/deployments/app-deployment.yaml
    
    print_status "Setting up Ingress..."
    kubectl apply -f deploy/kubernetes/ingress.yaml
    
    print_status "Setting up HPA..."
    kubectl apply -f deploy/kubernetes/hpa.yaml
    
    print_status "Setting up monitoring..."
    kubectl apply -f deploy/kubernetes/monitoring.yaml
    
    print_status "Kubernetes deployment completed"
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Check pod status
    kubectl get pods -n ${NAMESPACE}
    
    # Check services
    kubectl get services -n ${NAMESPACE}
    
    # Check ingress
    kubectl get ingress -n ${NAMESPACE}
    
    # Run health checks
    print_status "Running health checks..."
    
    # Get service endpoint
    APP_URL=$(kubectl get ingress -n ${NAMESPACE} -o jsonpath='{.items[0].spec.rules[0].host}')
    
    if [ ! -z "$APP_URL" ]; then
        print_status "Application URL: https://${APP_URL}"
        
        # Check health endpoint
        if curl -f -s "https://${APP_URL}/api/health" > /dev/null; then
            print_status "Health check passed"
        else
            print_warning "Health check failed or service not ready yet"
        fi
    fi
    
    print_status "Deployment verification completed"
}

# Function to rollback deployment
rollback() {
    print_warning "Rolling back deployment..."
    
    kubectl rollout undo deployment/app-deployment -n ${NAMESPACE}
    kubectl rollout undo deployment/websocket-deployment -n ${NAMESPACE}
    
    print_status "Rollback completed"
}

# Function to show deployment status
show_status() {
    print_status "Deployment Status:"
    echo "=================="
    
    kubectl get deployments -n ${NAMESPACE}
    echo ""
    
    kubectl get pods -n ${NAMESPACE}
    echo ""
    
    kubectl get services -n ${NAMESPACE}
    echo ""
    
    kubectl get ingress -n ${NAMESPACE}
}

# Main deployment flow
main() {
    case "${1:-deploy}" in
        deploy)
            check_prerequisites
            build_images
            deploy_kubernetes
            verify_deployment
            show_status
            ;;
        build)
            check_prerequisites
            build_images
            ;;
        verify)
            verify_deployment
            ;;
        status)
            show_status
            ;;
        rollback)
            rollback
            ;;
        *)
            echo "Usage: $0 {deploy|build|verify|status|rollback}"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"