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

export default defineConfig(() => {
  const appVersion = resolveAppVersion()
  return {
    plugins: [
      react(),
      tailwindcss(),
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
