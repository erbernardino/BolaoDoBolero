import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'
import { getStorage } from 'firebase/storage'
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics'
import { getPerformance, type FirebasePerformance } from 'firebase/performance'
import { getRemoteConfig, fetchAndActivate, type RemoteConfig } from 'firebase/remote-config'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const messaging = async () => (await isSupported()) ? getMessaging(app) : null

// Analytics — so inicializa em ambientes que suportam (web seguro, sem extensoes
// bloqueando, etc.). isAnalyticsSupported retorna false em SSR/iframes restritos.
let analyticsInstance: Analytics | null = null
isAnalyticsSupported().then((ok) => {
  if (ok && firebaseConfig.measurementId) {
    analyticsInstance = getAnalytics(app)
  }
}).catch(() => {})
export const getAnalyticsInstance = () => analyticsInstance

// Performance Monitoring — auto-coleta web vitals e traces de fetch/XHR.
let performanceInstance: FirebasePerformance | null = null
try {
  performanceInstance = getPerformance(app)
} catch {
  // Ambiente nao suportado (SSR, etc) — falha silencioso
}
export const getPerformanceInstance = () => performanceInstance

// Remote Config — feature flags e configuracoes remotas.
// Inicializacao lazy via fetchAndActivate(), feita no useRemoteConfig hook.
const remoteConfigInstance: RemoteConfig = (() => {
  const rc = getRemoteConfig(app)
  rc.settings.minimumFetchIntervalMillis = 5 * 60 * 1000  // 5 min em prod
  return rc
})()

export const remoteConfig = remoteConfigInstance

// Defaults dos flags. Servem como fallback se Remote Config nao baixou.
export const REMOTE_CONFIG_DEFAULTS: Record<string, string | number | boolean> = {
  feature_home_enriched: true,
}
remoteConfig.defaultConfig = REMOTE_CONFIG_DEFAULTS

// Helper de inicializacao: chama fetchAndActivate uma vez na app.
let rcReady: Promise<void> | null = null
export function ensureRemoteConfig(): Promise<void> {
  if (!rcReady) {
    rcReady = fetchAndActivate(remoteConfig).then(() => {}).catch(() => {})
  }
  return rcReady
}
