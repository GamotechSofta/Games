import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import i18n, { ensureLocaleLoaded } from './i18n/config'
import App from './App.jsx'
import { applyThemeToDocument, getStoredTheme } from './context/ThemeContext'
import { queryClient } from './queryClient'
import { store } from './store'
import { schedulePostLoginPrefetch } from './api/postLoginPrefetch'
import { prefetchSpecialMarketChunks } from './api/prefetchSpecialMarkets'
import { bindCallAudioUnlock } from './services/callAudioUnlock'

applyThemeToDocument(getStoredTheme())

/** Register SW early — required for iPhone Home Screen push before subscribe. */
void import('virtual:pwa-register')
  .then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegisteredSW() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
        }
      },
    })
  })
  .catch(() => {})

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

function startApp() {
  bindCallAudioUnlock()

  createRoot(document.getElementById('root')).render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Provider>,
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
}

startApp()
