#!/bin/bash

# Monitoring and health check script for SyncHire
# Usage: ./monitor.sh [health|logs|metrics]

function check_health() {
    local namespace=${1:-production}

    echo "Checking health of SyncHire deployment in $namespace..."

    # Check if pods are running
    echo "=== Pod Status ==="
    kubectl get pods -n $namespace -l app=backend
    kubectl get pods -n $namespace -l app=frontend

    # Check pod resource usage
    echo "=== Resource Usage ==="
    kubectl top pods -n $namespace

    # Check services
    echo "=== Service Status ==="
    kubectl get services -n $namespace

    # Check HPA status
    echo "=== HPA Status ==="
    kubectl get hpa -n $namespace

    # Run health checks
    echo "=== Application Health ==="
    FRONTEND_URL=$(kubectl get ingress -n $namespace -o jsonpath='{.items[0].spec.rules[0].host}')
    BACKEND_URL="api.${FRONTEND_URL}"

    echo "Frontend health: https://$FRONTEND_URL/api/health"
    echo "Backend health: https://$BACKEND_URL/api/health"

    curl -f "https://$FRONTEND_URL/api/health" || echo "Frontend health check failed"
    curl -f "https://$BACKEND_URL/api/health" || echo "Backend health check failed"
}

function get_logs() {
    local namespace=${1:-production}
    local component=${2:-backend}
    local lines=${3:-100}

    echo "Getting logs for $component in $namespace (last $lines lines)..."

    kubectl logs -n $namespace -l app=$component --tail=$lines --follow=true
}

function get_metrics() {
    local namespace=${1:-production}

    echo "Getting metrics from Prometheus..."

    # Access Prometheus API (requires port-forward)
    kubectl port-forward -n monitoring svc/prometheus 9090:9090 &

    sleep 2

    # Query key metrics
    echo "=== Request Rate ==="
    curl -s 'http://localhost:9090/api/v1/query?query=rate(http_requests_total[5m])' | jq .

    echo "=== Error Rate ==="
    curl -s 'http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])' | jq .

    echo "=== Response Time ==="
    curl -s 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95, http_request_duration_seconds_bucket)' | jq .

    # Cleanup port-forward
    pkill -f "port-forward.*prometheus"
}

function setup_monitoring() {
    echo "Setting up monitoring stack..."

    # Create monitoring namespace
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

    # Apply Prometheus configuration
    kubectl apply -f deploy/monitoring/prometheus-config.yaml

    # Apply Grafana dashboards
    kubectl apply -f deploy/monitoring/grafana-dashboards.yaml

    # Apply alert rules
    kubectl apply -f deploy/monitoring/alerts.yaml

    echo "Monitoring setup completed"
}

case "$1" in
    health)
        check_health "$2"
        ;;
    logs)
        get_logs "$2" "$3" "$4"
        ;;
    metrics)
        get_metrics "$2"
        ;;
    setup)
        setup_monitoring
        ;;
    *)
        echo "Usage: $0 {health|logs|metrics|setup}"
        echo "Examples:"
        echo "  $0 health production"
        echo "  $0 logs production backend 1000"
        echo "  $0 metrics production"
        echo "  $0 setup"
        exit 1
        ;;
esac
