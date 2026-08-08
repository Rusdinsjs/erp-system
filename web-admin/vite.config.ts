import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import http from 'node:http'

// Plugin Vite custom: pipe /api/upload langsung ke backend tanpa buffering
// Ini mencegah EPIPE error yang terjadi di http-proxy saat multipart form-data
const uploadPipePlugin = {
  name: 'upload-pipe-middleware',
  configureServer(server: any) {
    server.middlewares.use('/api/upload', (req: any, res: any, next: any) => {
      if (req.method !== 'POST') return next();

      // Pipe langsung ke backend Rust (tanpa buffering Vite proxy)
      const backendReq = http.request(
        {
          hostname: 'localhost',
          port: 8181,
          path: '/api/upload',
          method: 'POST',
          headers: { ...req.headers, host: 'localhost:8181' },
        },
        (backendRes) => {
          res.writeHead(backendRes.statusCode || 200, backendRes.headers);
          backendRes.pipe(res, { end: true });
        }
      );

      backendReq.on('error', (err) => {
        console.error('[upload pipe error]', err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Backend tidak dapat dijangkau' }));
        }
      });

      // Pipe request body langsung ke backend tanpa buffer (hindari EPIPE)
      req.pipe(backendReq, { end: true });
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), uploadPipePlugin as any],
  server: {
    port: 5174,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8181',
        changeOrigin: true,
        proxyTimeout: 120000,
        timeout: 120000,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            const code = (err as NodeJS.ErrnoException).code;
            if (code === 'EPIPE' || code === 'ECONNRESET') return;
            console.error('[proxy error]', err.message);
            if (res && !(res as any).headersSent) {
              (res as any).writeHead(502, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({ error: err.message }));
            }
          });
        },
      },
      '/ws': {
        target: 'ws://localhost:8181',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@tanstack/react-query', 'lucide-react', 'clsx', 'tailwind-merge'],
          charts: ['recharts'],
          utils: ['dayjs', 'axios', 'zustand'],
        },
      },
    },
  },
})
