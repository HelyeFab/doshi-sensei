# Doshi Sensei Review Hub - Deployment Guide

## Overview

This directory contains all deployment configurations for the Doshi Sensei Review Hub production system. The deployment supports multiple environments (development, staging, production) and uses Kubernetes for orchestration.

## Directory Structure

```
deploy/
├── docker/                 # Docker configurations
│   ├── Dockerfile         # Main application image
│   ├── Dockerfile.websocket # WebSocket server image
│   └── docker-compose.yml # Local development setup
├── kubernetes/            # Kubernetes manifests
│   ├── namespace.yaml     # Namespace definition
│   ├── configmap.yaml     # Configuration maps
│   ├── secrets.yaml       # Secret templates (DO NOT commit real values)
│   ├── ingress.yaml       # Ingress configuration
│   ├── hpa.yaml          # Horizontal Pod Autoscaler
│   ├── monitoring.yaml    # Prometheus/Grafana configs
│   └── deployments/       # Service deployments
│       ├── app-deployment.yaml
│       ├── websocket-deployment.yaml
│       ├── redis-deployment.yaml
│       └── postgres-deployment.yaml
├── ci-cd/                 # CI/CD pipelines
│   └── github-actions.yml # GitHub Actions workflow
├── scripts/               # Deployment scripts
│   ├── deploy.sh         # Main deployment script
│   └── health-check.sh   # Health verification script
└── environments/          # Environment configurations
    └── .env.example      # Environment template
```

## Prerequisites

### Required Tools
- Docker 20.10+
- Kubernetes 1.25+
- kubectl CLI
- Helm 3.0+ (optional)
- Node.js 20+

### Cloud Requirements
- Google Cloud Platform account (or equivalent)
- Kubernetes cluster (GKE, EKS, or AKS)
- Container registry access
- Domain name with SSL certificate

## Quick Start

### 1. Local Development

```bash
# Start local environment with Docker Compose
cd deploy/docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop environment
docker-compose down
```

### 2. Production Deployment

```bash
# Set up environment variables
cp deploy/environments/.env.example deploy/environments/.env.production
# Edit .env.production with your values

# Run deployment script
./deploy/scripts/deploy.sh deploy

# Verify deployment
./deploy/scripts/health-check.sh production
```

## Deployment Environments

### Development
- **Purpose**: Local development and testing
- **Infrastructure**: Docker Compose
- **Database**: Local PostgreSQL
- **Cache**: Local Redis
- **Access**: http://localhost:3000

### Staging
- **Purpose**: Pre-production testing
- **Infrastructure**: Kubernetes (reduced resources)
- **Database**: Cloud SQL (shared instance)
- **Cache**: Redis (single node)
- **Access**: https://staging.doshisensei.com

### Production
- **Purpose**: Live user traffic
- **Infrastructure**: Kubernetes (full resources)
- **Database**: Cloud SQL (dedicated instance)
- **Cache**: Redis cluster
- **Access**: https://doshisensei.com

## Configuration Management

### Environment Variables

All environment-specific configurations are managed through environment variables. See `deploy/environments/.env.example` for a complete list.

Critical variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Authentication secret
- `FIREBASE_*`: Firebase configuration

### Secrets Management

**NEVER commit real secrets to version control!**

Recommended approaches:
1. **Kubernetes Secrets**: Use `kubectl create secret`
2. **Sealed Secrets**: Encrypt secrets with Bitnami Sealed Secrets
3. **External Secrets**: Use AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault
4. **CI/CD Variables**: Store in GitHub Secrets or equivalent

Example:
```bash
# Create secret from file
kubectl create secret generic doshi-sensei-secrets \
  --from-env-file=.env.production \
  -n doshi-sensei

# Create secret manually
kubectl create secret generic firebase-admin \
  --from-literal=client-email=firebase@example.com \
  --from-file=private-key=./private-key.pem \
  -n doshi-sensei
```

## Deployment Process

### Manual Deployment

1. **Build Images**
```bash
# Build application image
docker build -t doshi-sensei:latest -f deploy/docker/Dockerfile .

# Build WebSocket image
docker build -t doshi-sensei-websocket:latest -f deploy/docker/Dockerfile.websocket .

# Push to registry
docker tag doshi-sensei:latest gcr.io/project-id/doshi-sensei:latest
docker push gcr.io/project-id/doshi-sensei:latest
```

2. **Deploy to Kubernetes**
```bash
# Create namespace
kubectl create namespace doshi-sensei

# Apply configurations
kubectl apply -f deploy/kubernetes/configmap.yaml
kubectl apply -f deploy/kubernetes/secrets.yaml

# Deploy services
kubectl apply -f deploy/kubernetes/deployments/

# Setup ingress
kubectl apply -f deploy/kubernetes/ingress.yaml

# Configure autoscaling
kubectl apply -f deploy/kubernetes/hpa.yaml
```

3. **Verify Deployment**
```bash
# Check pod status
kubectl get pods -n doshi-sensei

# Check services
kubectl get services -n doshi-sensei

# Run health checks
./deploy/scripts/health-check.sh
```

### Automated Deployment (CI/CD)

The GitHub Actions workflow automatically:
1. Runs tests on every push
2. Builds and pushes Docker images
3. Deploys to staging on main branch merge
4. Allows manual promotion to production

Trigger deployment:
```bash
# Push to main branch
git push origin main

# Or trigger manually
gh workflow run deploy.yml -f environment=production
```

## Scaling Configuration

### Horizontal Pod Autoscaler (HPA)

The application automatically scales based on:
- CPU utilization (target: 70%)
- Memory utilization (target: 80%)
- Request rate (target: 1000 req/s)

Scaling limits:
- **App**: 3-10 replicas
- **WebSocket**: 2-5 replicas

### Manual Scaling

```bash
# Scale application
kubectl scale deployment app-deployment --replicas=5 -n doshi-sensei

# Scale WebSocket service
kubectl scale deployment websocket-deployment --replicas=3 -n doshi-sensei
```

## Monitoring

### Metrics

Prometheus metrics available at:
- Application: `/api/metrics`
- WebSocket: `/metrics`

Key metrics:
- Request rate and latency
- Error rate
- Active connections
- Cache hit rate
- Database pool usage

### Dashboards

Grafana dashboards included for:
- Application performance
- Infrastructure health
- Business metrics
- Error tracking

### Alerts

Configured alerts:
- High error rate (>5%)
- High response time (p95 > 500ms)
- Low cache hit rate (<80%)
- Database connection exhaustion
- Pod memory usage (>90%)

## Troubleshooting

### Common Issues

1. **Pods not starting**
```bash
# Check pod events
kubectl describe pod <pod-name> -n doshi-sensei

# Check logs
kubectl logs <pod-name> -n doshi-sensei
```

2. **Database connection issues**
```bash
# Test connection from pod
kubectl exec -it <pod-name> -n doshi-sensei -- psql $DATABASE_URL
```

3. **High memory usage**
```bash
# Check resource usage
kubectl top pods -n doshi-sensei

# Increase limits if needed
kubectl edit deployment app-deployment -n doshi-sensei
```

### Rollback Procedure

```bash
# Automatic rollback
kubectl rollout undo deployment/app-deployment -n doshi-sensei

# Rollback to specific revision
kubectl rollout undo deployment/app-deployment --to-revision=2 -n doshi-sensei

# Check rollout history
kubectl rollout history deployment/app-deployment -n doshi-sensei
```

## Backup and Recovery

### Database Backup

```bash
# Manual backup
kubectl exec -it postgres-0 -n doshi-sensei -- \
  pg_dump -U doshi doshi_sensei > backup-$(date +%Y%m%d).sql

# Scheduled backups configured via CronJob
kubectl apply -f deploy/kubernetes/backup-cronjob.yaml
```

### Restore Procedure

```bash
# Restore from backup
kubectl exec -i postgres-0 -n doshi-sensei -- \
  psql -U doshi doshi_sensei < backup-20240101.sql
```

## Security Considerations

1. **Network Policies**: Restrict pod-to-pod communication
2. **RBAC**: Use role-based access control
3. **Pod Security**: Run as non-root user
4. **Secrets Rotation**: Rotate secrets regularly
5. **Image Scanning**: Scan images for vulnerabilities
6. **TLS/SSL**: Enforce HTTPS everywhere
7. **Rate Limiting**: Implement at ingress level

## Performance Optimization

1. **Resource Limits**: Set appropriate CPU/memory limits
2. **Connection Pooling**: Database pool size: 2-10 connections
3. **Caching Strategy**: Multi-tier caching (Memory → Redis → Database)
4. **CDN**: Static assets served via CDN
5. **Image Optimization**: Multi-stage Docker builds
6. **Lazy Loading**: Code splitting and dynamic imports

## Support

For deployment issues:
1. Check the [troubleshooting section](#troubleshooting)
2. Review deployment logs
3. Contact the DevOps team
4. Create an issue in the repository

## License

Copyright (c) 2025 Doshi Sensei. All rights reserved.