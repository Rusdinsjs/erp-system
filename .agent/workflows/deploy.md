---
description: How to build and deploy for production
---

# Production Build & Deployment Workflow

## 1. Build for Production

// turbo
### 1.1 Build release binary
```bash
cargo build --release
```

The binary will be at `target/release/management-asset`

### 1.2 Build with optimizations
```bash
RUSTFLAGS="-C target-cpu=native" cargo build --release
```

## 2. Docker Build

### 2.1 Create Dockerfile (if not exists)
```dockerfile
# Build stage
FROM rust:1.75-slim as builder

WORKDIR /app
COPY . .

RUN apt-get update && apt-get install -y pkg-config libssl-dev
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/management-asset /usr/local/bin/

EXPOSE 8080

CMD ["management-asset"]
```

### 2.2 Build Docker image
```bash
docker build -t asset-management-backend:latest .
```

### 2.3 Run Docker container
```bash
docker run -d \
  --name asset-backend \
  -p 8080:8080 \
  -e DATABASE_URL="postgres://user:pass@host:5432/db" \
  -e JWT_SECRET="your-secret" \
  asset-management-backend:latest
```

## 3. Docker Compose (Development)

### 3.1 docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/asset_management
      - JWT_SECRET=dev-secret
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=asset_management
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### 3.2 Start services
```bash
docker-compose up -d
```

## 4. Kubernetes Deployment

### 4.1 Apply Kubernetes manifests
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### 4.2 Check deployment status
```bash
kubectl get pods -n asset-management
kubectl logs -f deployment/asset-backend -n asset-management
```

## 5. Health Checks

After deployment, verify the service is healthy:

```bash
# Health endpoint
curl https://api.example.com/health

# Ready endpoint
curl https://api.example.com/ready

# API test
curl https://api.example.com/api/assets
```

## 6. Rollback

If issues are found:

### Docker
```bash
docker stop asset-backend
docker run -d --name asset-backend asset-management-backend:previous-tag
```

### Kubernetes
```bash
kubectl rollout undo deployment/asset-backend -n asset-management
```
