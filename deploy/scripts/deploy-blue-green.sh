#!/bin/bash
set -e

# Blue-Green Deployment Script for SyncHire
# Usage: ./deploy-blue-green.sh [staging|production]

function log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

function error_exit() {
    log "ERROR: $1"
    exit 1
}

function get_current_color() {
    local namespace=$1
    local service=$2

    # Get the current color by checking which service is active
    local current=$(kubectl get service $service -n $namespace -o jsonpath='{.spec.selector.color}')
    if [ -z "$current" ]; then
        error_exit "Could not determine current color for service $service"
    fi
    echo "$current"
}

function switch_traffic() {
    local namespace=$1
    local service=$2
    local new_color=$3

    log "Switching traffic to $new_color..."
    kubectl patch service $service -n $namespace -p '{"spec":{"selector":{"color":"'"$new_color"'"}}}'
    log "Traffic switched to $new_color"
}

function wait_for_pods_ready() {
    local namespace=$1
    local color=$2
    local app=$3

    log "Waiting for $color pods to be ready..."
    kubectl wait --for=condition=ready pod -l app=$app,color=$color -n $namespace --timeout=5m
    log "$color pods are ready"
}

function run_smoke_tests() {
    local namespace=$1
    local url=$2

    log "Running smoke tests against $url..."

    # Test health endpoint
    if ! curl -f "$url/api/health" > /dev/null 2>&1; then
        error_exit "Health check failed for $url"
    fi

    # Test API endpoint
    if ! curl -f "$url/api/jobs?page=1&limit=1" > /dev/null 2>&1; then
        error_exit "API check failed for $url"
    fi

    log "Smoke tests passed"
}

function deploy_blue_green() {
    local environment=$1
    local namespace=$environment
    local app="backend"
    local service="${app}-service"

    log "Starting blue-green deployment to $environment..."

    # Get current color
    local current_color=$(get_current_color $namespace $service)
    local new_color="blue"
    if [ "$current_color" == "blue" ]; then
        new_color="green"
    fi

    log "Current color: $current_color, New color: $new_color"

    # Build and tag new images
    log "Building new Docker images..."
    ./build.sh docker

    # Update deployment with new color
    log "Deploying $new_color environment..."
    envsubst < deploy/k8s/templates/deployment.yaml | kubectl apply -f -

    # Wait for new pods to be ready
    wait_for_pods_ready $namespace $new_color $app

    # Run smoke tests on new deployment
    local test_url="https://"
    if [ "$environment" == "staging" ]; then
        test_url+="staging."
    fi
    test_url+="synchire.com"

    # Temporarily access new deployment directly
    # (In real scenario, you'd access via pod IP or temporary service)
    run_smoke_tests $namespace $test_url

    # Switch traffic
    switch_traffic $namespace $service $new_color

    # Wait and monitor
    log "Monitoring new deployment for 60 seconds..."
    sleep 60

    # Verify deployment is healthy
    if ! kubectl get pods -n $namespace -l app=$app,color=$new_color | grep -q "Running"; then
        log "ERROR: New deployment not healthy, rolling back..."
        switch_traffic $namespace $service $current_color
        error_exit "Deployment failed, traffic switched back to $current_color"
    fi

    # Clean up old deployment
    log "Cleaning up old $current_color deployment..."
    kubectl delete deployment -n $namespace -l app=$app,color=$current_color

    log "Blue-green deployment completed successfully!"
}

function main() {
    local environment=$1

    if [ -z "$environment" ]; then
        error_exit "Usage: $0 [staging|production]"
    fi

    if [ "$environment" != "staging" ] && [ "$environment" != "production" ]; then
        error_exit "Invalid environment. Use 'staging' or 'production'"
    fi

    # Check prerequisites
    if ! command -v kubectl &> /dev/null; then
        error_exit "kubectl is not installed"
    fi

    if ! kubectl cluster-info &> /dev/null; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi

    # Execute deployment
    deploy_blue_green "$environment"
}

main "$@"
