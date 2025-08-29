#!/bin/bash
# Health check script for Review Hub deployment

set -e

# Configuration
NAMESPACE="${NAMESPACE:-doshi-sensei}"
ENVIRONMENT="${1:-production}"
MAX_RETRIES=30
RETRY_DELAY=10

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check pod health
check_pods() {
    echo "Checking pod health..."
    
    local unhealthy_pods=$(kubectl get pods -n ${NAMESPACE} -o json | \
        jq -r '.items[] | select(.status.phase != "Running") | .metadata.name')
    
    if [ -z "$unhealthy_pods" ]; then
        print_success "All pods are healthy"
        return 0
    else
        print_error "Unhealthy pods found: $unhealthy_pods"
        return 1
    fi
}

# Check service endpoints
check_services() {
    echo "Checking service endpoints..."
    
    local services=("app-service" "websocket-service" "redis-service" "postgres-service")
    
    for service in "${services[@]}"; do
        local endpoints=$(kubectl get endpoints ${service} -n ${NAMESPACE} -o json | \
            jq -r '.subsets[].addresses | length')
        
        if [ "$endpoints" -gt 0 ]; then
            print_success "$service has $endpoints endpoint(s)"
        else
            print_error "$service has no endpoints"
            return 1
        fi
    done
    
    return 0
}

# Check database connectivity
check_database() {
    echo "Checking database connectivity..."
    
    kubectl exec -n ${NAMESPACE} deployment/app-deployment -- \
        sh -c 'pg_isready -h postgres-service -p 5432' &>/dev/null
    
    if [ $? -eq 0 ]; then
        print_success "Database is accessible"
        return 0
    else
        print_error "Database is not accessible"
        return 1
    fi
}

# Check Redis connectivity
check_redis() {
    echo "Checking Redis connectivity..."
    
    kubectl exec -n ${NAMESPACE} deployment/app-deployment -- \
        sh -c 'redis-cli -h redis-service ping' &>/dev/null
    
    if [ $? -eq 0 ]; then
        print_success "Redis is accessible"
        return 0
    else
        print_error "Redis is not accessible"
        return 1
    fi
}

# Check API health endpoint
check_api_health() {
    echo "Checking API health endpoint..."
    
    local pod=$(kubectl get pod -n ${NAMESPACE} -l component=app -o jsonpath='{.items[0].metadata.name}')
    
    kubectl exec -n ${NAMESPACE} ${pod} -- \
        curl -f -s http://localhost:3000/api/health &>/dev/null
    
    if [ $? -eq 0 ]; then
        print_success "API health check passed"
        return 0
    else
        print_error "API health check failed"
        return 1
    fi
}

# Check WebSocket health
check_websocket() {
    echo "Checking WebSocket health..."
    
    local pod=$(kubectl get pod -n ${NAMESPACE} -l component=websocket -o jsonpath='{.items[0].metadata.name}')
    
    kubectl exec -n ${NAMESPACE} ${pod} -- \
        curl -f -s http://localhost:8080/health &>/dev/null
    
    if [ $? -eq 0 ]; then
        print_success "WebSocket health check passed"
        return 0
    else
        print_error "WebSocket health check failed"
        return 1
    fi
}

# Check metrics endpoint
check_metrics() {
    echo "Checking metrics endpoint..."
    
    local pod=$(kubectl get pod -n ${NAMESPACE} -l component=app -o jsonpath='{.items[0].metadata.name}')
    
    kubectl exec -n ${NAMESPACE} ${pod} -- \
        curl -f -s http://localhost:3000/api/metrics &>/dev/null
    
    if [ $? -eq 0 ]; then
        print_success "Metrics endpoint is accessible"
        return 0
    else
        print_warning "Metrics endpoint is not accessible"
        return 0  # Non-critical
    fi
}

# Main health check
main() {
    echo "======================================"
    echo "Review Hub Health Check - ${ENVIRONMENT}"
    echo "======================================"
    echo ""
    
    local all_healthy=true
    
    # Run all checks
    check_pods || all_healthy=false
    check_services || all_healthy=false
    check_database || all_healthy=false
    check_redis || all_healthy=false
    check_api_health || all_healthy=false
    check_websocket || all_healthy=false
    check_metrics || true  # Non-critical
    
    echo ""
    echo "======================================"
    
    if [ "$all_healthy" = true ]; then
        print_success "All health checks passed!"
        exit 0
    else
        print_error "Some health checks failed"
        exit 1
    fi
}

# Run with retries
attempt=0
while [ $attempt -lt $MAX_RETRIES ]; do
    attempt=$((attempt + 1))
    echo "Health check attempt $attempt of $MAX_RETRIES"
    
    if main; then
        exit 0
    fi
    
    if [ $attempt -lt $MAX_RETRIES ]; then
        echo "Retrying in ${RETRY_DELAY} seconds..."
        sleep ${RETRY_DELAY}
    fi
done

print_error "Health checks failed after $MAX_RETRIES attempts"
exit 1