import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // Los códecs WASM de jSquash localizan su .wasm con new URL(..., import.meta.url);
    // el pre-bundling de esbuild rompe esa ruta en desarrollo.
    exclude: ['@jsquash/oxipng', '@jsquash/jpeg', '@jsquash/webp', '@jsquash/avif', '@jsquash/jxl'],
  },
  build: {
    rollupOptions: {
      output: {
        // Vendor code changes far less often than app code. Keeping it in
        // its own fingerprinted chunk means returning visitors re-download
        // only the small app chunk after a deploy, not all of React too —
        // pairs with the long-lived immutable cache headers in public/_headers.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('konva')) return 'vendor-konva'
            if (id.includes('react-router')) return 'vendor-router'
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react'
            if (id.includes('comlink') || id.includes('lucide-react') || id.includes('sonner') || id.includes('react-window')) return 'vendor-ui'
          }
        },
      },
    },
  },
})
