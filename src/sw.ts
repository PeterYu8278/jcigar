/**
 * Service Worker
 * 拦截 manifest.json 请求并动态生成
 */

import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

// 预缓存资源（由 Workbox 自动注入）
precacheAndRoute(self.__WB_MANIFEST)

// 拦截 manifest.json 请求
registerRoute(
  ({ url }) => url.pathname === '/manifest.json',
  async () => {
    try {
      // 从 IndexedDB 读取 appConfig
      const appConfig = await getAppConfigFromIndexedDB()
      
      // 生成动态 manifest
      const manifest = generateDynamicManifest(appConfig)
      
      // 返回 JSON 响应
      return new Response(JSON.stringify(manifest), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })
    } catch (error) {
      console.error('[SW] 生成 manifest 失败:', error)
      // 降级：返回默认 manifest
      return new Response(JSON.stringify(getDefaultManifest()), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })
    }
  }
)

/**
 * 从 IndexedDB 读取 appConfig（Service Worker 环境）
 */
async function getAppConfigFromIndexedDB(): Promise<any | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CigarAppDB', 1)
    
    request.onerror = () => {
      console.warn('[SW] IndexedDB 打开失败，使用默认配置')
      resolve(null)
    }
    
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['appConfig'], 'readonly')
      const store = transaction.objectStore('appConfig')
      const getRequest = store.get('current')
      
      getRequest.onsuccess = () => {
        const result = getRequest.result
        resolve(result?.config || null)
      }
      
      getRequest.onerror = () => {
        console.warn('[SW] 读取 appConfig 失败，使用默认配置')
        resolve(null)
      }
    }
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('appConfig')) {
        db.createObjectStore('appConfig', { keyPath: 'id' })
      }
    }
  })
}

/**
 * 生成动态 manifest（Service Worker 环境）
 */
function generateDynamicManifest(appConfig: any): any {
  const appName = appConfig?.appName || 'Cigar Club'
  const logoUrl = appConfig?.logoUrl

  // 基础图标配置
  const defaultIcons = [
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
      type: 'image/svg+xml',
      purpose: 'any maskable'
    },
    {
      src: '/icons/icon-384x384.svg',
      sizes: '384x384',
      type: 'image/svg+xml'
    },
    {
      src: '/icons/icon-512x512.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'any maskable'
    }
  ]

  // 如果有自定义 logo，优先使用
  const icons = logoUrl
    ? (() => {
        const isSvg = logoUrl.toLowerCase().endsWith('.svg')
        const iconType = isSvg ? 'image/svg+xml' : 'image/png'
        
        return [
          {
            src: logoUrl,
            sizes: '192x192',
            type: iconType,
            purpose: 'any maskable'
          },
          {
            src: logoUrl,
            sizes: '512x512',
            type: iconType,
            purpose: 'any maskable'
          },
          ...defaultIcons.filter(icon => !['192x192', '512x512'].includes(icon.sizes))
        ]
      })()
    : defaultIcons

  return {
    name: `${appName} - Cigar World`,
    short_name: appName,
    description: 'Premium cigar club management platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#1A1A1A',
    theme_color: '#D4AF37',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'zh-CN',
    categories: ['lifestyle', 'business', 'entertainment'],
    icons
  }
}

/**
 * 获取默认 manifest（降级方案）
 */
function getDefaultManifest(): any {
  return generateDynamicManifest(null)
}

