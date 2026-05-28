import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import i18n, { ensureLocaleLoaded } from './i18n/config'
import App from './App.jsx'
import { applyThemeToDocument, getStoredTheme } from './context/ThemeContext'
import { queryClient } from './queryClient'

applyThemeToDocument(getStoredTheme())

async function bootstrap() {
  try {
    const lng = localStorage.getItem('i18nextLng') || i18n.language || i18n.resolvedLanguage
    if (lng) await ensureLocaleLoaded(lng)
  } catch (_) {}

  createRoot(document.getElementById('root')).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )

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
