# SyncHire Deployment Automation

This directory contains comprehensive deployment automation for the SyncHire platform.

## Directory Structure

```
deploy/
├── docker/              # Docker configuration files
│   ├── frontend.Dockerfile
│   ├── backend.Dockerfile
│   ├── mcp-server.Dockerfile
│   ├── docker-compose.prod.yml
│   ├── docker-compose.swarm.yml
│   └── nginx.conf
├── k8s/                # Kubernetes manifests
│   ├── base/           # Base manifests
│   └── overlays/       # Environment-specific overlays
├── scripts/           # Deployment scripts
│   ├── build.sh
│   ├── deploy.sh
│   └── monitor.sh
└── monitoring/        # Monitoring configuration
    ├── prometheus-config.yaml
    ├── grafana-dashboards.yaml
    └── alerts.yaml
```

## Quick Start

### Local Docker Deployment

```bash
# Build and start all services
docker-compose -f deploy/docker/docker-compose.prod.yml up -d

# View logs
docker-compose -f deploy/docker/docker-compose.prod.yml logs -f

# Stop services
docker-compose -f deploy/docker/docker-compose.prod.yml down
```

### Kubernetes Deployment

```bash
# Deploy to staging
./deploy/scripts/deploy.sh staging

# Deploy to production
./deploy/scripts/deploy.sh production

# Check deployment health
./deploy/scripts/monitor.sh health production
```

## Docker Images

### Frontend (Next.js 16)
- **Base Image**: node:22-alpine
- **Multi-stage build** for optimization
- **Health checks** included
- **Non-root user** for security

### Backend (FastAPI)
- **Base Image**: python:3.11-slim
- **Optimized dependencies** installation
- **Gunicorn** for production serving
- **Health checks** included

### MCP Servers
- **Base Image**: python:3.11-slim
- **Combined build** for efficiency
- **Health checks** for each server

## Kubernetes Deployment

### Base Resources
- ConfigMaps for configuration
- Secrets for sensitive data
- Deployments for all services
- Services for networking
- HPAs for auto-scaling

### Environments
- **Staging**: 2 replicas, lower resources
- **Production**: 5 replicas, higher resources

### Deployment Process

1. **Build Phase**: Create Docker images
2. **Push Phase**: Push to registry
3. **Deploy Phase**: Apply Kubernetes manifests
4. **Verify Phase**: Check deployment health
5. **Test Phase**: Run smoke tests

## Monitoring

### Prometheus Metrics
- Request rate
- Error rate
- Response time
- Resource usage

### Grafana Dashboards
- Application overview
- Performance metrics
- Error tracking

### Alerts
- High error rate
- High latency
- Pod failures
- Resource exhaustion

## CI/CD Pipeline

### GitHub Actions Workflow

1. **Test**: Run all tests
2. **Build**: Create Docker images
3. **Deploy**: Deploy to environment
4. **Verify**: Run smoke tests
5. **Rollback**: Automatic rollback on failure

### Environments

- **Staging**: Deployed on push to `develop` branch
- **Production**: Deployed on push to `main` branch

## Security Features

- **Non-root users** in all containers
- **Read-only root filesystems** where possible
- **Security contexts** for pods
- **Network policies** for isolation
- **Secrets management** with Kubernetes
- **TLS/SSL** for all communications
- **Rate limiting** in Nginx

## Scaling

### Horizontal Pod Autoscaling
- **Backend**: 3-10 replicas based on CPU/memory
- **Frontend**: 2-6 replicas based on CPU/memory

### Resource Limits
- **Backend**: 512Mi-2Gi memory, 250m-2000m CPU
- **Frontend**: 256Mi-1Gi memory, 125m-1000m CPU

## Backup and Recovery

### Database Backups
```bash
# Create backup
kubectl exec -it postgres-0 -n production -- pg_dump -U synchire synchire > backup.sql

# Restore backup
kubectl exec -i postgres-0 -n production -- psql -U synchire synchire < backup.sql
```

### Volume Snapshots
```bash
# Create snapshot
kubectl create volumesnapshot postgres-snapshot --source=postgres-storage

# Restore from snapshot
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-restore
spec:
  dataSource:
    name: postgres-snapshot
    kind: VolumeSnapshot
  accessModes: [ReadWriteOnce]
  storageClassName: fast
  resources:
    requests:
      storage: 10Gi
EOF
```

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n production
kubectl describe pod <pod-name> -n production
```

### View Logs
```bash
kubectl logs -f <pod-name> -n production
```

### Debug Deployment
```bash
kubectl get events -n production --sort-by='.lastTimestamp'
```

### Rollback Deployment
```bash
kubectl rollout undo deployment/backend -n production
```

## Maintenance

### Update Secrets
```bash
kubectl create secret generic synchire-secrets \
  --from-literal=POSTGRES_PASSWORD=newpassword \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Rotate Certificates
```bash
# Update TLS certificates
kubectl create secret tls synchire-tls \
  --cert=/path/to/fullchain.pem \
  --key=/path/to/privkey.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Performance Optimization

### Database Optimization
- Connection pooling
- Query optimization
- Index maintenance
- Regular vacuuming

### Caching Strategy
- Redis for session storage
- CDN for static assets
- Browser caching headers
- Application-level caching

### Load Testing
```bash
# Install k6
curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz

# Run load test
./k6 run deploy/scripts/load-test.js
```

## Support

For deployment issues or questions:
1. Check logs: `./deploy/scripts/monitor.sh logs production`
2. Check health: `./deploy/scripts/monitor.sh health production`
3. Review metrics: Access Grafana dashboard
4. Check alerts: Review Prometheus alerts
