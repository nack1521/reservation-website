import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devPort = Number(env.VITE_DEV_PORT || 5173)

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: Number.isFinite(devPort) ? devPort : 5173,
      strictPort: true,
      proxy: {
        '/room': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/auth': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/reservations': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/users': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/user': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
