import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Com token (só no deploy), os source maps vão para o Sentry e são apagados do site publicado.
const sentryToken = process.env.SENTRY_AUTH_TOKEN

// Base path para GitHub Pages (projeto servido em /companheiro-do-mestre/).
// Para rodar em outra hospedagem na raiz, troque para '/'.
export default defineConfig({
  base: '/companheiro-do-mestre/',
  build: { sourcemap: sentryToken ? 'hidden' : false },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Companheiro do Mestre',
        short_name: 'Mestre',
        description: 'Ferramentas para a sua Mesa de RPG',
        display: 'standalone',
        background_color: '#f5efe0',
        theme_color: '#8b0000',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            // Lista de fontes do Open5e quase nunca muda: responde do cache e atualiza por trás.
            urlPattern: ({ url }) => url.origin === 'https://api.open5e.com' && url.pathname.startsWith('/v2/documents/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'open5e-docs', expiration: { maxEntries: 5 } }
          },
          {
            // Miniaturas do YouTube (Músicas/Referências): <img> sem CORS gera resposta opaca (status 0).
            urlPattern: ({ url }) => url.origin === 'https://img.youtube.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'yt-thumbs',
              cacheableResponse: { statuses: [0, 200] },
              // ponytail: resposta opaca conta ~7 MB na cota do Chrome; limite baixo + purge. Com CORS confirmado, subir o limite.
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 60, purgeOnQuotaError: true }
            }
          },
          {
            // Magias/monstros/itens: rede primeiro, cache quando offline.
            urlPattern: ({ url }) => url.origin === 'https://api.open5e.com',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open5e-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' }
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    }),
    sentryToken
      ? sentryVitePlugin({
        url: 'https://de.sentry.io/',
        org: process.env.SENTRY_ORG || 'demestreparamestre',
        project: process.env.SENTRY_PROJECT || 'companheiro-do-mestre',
        authToken: sentryToken,
        release: { name: process.env.VITE_RELEASE },
        sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
        telemetry: false
      })
      : null
  ]
})
