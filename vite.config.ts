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
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Gestión de Talleres',
        short_name: 'Talleres',
        description:
          'Gestión de clientes, vehículos e historial de reparaciones para talleres mecánicos',
        theme_color: '#ffffff',
        icons: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
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
