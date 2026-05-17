import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function readFlaskRunPortFromFlaskenv(root) {
  try {
    const raw = fs.readFileSync(path.join(root, '.flaskenv'), 'utf8')
    const m = raw.match(/^\s*FLASK_RUN_PORT\s*=\s*(\d+)/m)
    if (m) return m[1]
  } catch {
    /* arquivo ausente */
  }
  return null
}

export default defineConfig(({ mode }) => {
  const root = process.cwd()
  const env = loadEnv(mode, root, '')
  const flaskPort =
    env.FLASK_RUN_PORT ||
    env.FLASK_PORT ||
    process.env.FLASK_RUN_PORT ||
    process.env.FLASK_PORT ||
    readFlaskRunPortFromFlaskenv(root) ||
    '5050'
  const flaskTarget = `http://127.0.0.1:${flaskPort}`

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Mesma porta que app.py (padrão 5050; evita conflito com outro app na 5000).
        '/api': { target: flaskTarget, changeOrigin: true },
      },
    },
  }
})