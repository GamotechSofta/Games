import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/config'
import App from './App.jsx'
import aakdaLogo from './config/logo'
import { applyThemeToDocument, getStoredTheme } from './context/ThemeContext'

applyThemeToDocument(getStoredTheme())

const favicon =
  document.querySelector("link[rel='icon']") || document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/png'
favicon.href = aakdaLogo
if (!favicon.parentNode) document.head.appendChild(favicon)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
