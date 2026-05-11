import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: 'all',
    headers: {
      // Required for SharedArrayBuffer (used by Transformers.js WASM)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/api': 'http://localhost:8000',
      '/bgm': 'http://localhost:8000',
    },
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
})
