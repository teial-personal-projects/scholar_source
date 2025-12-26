import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,  // Standard Vite port
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps for production
  }
})
