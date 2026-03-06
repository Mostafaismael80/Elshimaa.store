import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://elshimaa-1.runasp.net',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
