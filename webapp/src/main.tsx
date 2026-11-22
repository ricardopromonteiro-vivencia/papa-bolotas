import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/contexts/AuthContext'
import { registerSW } from 'virtual:pwa-register'

// Register service worker for PWA functionality
const updateSW = registerSW({
  onNeedRefresh() {
    // Optional: Show a prompt to reload the page to get the new version
    if (confirm('Nova versão disponível. Recarregar para atualizar?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Failed to find the root element')
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
