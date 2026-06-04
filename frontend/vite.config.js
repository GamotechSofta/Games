import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

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
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devProxyTarget =
    env.VITE_DEV_PROXY_TARGET?.replace(/\/$/, '') || 'http://localhost:3010'

  return {
  appType: 'spa',
  plugins: [
    spaFallback(),
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: false,
      devOptions: { enabled: true },
      includeAssets: ['favIcon.png', 'favIcon.webp', 'aakdaLogo.webp'],
      manifest: {
        name: 'Aakda Games',
        short_name: 'Aakda',
        theme_color: '#141415',
        background_color: '#141415',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favIcon.png', sizes: '192x192', type: 'image/png' },
          { src: '/favIcon.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    strictPort: false,
    proxy: {
      '/api/v1': {
        target: devProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: devProxyTarget,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  preview: { strictPort: false },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-router')) return 'router'
          if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n'
          if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor'
          if (id.includes('react-icons')) return 'icons'
          return undefined
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
}
})
