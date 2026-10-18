import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isNativeApp } from './lib/native'
import { enforceFreshBundle } from './lib/buildGuard'

if (isNativeApp) {
  document.documentElement.classList.add('native-app')
  document.querySelector('meta[name=viewport]')?.setAttribute('content',
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover')
  enforceFreshBundle()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
