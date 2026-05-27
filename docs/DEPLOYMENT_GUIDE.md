# SyncHire Deployment Guide

Complete guide for deploying SyncHire to various environments.

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Local Development Setup](#local-development-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Cloud Platform Deployment](#cloud-platform-deployment)
6. [Database Migration](#database-migration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Security Hardening](#security-hardening)
9. [Backup & Disaster Recovery](#backup--disaster-recovery)
10. [Troubleshooting](#troubleshooting)

## Deployment Overview

### Architecture Components

SyncHire consists of multiple services that need to be deployed:

1. **Frontend**: Next.js 16 application (Node.js)
2. **API**: FastAPI backend (Python)
3. **MCP Servers**: 4 AI processing services (Node.js)
4. **Database**: PostgreSQL 16 + PGVector
5. **Cache**: Redis 7
6. **Storage**: Minio (S3-compatible)
7. **Reverse Proxy**: Nginx/Traefik

### Deployment Options

| Environment | Recommended Setup | Complexity |
|-------------|-------------------|------------|
| **Local Development** | Docker Compose | Low |
| **Staging** | Docker Compose / Single VPS | Medium |
| **Production** | Kubernetes / Cloud Platform | High |

## Local Development Setup

### Prerequisites

```bash
# Check versions
node --version    # >= 22.0.0
npm --version     # >= 10.0.0
python --version  # >= 3.11
docker --version  # >= 24.0
```

### Initial Setup

```bash
# Clone repository
git clone https://github.com/Rethymus/synchire.git
cd SyncHire

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Set API keys, database credentials, etc.

# Install dependencies
npm install

# Start infrastructure
npm run docker:up

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

### Access Local Services

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Database**: localhost:5432
- **Redis**: localhost:6379
- **Minio**: http://localhost:9001

## Docker Deployment

### Docker Compose Setup

The project includes a complete Docker Compose setup for single-server deployments.

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8000
    depends_on:
      - api

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://synchire:password@postgres:5432/synchire
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./api:/app

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=synchire
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=synchire
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### Production Docker Compose

**File: `docker-compose.prod.yml`**

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - api

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.synchire.com

  api:
    build:
      context: ./api
      dockerfile: Dockerfile.prod
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
```

### Deploy with Docker Compose

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

## Kubernetes Deployment

### Cluster Setup

The project includes Kubernetes manifests for deployment on any K8s cluster.

**Prerequisites:**
- Kubernetes cluster (1.20+)
- kubectl configured
- Ingress controller (NGINX/Traefik)
- Certificate manager (cert-manager)

### Namespace Configuration

```yaml
# k8s/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: synchire
  labels:
    name: synchire
```

### ConfigMap & Secrets

```yaml
# k8s/base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: synchire-config
  namespace: synchire
data:
  NODE_ENV: "production"
  API_PORT: "8000"
  FRONTEND_PORT: "3000"

---
# k8s/base/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: synchire-secrets
  namespace: synchire
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@postgres:5432/synchire"
  REDIS_URL: "redis://redis:6379"
  JWT_SECRET: "your-production-secret"
  OPENAI_API_KEY: "sk-..."
  ANTHROPIC_API_KEY: "sk-ant-..."
```

### Frontend Deployment

```yaml
# k8s/base/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: synchire
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: synchire/frontend:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: synchire
spec:
  selector:
    app: frontend
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
```

### API Deployment

```yaml
# k8s/base/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: synchire
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: synchire/api:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: synchire-secrets
              key: DATABASE_URL
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"

---
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: synchire
spec:
  selector:
    app: api
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP
```

### Ingress Configuration

```yaml
# k8s/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: synchire-ingress
  namespace: synchire
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - synchire.com
    - api.synchire.com
    secretName: synchire-tls
  rules:
  - host: synchire.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 3000
  - host: api.synchire.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api
            port:
              number: 8000
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/base/namespace.yaml

# Apply configuration
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secrets.yaml

# Deploy services
kubectl apply -f k8s/base/frontend-deployment.yaml
kubectl apply -f k8s/base/api-deployment.yaml

# Configure ingress
kubectl apply -f k8s/base/ingress.yaml

# Check deployment status
kubectl get pods -n synchire
kubectl get services -n synchire
kubectl get ingress -n synchire
```

## Cloud Platform Deployment

### AWS Deployment

**Using AWS EKS (Elastic Kubernetes Service):**

1. **Create EKS Cluster**
   ```bash
   eksctl create cluster \
     --name synchire \
     --region us-east-1 \
     --nodes 3 \
     --node-type t3.medium
   ```

2. **Deploy RDS PostgreSQL**
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier synchire-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username synchire \
     --allocated-storage 20
   ```

3. **Deploy ElastiCache Redis**
   ```bash
   aws elasticache create-cache-cluster \
     --cache-cluster-id synchire-redis \
     --engine redis \
     --cache-node-type cache.t3.micro \
     --num-cache-nodes 1
   ```

4. **Deploy Application**
   ```bash
   kubectl apply -f k8s/base/
   ```

### Google Cloud Platform

**Using GKE (Google Kubernetes Engine):**

1. **Create GKE Cluster**
   ```bash
   gcloud container clusters create synchire \
     --zone us-central1-a \
     --num-nodes 3 \
     --machine-type e2-medium
   ```

2. **Deploy Cloud SQL**
   ```bash
   gcloud sql instances create synchire-db \
     --tier db-f1-micro \
     --region us-central1
   ```

3. **Deploy Memorystore**
   ```bash
   gcloud redis instances create synchire-redis \
     --region us-central1 \
     --tier basic \
     --size 1
   ```

### Azure Deployment

**Using AKS (Azure Kubernetes Service):**

1. **Create AKS Cluster**
   ```bash
   az aks create \
     --resource-group synchire-rg \
     --name synchire-aks \
     --node-count 3 \
     --node-vm-size Standard_B2s
   ```

2. **Deploy Azure Database**
   ```bash
   az postgres server create \
     --name synchire-db \
     --resource-group synchire-rg \
     --sku-name B_Gen5_1
   ```

3. **Deploy Azure Cache**
   ```bash
   az redis create \
     --name synchire-redis \
     --resource-group synchire-rg \
     --sku Basic \
     --vm-size c0
   ```

## Database Migration

### Alembic Migration

```bash
# Navigate to API directory
cd api

# Create migration
alembic revision --autogenerate -m "Add new table"

# Run migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# View migration history
alembic history
```

### Production Migration

```bash
# Backup database before migration
pg_dump synchire > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migration
alembic upgrade head

# Verify migration
psql -U synchire -d synchire -c "\dt"
```

## Monitoring & Logging

### Health Checks

**Frontend Health Check:**
```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}
```

**API Health Check:**
```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }
```

### Monitoring Setup

**Prometheus & Grafana:**

```yaml
# k8s/base/prometheus.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
      - job_name: 'synchire'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            action: keep
            regex: frontend|api
```

### Logging Configuration

**Structured Logging:**

```python
import logging
import json

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "context": getattr(record, "context", {})
        }
        return json.dumps(log_data)

logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',
    handlers=[logging.StreamHandler()]
)
```

## Security Hardening

### SSL/TLS Configuration

**Nginx Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name synchire.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Security Headers

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### Firewall Configuration

```bash
# UFW rules
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

## Backup & Disaster Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/synchire_$DATE.sql.gz"

# Create backup
pg_dump synchire | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://synchire-backups/postgres/

# Keep local backups for 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

### File Storage Backup

```bash
# Backup Minio data
mc mirror minio/synchire-resumes /backups/resumes/
mc mirror minio/synchire-jds /backups/jds/

# Upload to backup location
aws s3 sync /backups/ s3://synchire-backups/files/
```

### Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 15 minutes

**Recovery Steps:**
1. Provision new infrastructure
2. Restore database from latest backup
3. Deploy application containers
4. Restore file storage
5. Update DNS to point to new infrastructure
6. Verify all services are operational

## Troubleshooting

### Common Issues

**1. Container won't start**
```bash
# Check logs
docker-compose logs -f frontend

# Check resource usage
docker stats

# Restart container
docker-compose restart frontend
```

**2. Database connection issues**
```bash
# Check database is running
kubectl get pods -n synchire -l app=postgres

# Check database logs
kubectl logs -n synchire postgres-0

# Test connection
psql -h postgres -U synchire -d synchire
```

**3. High memory usage**
```bash
# Check resource usage
kubectl top pods -n synchire

# Adjust resource limits
kubectl edit deployment frontend -n synchire
```

### Debug Commands

```bash
# Check pod status
kubectl get pods -n synchire

# Describe pod
kubectl describe pod <pod-name> -n synchire

# View logs
kubectl logs <pod-name> -n synchire -f

# Execute in container
kubectl exec -it <pod-name> -n synchire -- /bin/bash
```

### Performance Issues

**1. Slow API response**
```bash
# Check database query performance
kubectl exec -it postgres-0 -n synchire -- psql -U synchire -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

**2. High CPU usage**
```bash
# Check CPU usage by pod
kubectl top pods -n synchire --sort-by=cpu

# Scale deployment
kubectl scale deployment frontend -n synchire --replicas=5
```

---

**Additional Resources:**
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)