import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built site works on GitHub Pages project URLs
  // (e.g. https://<user>.github.io/<repo>/) without broken assets or 404s.
  base: './',
  plugins: [react()],
  server: {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three')) return 'three'
          if (id.includes('maplibre-gl')) return 'map'
          if (id.includes('node_modules/react')) return 'react'
          return undefined
        },
      },
    },
  },
})
