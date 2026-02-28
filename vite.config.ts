import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.png', 'manifest.json'],
      manifest: {
        name: 'Kharadhu Baradhu',
        short_name: 'Kharadhu',
        description: 'Track family expenses and manage budgets in MVR (Maldivian Rufiyaa)',
        theme_color: '#10b981',
        background_color: '#10b981',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
