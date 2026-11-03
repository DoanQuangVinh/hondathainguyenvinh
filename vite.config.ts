import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' },
  // Avoid Vite's filesystem crawl in restricted Windows workspaces; dependency imports are still served by Vite.
  optimizeDeps: { noDiscovery: true, include: [] }
})
