import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** SPA fallback: rewrite all non-file GET requests to /index.html (fixes Vite 7 root/query 404). */
function spaFallback() {
  return {
    name: 'spa-fallback',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.url ?? ''
        const [path, query] = raw.split('?')
        const pathPart = (path ?? '').trim() || '/'
        const hasExtension = /\.[a-zA-Z0-9]+$/.test(pathPart)
        const isViteInternal = pathPart.startsWith('/@') || pathPart.startsWith('/node_modules') || pathPart.startsWith('/__vite')
        if (req.method === 'GET' && !hasExtension && !isViteInternal) {
          req.url = query ? `/index.html?${query}` : '/index.html'
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  appType: 'spa',
  plugins: [spaFallback(), react(), tailwindcss()],
  server: { strictPort: false },
  preview: { strictPort: false },
})
