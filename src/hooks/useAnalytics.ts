import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { logEvent, setUserId } from 'firebase/analytics'
import { getAnalyticsInstance } from '../config/firebase'
import { useAuth } from './useAuth'

// Hook de tracking de SPA: registra page_view a cada mudanca de rota e
// associa o uid do usuario logado para retencao/funil.
export function useAnalyticsTracking() {
  const location = useLocation()
  const { firebaseUser } = useAuth()

  useEffect(() => {
    const a = getAnalyticsInstance()
    if (!a) return
    logEvent(a, 'page_view', {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    })
  }, [location.pathname, location.search])

  useEffect(() => {
    const a = getAnalyticsInstance()
    if (!a) return
    setUserId(a, firebaseUser?.uid ?? null)
  }, [firebaseUser?.uid])
}

// Helper para eventos custom do bolao (palpite_salvo, ranking_visto, etc.)
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  const a = getAnalyticsInstance()
  if (!a) return
  logEvent(a, name as 'select_content', params)
}
