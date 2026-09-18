import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Gestión de Talleres',
        short_name: 'Talleres',
        description:
          'Gestión de clientes, vehículos e historial de reparaciones para talleres mecánicos',
        theme_color: '#2b5b84',
        background_color: '#f4f7fa',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'es-AR',
        // Íconos provisorios generados desde favicon.svg; se cambian cuando haya logo.
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Cache de lectura: red primero y, si no hay conexión, lo último que se vio.
        // Solo GET a la API REST de Supabase (no auth, no escrituras).
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/'),
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'supabase-lectura',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // 5173/5174/5180 los tiene tomados un proceso de Windows (svchost) en
    // esta máquina, así que fijamos otro puerto para que sea siempre el
    // mismo (coincide con la config de redirect URLs en Supabase Auth).
    port: 5199,
  },
})
