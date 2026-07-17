import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) requiere manualChunks como FUNCIÓN, no objeto.
        // Regex compatible con las rutas anidadas de pnpm (.pnpm/<pkg>@ver/node_modules/<pkg>/).
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (/[\\/]framer-motion[\\/]/.test(id)) return 'vendor-motion'
          if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'vendor-react'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3008',
        changeOrigin: true,
      }
    }
  }
})
