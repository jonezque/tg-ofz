import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { init } from '@telegram-apps/sdk'
import './index.css'
import App from './App.tsx'

// Initialize Telegram Mini App SDK. Runs once before React mounts.
// Safe to call outside TG environment — SDK handles non-TG contexts gracefully.
try {
  init({ acceptCustomStyles: true })
} catch {
  // Running outside Telegram (e.g. plain browser during dev) — ignore
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
