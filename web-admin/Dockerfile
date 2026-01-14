# --- Build Stage ---
FROM node:20-alpine as builder

WORKDIR /app

# Install dependencies (using package-lock.json if available)
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
ENV VITE_API_URL=/api
ENV VITE_WS_URL=/ws
RUN npm run build

# --- Runtime Stage ---
FROM nginx:alpine

# Copy build files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config if needed (for SPA routing)
RUN echo 'server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    location /api { \
    proxy_pass http://backend:8080; \
    proxy_http_version 1.1; \
    proxy_set_header Upgrade $http_upgrade; \
    proxy_set_header Connection "upgrade"; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    location /ws { \
    proxy_pass http://backend:8080/ws; \
    proxy_http_version 1.1; \
    proxy_set_header Upgrade $http_upgrade; \
    proxy_set_header Connection "upgrade"; \
    proxy_set_header Host $host; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
