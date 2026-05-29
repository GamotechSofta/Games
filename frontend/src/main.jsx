import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import i18n, { ensureLocaleLoaded } from './i18n/config'
import App from './App.jsx'
import { applyThemeToDocument, getStoredTheme } from './context/ThemeContext'
import { queryClient } from './queryClient'
import { schedulePostLoginPrefetch } from './api/postLoginPrefetch'
import { prefetchSpecialMarketChunks } from './api/prefetchSpecialMarkets'

applyThemeToDocument(getStoredTheme())

function scheduleCriticalChunkPrefetch() {
  const run = () => {
    void import('./pages/MarketsPage')
    void import('./pages/Games')
    void import('./pages/Funds')
    void import('./pages/Profile')
    void import('./components/DesktopDashboardLayout')
    void import('./pages/StartlineDashboard')
    void import('./pages/StarlineMarket')
    void import('./pages/KingBazaarMarket')
  }
  if (typeof window === 'undefined') return
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 1500 })
  } else {
    setTimeout(run, 600)
  }
}

function bootstrap() {
  createRoot(document.getElementById('root')).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )

  const lng = localStorage.getItem('i18nextLng') || i18n.language || i18n.resolvedLanguage
  if (lng) {
    void ensureLocaleLoaded(lng).catch(() => {})
  }

  if (localStorage.getItem('user')) {
    schedulePostLoginPrefetch()
  } else {
    prefetchSpecialMarketChunks()
  }

  scheduleCriticalChunkPrefetch()

  if (import.meta.env.PROD) {
    window.addEventListener(
      'load',
      () => {
        import('virtual:pwa-register').then(({ registerSW }) => {
          registerSW({ immediate: false })
        })
      },
      { once: true },
    )
  }
}

bootstrap()
