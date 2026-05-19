import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    // Allow access from the Cloudflare quick-tunnel domain (Vite 6 blocks
    // unknown hosts by default).
    allowedHosts: ['.trycloudflare.com', '.cfargotunnel.com', '.ivanovs.life', 'localhost'],
    proxy: {
      '/api': 'http://localhost:3101',
    },
  },
});
