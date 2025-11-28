import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { mkdirSync, copyFileSync } from 'fs'
import { existsSync } from 'fs'
import { execSync } from 'child_process'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Inject Service Worker config before build
    {
      name: 'inject-sw-config',
      buildStart() {
        try {
          // 只在生产构建时注入（开发环境使用环境变量）
          if (process.env.NODE_ENV === 'production' || process.env.VITE_APP_ENV === 'production') {
            execSync('node scripts/inject-sw-config.js', { stdio: 'inherit' })
          }
        } catch (error) {
          console.warn('⚠️  Service Worker config injection skipped (development mode)')
        }
      }
    },
    // Ensure dist directory exists before PWA plugin runs
    {
      name: 'ensure-dist-exists',
      buildStart() {
        const distDir = resolve(__dirname, 'dist')
        if (!existsSync(distDir)) {
          mkdirSync(distDir, { recursive: true })
        }
      }
    },
    // Copy firebase-messaging-sw.js to dist directory
    {
      name: 'copy-firebase-messaging-sw',
      closeBundle() {
        const swSource = resolve(__dirname, 'public/firebase-messaging-sw.js')
        const swDest = resolve(__dirname, 'dist/firebase-messaging-sw.js')
        if (existsSync(swSource)) {
          copyFileSync(swSource, swDest)
          console.log('✅ Copied firebase-messaging-sw.js to dist')
        } else {
          console.warn('⚠️  firebase-messaging-sw.js not found in public directory')
        }
      }
    },
    react({
      // 禁用React DevTools提示
      jsxRuntime: 'automatic',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      selfDestroying: true, // 允许Service Worker自毁
      strategies: 'injectManifest', // 使用 injectManifest 策略以支持自定义 Service Worker
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        maximumFileSizeToCacheInBytes: 3000000, // 3MB
      },
      manifest: {
        name: 'Cigar Club - Cigar World',
        short_name: 'Cigar Club',
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
      // 注意：使用 injectManifest 策略时，workbox 配置在 injectManifest 中
      // 自定义逻辑在 src/sw.ts 中实现
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
    open: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
