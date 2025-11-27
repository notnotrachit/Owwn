import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import netlify from '@netlify/vite-plugin-tanstack-start'
import { VitePWA } from 'vite-plugin-pwa'
import { generateSW } from 'workbox-build'

export default defineConfig({
  server: {
    port: 3000,
    allowedHosts: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      outDir: 'dist/client',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon.png'],
      manifest: {
        name: 'Owwn',
        short_name: 'Owwn',
        description: 'Own what you owe',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      // Workbox config is ignored by the plugin in this stack due to the bug,
      // but we keep it here for reference/future compatibility.
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,ico,svg}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
    {
      name: 'tanstack-start-pwa-fix',
      closeBundle: async () => {
        // Manually generate Service Worker because vite-plugin-pwa fails to do so
        // in the TanStack Start environment (likely due to build lifecycle conflicts).
        console.log('Generating Service Worker manually...')
        try {
          const { count, size, warnings } = await generateSW({
            globDirectory: 'dist/client',
            globPatterns: ['**/*.{js,css,html,png,ico,svg}'],
            swDest: 'dist/client/sw.js',
            ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
            skipWaiting: true,
            clientsClaim: true,
            cleanupOutdatedCaches: true,
            runtimeCaching: [
              {
                urlPattern: ({ request }) => request.destination === 'document',
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'documents',
                },
              },
              {
                 urlPattern: ({ request }) => request.destination === 'image',
                 handler: 'CacheFirst',
                 options: {
                   cacheName: 'images',
                   expiration: {
                     maxEntries: 50,
                     maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                   },
                 },
              },
            ],
          })

          if (warnings.length > 0) {
            console.warn('Warnings encountered while generating SW:', warnings)
          }
          console.log(`Generated service worker, which will precache ${count} files, totaling ${size} bytes.`)
        } catch (error) {
          console.error('Error generating service worker:', error)
        }
      }
    },
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart(),
    netlify(),
    viteReact(),
  ],
})
