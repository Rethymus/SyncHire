#!/bin/bash
set -e

# Kubernetes deployment script for SyncHire
# Usage: ./deploy.sh [staging|production]

function deploy_staging() {
    echo "Deploying to staging..."

    # Build and push Docker images
    ./build.sh docker
    # docker push synchire/frontend:staging-latest
    # docker push synchire/backend:staging-latest

    # Apply Kubernetes manifests
    kubectl apply -k k8s/overlays/staging

    # Wait for deployment to complete
    kubectl rollout status deployment/staging-backend -n staging --timeout=5m
    kubectl rollout status deployment/staging-frontend -n staging --timeout=5m

    echo "Staging deployment completed successfully"
}

function deploy_production() {
    echo "Deploying to production..."

    # Build and push Docker images
    ./build.sh docker
    # docker push synchire/frontend:production-latest
    # docker push synchire/backend:production-latest

    # Apply Kubernetes manifests
    kubectl apply -k k8s/overlays/production

    # Wait for deployment to complete
    kubectl rollout status deployment/prod-backend -n production --timeout=10m
    kubectl rollout status deployment/prod-frontend -n production --timeout=10m

    echo "Production deployment completed successfully"
}

function rollback_deployment() {
    local namespace=$1
    local deployment=$2

    echo "Rolling back $deployment in $namespace..."

    kubectl rollout undo deployment/$deployment -n $namespace

    echo "Rollback completed successfully"
}

function check_deployment_health() {
    local namespace=$1

    echo "Checking deployment health in $namespace..."

    # Check pod status
    kubectl get pods -n $namespace

    # Check services
    kubectl get services -n $namespace

    # Check ingress
    kubectl get ingress -n $namespace

    # Check HPA
    kubectl get hpa -n $namespace
}

case "$1" in
    staging)
        deploy_staging
        ;;
    production)
        deploy_production
        ;;
    rollback)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 rollback <namespace> <deployment>"
            exit 1
        fi
        rollback_deployment "$2" "$3"
        ;;
    health)
        if [ -z "$2" ]; then
            echo "Usage: $0 health <namespace>"
            exit 1
        fi
        check_deployment_health "$2"
        ;;
    *)
        echo "Usage: $0 {staging|production|rollback|health}"
        exit 1
        ;;
esac
