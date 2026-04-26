/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
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

// Tombstone do Service Worker antigo (firebase-messaging-sw.js do PWA legado).
// Quando o navegador checa atualizacao do SW, recebe esta versao que se
// desregistra e recarrega todas as abas abertas. Apos esse ciclo, o SW some
// do navegador do usuario sem necessidade de F5 manual.
function firebaseMessagingSwTombstone(): Plugin {
  const content = `// Service Worker tombstone: desregistra e recarrega abas.
self.addEventListener('install', (event) => {
  self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        client.navigate(client.url)
      }
    } catch (err) {
      // Falha silenciosa
    }
  })())
})
`
  return {
    name: 'firebase-messaging-sw-tombstone',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] === '/firebase-messaging-sw.js') {
          res.setHeader('Content-Type', 'application/javascript')
          res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate')
          res.end(content)
          return
        }
        next()
      })
    },
    writeBundle(options) {
      const outDir = options.dir || 'dist'
      writeFileSync(path.join(outDir, 'firebase-messaging-sw.js'), content)
    },
  }
}

export default defineConfig(() => {
  const appVersion = resolveAppVersion()
  return {
    plugins: [
      react(),
      tailwindcss(),
      appVersionJson(appVersion),
      firebaseMessagingSwTombstone(),
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
