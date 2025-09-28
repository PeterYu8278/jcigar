import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // 禁用React DevTools提示
      jsxRuntime: 'automatic',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Gentleman Club - Cigar Connoisseur',
        short_name: 'Gentleman Club',
        description: 'Premium cigar club management platform',
        theme_color: '#D4AF37',
        background_color: '#1A1A1A',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-72x72.svg',
            sizes: '72x72',
            type: 'image/svg+xml'
          },
          {
            src: '/icons/icon-96x96.svg',
            sizes: '96x96',
            type: 'image/svg+xml'
          },
          {
            src: '/icons/icon-128x128.svg',
            sizes: '128x128',
            type: 'image/svg+xml'
          },
          {
            src: '/icons/icon-144x144.svg',
            sizes: '144x144',
            type: 'image/svg+xml'
          },
          {
            src: '/icons/icon-152x152.svg',
            sizes: '152x152',
            type: 'image/svg+xml'
          },
          {
            src: '/icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/icons/icon-384x384.svg',
            sizes: '384x384',
            type: 'image/svg+xml'
          },
          {
            src: '/icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        maximumFileSizeToCacheInBytes: 3000000 // 3MB
      },
      devOptions: {
        enabled: false, // 开发环境禁用PWA
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
