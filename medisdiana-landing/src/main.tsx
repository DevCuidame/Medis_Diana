import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

// ── Global fetch interceptor: detects 401 and notifies the app ────────────────
const _originalFetch = window.fetch
window.fetch = async (...args) => {
  const res = await _originalFetch(...args)
  if (res.status === 401) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url
    // Skip login endpoint to avoid infinite loop
    if (!url.includes('/auth/login') && !url.includes('/auth/refresh')) {
      window.dispatchEvent(new CustomEvent('session:expired'))
    }
  }
  return res
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
