import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Track page views in Google Analytics for SPA navigation
type GTagFn = (...args: unknown[]) => void

declare global {
  interface Window {
    gtag?: GTagFn
  }
}

export function usePageTracking() {
  const location = useLocation()

  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_title: document.title,
      })
    }
  }, [location])
}
