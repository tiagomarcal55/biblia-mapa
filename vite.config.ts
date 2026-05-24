import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],

  optimizeDeps: {
    include: ['lucide-react', 'pixi.js', 'zustand', 'gray-matter', 'fflate'],
  },

  server: {
    proxy: {
      // Proxy para o JW.org — remove CORS e X-Frame-Options
      // Uso: fetch('/jw-api/pt/biblioteca/...')
      '/jw-api': {
        target: 'https://www.jw.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/jw-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            delete proxyRes.headers['content-security-policy'];
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['x-content-type-options'];
            proxyRes.headers['access-control-allow-origin'] = '*';
          });
        },
      },
      '/wol-api': {
        target: 'https://wol.jw.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/wol-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            delete proxyRes.headers['content-security-policy'];
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['x-content-type-options'];
            proxyRes.headers['access-control-allow-origin'] = '*';
          });
        },
      },
    },
  },
});