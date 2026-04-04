// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        // Must match Node server (default 3001 in server/igdb-proxy.mjs — avoids clashing with Vite on 5174)
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
