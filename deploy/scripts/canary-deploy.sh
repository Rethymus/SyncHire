#!/bin/bash
set -e

# Canary Deployment Script for SyncHire
# Usage: ./canary-deploy.sh [staging|production] [percentage]

function log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

function error_exit() {
    log "ERROR: $1"
    exit 1
}

function update_canary_weight() {
    local namespace=$1
    local weight=$2

    log "Updating canary weight to $weight%..."
    # Update Istio VirtualService or similar
    kubectl patch virtualservice synchire -n $namespace -p '{"spec":{"http":[{"route":[{"destination":{"host":"backend-service","subset":"canary"},"weight":' "$weight"'},{"destination":{"host":"backend-service","subset":"stable"},"weight":' $((100 - weight))'"}]}]}}'
}

function monitor_canary() {
    local namespace=$1
    local duration=$2

    log "Monitoring canary deployment for ${duration}s..."

    local end_time=$(($(date +%s) + duration))
    while [ $(date +%s) -lt $end_time ]; do
        # Check error rates
        local errors=$(kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1/namespaces/$namespace/pods/*/http_errors | jq '.items[0].value' || echo "0")

        if [ "$errors" -gt 5 ]; then
            log "High error rate detected: $errors%"
            return 1
        fi

        # Check response times
        local latency=$(kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1/namespaces/$namespace/pods/*/http_request_duration_seconds | jq '.items[0].value' || echo "0")

        if [ "$latency" -gt 1000 ]; then
            log "High latency detected: ${latency}ms"
            return 1
        fi

        sleep 10
    done

    log "Canary monitoring passed"
    return 0
}

function rollback_canary() {
    local namespace=$1

    log "Rolling back canary deployment..."
    update_canary_weight $namespace 0

    # Delete canary deployment
    kubectl delete deployment backend-canary -n $namespace --ignore-not-found=true

    log "Canary rolled back"
}

function deploy_canary() {
    local environment=$1
    local percentage=${2:-10}
    local namespace=$environment

    log "Starting canary deployment to $environment with $percentage% traffic..."

    # Deploy canary version
    log "Deploying canary pods..."
    kubectl apply -f deploy/k8s/canary/deployment.yaml

    # Wait for canary pods to be ready
    kubectl wait --for=condition=ready pod -l app=backend,version=canary -n $namespace --timeout=5m

    # Gradual rollout
    local steps=(10 25 50 75 100)
    for step in "${steps[@]}"; do
        if [ "$step" -gt "$percentage" ]; then
            break
        fi

        log "Increasing canary traffic to $step%..."
        update_canary_weight $namespace $step

        # Monitor for 5 minutes at each step
        if ! monitor_canary $namespace 300; then
            rollback_canary $namespace
            error_exit "Canary deployment failed at $step% traffic"
        fi
    done

    # Promote canary to stable
    if [ "$percentage" -eq 100 ]; then
        log "Promoting canary to stable..."
        kubectl apply -f deploy/k8s/stable/deployment.yaml
        update_canary_weight $namespace 0
        kubectl delete deployment backend-canary -n $namespace
    fi

    log "Canary deployment completed successfully!"
}

function main() {
    local environment=$1
    local percentage=${2:-10}

    if [ -z "$environment" ]; then
        error_exit "Usage: $0 [staging|production] [percentage]"
    fi

    if [ "$environment" != "staging" ] && [ "$environment" != "production" ]; then
        error_exit "Invalid environment. Use 'staging' or 'production'"
    fi

    if ! command -v kubectl &> /dev/null; then
        error_exit "kubectl is not installed"
    fi

    if ! kubectl cluster-info &> /dev/null; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi

    deploy_canary "$environment" "$percentage"
}

main "$@"
