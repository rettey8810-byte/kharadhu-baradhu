import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './hooks/useTheme.tsx'
import { OfflineProvider } from './hooks/useOffline.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <OfflineProvider>
        <App />
      </OfflineProvider>
    </ThemeProvider>
  </StrictMode>,
)
