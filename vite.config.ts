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

// Tombstones de Service Workers LEGADOS. A aplicação NÃO é mais PWA, mas usuários
// antigos podem ter dois SWs registrados:
//   - /sw.js                     → workbox do antigo vite-plugin-pwa (servia o app
//                                  shell em cache → versões antigas voltavam no F5)
//   - /firebase-messaging-sw.js  → SW de notificações FCM (removido)
// Servimos um tombstone (JS válido) em ambos os caminhos. Quando o navegador faz o
// update-check do SW registrado, recebe este script que limpa TODOS os caches,
// desregistra o SW e recarrega as abas — eliminando o SW legado sem F5 manual.
// (Antes /sw.js caía no rewrite → HTML; o update do SW abortava e o worker velho
//  permanecia, servindo o app antigo. Servir JS válido faz o update concluir.)
const SW_TOMBSTONE_PATHS = ['/sw.js', '/firebase-messaging-sw.js']

function swTombstones(): Plugin {
  const content = `// Service Worker tombstone: limpa caches, desregistra e recarrega abas.
self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      // Assume o controle das abas para que client.navigate() funcione mesmo quando
      // o tombstone não controlava a aba (ex.: registro novo / sem clientsClaim).
      try { await self.clients.claim() } catch (e) {}
      if (self.caches) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
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
  const paths = new Set(SW_TOMBSTONE_PATHS)
  return {
    name: 'sw-tombstones',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url && paths.has(url)) {
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
      for (const p of SW_TOMBSTONE_PATHS) {
        writeFileSync(path.join(outDir, p.replace(/^\//, '')), content)
      }
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
      swTombstones(),
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
