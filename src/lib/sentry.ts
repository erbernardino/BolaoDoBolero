import * as Sentry from '@sentry/react'

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'unknown',
    release: __APP_VERSION__,
    sendDefaultPii: true,
    tracesSampleRate: 0,
  })
}
