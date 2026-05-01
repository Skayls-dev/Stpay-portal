import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5169',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const clientIp =
              req.headers['x-forwarded-for']?.split(',')[0].trim() ||
              req.socket?.remoteAddress ||
              '127.0.0.1'
            proxyReq.setHeader('X-Forwarded-For', clientIp)
            proxyReq.setHeader('X-Real-IP', clientIp)
          })
        },
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-query':  ['@tanstack/react-query'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
})
