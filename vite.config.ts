// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/igdb': {
        target: 'http://localhost:5174', // your proxy port
        changeOrigin: true,
      },
    },
  },
})
