/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'

function resolveAppVersion(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return `build-${Date.now()}`
  }
}

function appVersionJson(version: string): Plugin {
  const payload = JSON.stringify({ version, buildTime: new Date().toISOString() })
  return {
    name: 'app-version-json',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] === '/version.json') {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate')
          res.end(payload)
          return
        }
        next()
      })
    },
    writeBundle(options) {
      const outDir = options.dir || 'dist'
      writeFileSync(path.join(outDir, 'version.json'), payload)
    },
  }
}

function firebaseMessagingSw(env: Record<string, string>): Plugin {
  const buildContent = () => `importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: ${JSON.stringify(env.VITE_FIREBASE_API_KEY || '')},
  projectId: ${JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || '')},
  messagingSenderId: ${JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')},
  appId: ${JSON.stringify(env.VITE_FIREBASE_APP_ID || '')},
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}
  self.registration.showNotification(title || 'Bolão do Bolero (Duda)', {
    body,
    icon: '/icon-192.png',
  })
})
`

  return {
    name: 'firebase-messaging-sw',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/firebase-messaging-sw.js') {
          res.setHeader('Content-Type', 'application/javascript')
          res.end(buildContent())
          return
        }
        next()
      })
    },
    writeBundle(options) {
      const outDir = options.dir || 'dist'
      writeFileSync(path.join(outDir, 'firebase-messaging-sw.js'), buildContent())
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appVersion = resolveAppVersion()
  return {
    plugins: [
      react(),
      tailwindcss(),
      firebaseMessagingSw(env),
      appVersionJson(appVersion),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
  }
})
