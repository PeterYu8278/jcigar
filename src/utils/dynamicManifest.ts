/**
 * 动态 Manifest 生成工具
 * 用于根据 appConfig 动态生成 PWA manifest
 */
import type { AppConfig } from '../types'

export interface DynamicManifest {
  name: string
  short_name: string
  description: string
  start_url: string
  display: string
  background_color: string
  theme_color: string
  orientation: string
  scope: string
  lang: string
  categories: string[]
  icons: Array<{
    src: string
    sizes: string
    type: string
    purpose?: string
  }>
}

/**
 * 生成动态 manifest
 * @param appConfig 应用配置
 * @returns DynamicManifest 对象
 */
export const generateDynamicManifest = (appConfig: AppConfig | null): DynamicManifest => {
  const appName = appConfig?.appName || 'Cigar Club'
  const logoUrl = appConfig?.logoUrl

  // 基础图标配置（使用默认图标）
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

  // 如果有自定义 logo，优先使用自定义 logo
  const icons = logoUrl
    ? (() => {
        // 检测图标类型（根据 URL 扩展名）
        const isSvg = logoUrl.toLowerCase().endsWith('.svg')
        const iconType = isSvg ? 'image/svg+xml' : 'image/png'
        
        return [
          // 使用自定义 logo 作为主要图标
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
          // 保留其他尺寸的默认图标作为降级
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
 * 创建动态 manifest blob URL
 * @param manifest Manifest 对象
 * @returns Blob URL
 */
export const createManifestBlobUrl = (manifest: DynamicManifest): string => {
  const manifestJson = JSON.stringify(manifest, null, 2)
  const blob = new Blob([manifestJson], { type: 'application/json' })
  return URL.createObjectURL(blob)
}

/**
 * 更新 manifest link
 * @param manifestUrl Manifest URL（可以是 blob URL 或普通 URL）
 */
export const updateManifestLink = (manifestUrl: string): void => {
  // 查找现有的 manifest link
  let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement

  if (!manifestLink) {
    // 如果不存在，创建新的 link 元素
    manifestLink = document.createElement('link')
    manifestLink.rel = 'manifest'
    document.head.appendChild(manifestLink)
  }

  // 更新 href
  manifestLink.href = manifestUrl
}

/**
 * 更新 favicon
 * @param iconUrl 图标 URL
 */
export const updateFavicon = (iconUrl: string): void => {
  // 更新 SVG favicon
  let faviconSvg = document.querySelector('link[rel="icon"][type="image/svg+xml"]') as HTMLLinkElement
  if (!faviconSvg) {
    faviconSvg = document.createElement('link')
    faviconSvg.rel = 'icon'
    faviconSvg.type = 'image/svg+xml'
    document.head.appendChild(faviconSvg)
  }
  faviconSvg.href = iconUrl

  // 更新 PNG favicon（192x192）
  let faviconPng192 = document.querySelector('link[rel="icon"][sizes="192x192"]') as HTMLLinkElement
  if (!faviconPng192) {
    faviconPng192 = document.createElement('link')
    faviconPng192.rel = 'icon'
    faviconPng192.type = 'image/png'
    faviconPng192.setAttribute('sizes', '192x192')
    document.head.appendChild(faviconPng192)
  }
  faviconPng192.href = iconUrl
}

/**
 * 更新 Apple Touch Icons
 * @param iconUrl 图标 URL
 */
export const updateAppleTouchIcons = (iconUrl: string): void => {
  const sizes = ['180x180', '152x152', '144x144', '120x120']

  sizes.forEach(size => {
    let appleIcon = document.querySelector(
      `link[rel="apple-touch-icon"][sizes="${size}"]`
    ) as HTMLLinkElement

    if (!appleIcon) {
      appleIcon = document.createElement('link')
      appleIcon.rel = 'apple-touch-icon'
      appleIcon.setAttribute('sizes', size)
      document.head.appendChild(appleIcon)
    }

    appleIcon.href = iconUrl
  })
}

/**
 * 应用动态图标更新
 * @param appConfig 应用配置
 * @returns 清理函数（用于清理 blob URL）
 */
export const applyDynamicIcons = (appConfig: AppConfig | null): (() => void) => {
  const manifest = generateDynamicManifest(appConfig)
  const manifestBlobUrl = createManifestBlobUrl(manifest)

  // 更新 manifest link
  updateManifestLink(manifestBlobUrl)

  // 如果有自定义 logo，更新图标
  if (appConfig?.logoUrl) {
    updateFavicon(appConfig.logoUrl)
    updateAppleTouchIcons(appConfig.logoUrl)
  }

  // 返回清理函数
  return () => {
    URL.revokeObjectURL(manifestBlobUrl)
  }
}

