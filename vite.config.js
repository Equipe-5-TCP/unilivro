import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    // Proxy para o backend Flask durante o desenvolvimento
    // Todas as chamadas /api/... são redirecionadas para o Flask
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
