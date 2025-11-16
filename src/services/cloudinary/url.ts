// Cloudinary URL 生成服务

import { getCloudinaryConfig } from './config'
import type { TransformationOptions, UrlOptions } from './types'

/**
 * 构建转换参数字符串
 */
const buildTransformationString = (options: TransformationOptions): string => {
  const transformations: string[] = []

  if (options.width) transformations.push(`w_${options.width}`)
  if (options.height) transformations.push(`h_${options.height}`)
  if (options.crop) transformations.push(`c_${options.crop}`)
  if (options.gravity) transformations.push(`g_${options.gravity}`)
  
  if (options.quality) {
    const quality = options.quality === 'auto' ? 'auto' : options.quality
    transformations.push(`q_${quality}`)
  }
  
  if (options.format && options.format !== 'auto') {
    transformations.push(`f_${options.format}`)
  }
  
  if (options.fetchFormat && options.fetchFormat !== 'auto') {
    transformations.push(`f_${options.fetchFormat}`)
  }
  
  if (options.angle) transformations.push(`a_${options.angle}`)
  if (options.opacity) transformations.push(`o_${options.opacity}`)
  if (options.radius) {
    const radius = typeof options.radius === 'number' ? options.radius : options.radius
    transformations.push(`r_${radius}`)
  }
  if (options.effect) transformations.push(`e_${options.effect}`)
  if (options.background) transformations.push(`b_${options.background}`)
  if (options.overlay) transformations.push(`l_${options.overlay}`)
  if (options.underlay) transformations.push(`u_${options.underlay}`)
  if (options.colorSpace) transformations.push(`cs_${options.colorSpace}`)

  // 添加其他转换参数
  Object.entries(options).forEach(([key, value]) => {
    if (!['width', 'height', 'crop', 'gravity', 'quality', 'format', 'fetchFormat', 'angle', 'opacity', 'radius', 'effect', 'background', 'overlay', 'underlay', 'colorSpace'].includes(key) && value !== undefined) {
      // 支持自定义转换参数
      transformations.push(`${key}_${value}`)
    }
  })

  return transformations.length > 0 ? transformations.join(',') : ''
}

/**
 * 生成 Cloudinary URL
 * @param publicId 资源的 public_id
 * @param options URL 选项
 * @returns Cloudinary URL
 */
export const generateUrl = (
  publicId: string,
  options: UrlOptions = {}
): string => {
  try {
    const config = getCloudinaryConfig()
    const protocol = options.secure !== false ? (config.secure ? 'https' : 'http') : 'http'
    const resourceType = (options as any).resourceType || 'image'
    
    let url = `${protocol}://res.cloudinary.com/${config.cloudName}/${resourceType}/upload`

    // 构建转换参数字符串
    const transformationString = buildTransformationString(options)
    if (transformationString) {
      url += `/${transformationString}`
    }

    // 添加版本号（如果提供）
    if (options.version) {
      url += `/v${options.version}`
    }

    // 添加签名（如果提供）
    if (options.signature) {
      url += `/s${options.signature}`
    }

    // 添加 public_id
    url += `/${publicId}`

    // 添加文件扩展名（如果 useExtension 为 true）
    if (options.useExtension && options.format && options.format !== 'auto') {
      url += `.${options.format}`
    }

    return url
  } catch (error) {
    throw new Error(`生成 Cloudinary URL 失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 生成优化后的图片 URL
 * @param publicId 图片的 public_id
 * @param options 转换选项
 * @returns 优化后的图片 URL
 */
export const getOptimizedImageUrl = (
  publicId: string,
  options: TransformationOptions = {}
): string => {
  return generateUrl(publicId, {
    ...options,
    quality: options.quality || 'auto',
    format: options.format || 'auto',
    fetchFormat: options.fetchFormat || 'auto'
  })
}

/**
 * 生成缩略图 URL
 * @param publicId 图片的 public_id
 * @param size 缩略图尺寸
 * @param options 额外转换选项
 * @returns 缩略图 URL
 */
export const getThumbnailUrl = (
  publicId: string,
  size: number = 150,
  options: Omit<TransformationOptions, 'width' | 'height' | 'crop'> = {}
): string => {
  return getOptimizedImageUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: options.gravity || 'face',
    ...options
  })
}

/**
 * 生成品牌 logo URL
 * @param publicId 图片的 public_id
 * @param size logo 尺寸
 * @param options 额外转换选项
 * @returns logo URL
 */
export const getBrandLogoUrl = (
  publicId: string,
  size: number = 200,
  options: Omit<TransformationOptions, 'width' | 'height' | 'crop' | 'gravity'> = {}
): string => {
  return getOptimizedImageUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'center',
    quality: 'auto',
    format: 'auto',
    ...options
  })
}

/**
 * 生成产品图片 URL
 * @param publicId 图片的 public_id
 * @param width 宽度
 * @param height 高度
 * @param options 额外转换选项
 * @returns 产品图片 URL
 */
export const getProductImageUrl = (
  publicId: string,
  width: number = 400,
  height: number = 400,
  options: Omit<TransformationOptions, 'width' | 'height' | 'crop'> = {}
): string => {
  return getOptimizedImageUrl(publicId, {
    width,
    height,
    crop: 'fill',
    gravity: options.gravity || 'center',
    quality: 'auto',
    format: 'auto',
    ...options
  })
}

/**
 * 生成活动图片 URL
 * @param publicId 图片的 public_id
 * @param width 宽度
 * @param height 高度
 * @param options 额外转换选项
 * @returns 活动图片 URL
 */
export const getEventImageUrl = (
  publicId: string,
  width: number = 800,
  height: number = 600,
  options: Omit<TransformationOptions, 'width' | 'height' | 'crop'> = {}
): string => {
  return getOptimizedImageUrl(publicId, {
    width,
    height,
    crop: 'fill',
    gravity: options.gravity || 'center',
    quality: 'auto',
    format: 'auto',
    ...options
  })
}

/**
 * 生成用户头像 URL
 * @param publicId 图片的 public_id
 * @param size 头像尺寸
 * @param options 额外转换选项
 * @returns 用户头像 URL
 */
export const getUserAvatarUrl = (
  publicId: string,
  size: number = 200,
  options: Omit<TransformationOptions, 'width' | 'height' | 'crop' | 'gravity'> = {}
): string => {
  return getOptimizedImageUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    format: 'auto',
    ...options
  })
}

/**
 * 从 URL 中提取 public_id
 * @param url Cloudinary URL
 * @returns public_id 或 null
 */
export const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    // URL 格式: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
    // 或: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{format}
    const urlPattern = /\/upload\/v\d+\/(.+?)\.(jpg|jpeg|png|webp|gif|mp4|pdf|svg|ico)/i
    let match = url.match(urlPattern)

    if (match && match[1]) {
      return match[1]
    }

    // 如果没有版本号，尝试匹配转换参数后的 public_id
    const urlPattern2 = /\/upload\/(?:.+?,)*([^\/]+?)\.(jpg|jpeg|png|webp|gif|mp4|pdf|svg|ico)/i
    match = url.match(urlPattern2)

    if (match && match[1]) {
      // 如果匹配到的是转换参数而不是 public_id，尝试更精确的匹配
      const parts = match[1].split('/')
      const lastPart = parts[parts.length - 1]
      
      // 如果最后部分包含下划线或数字，可能是 public_id
      if (lastPart.match(/[a-zA-Z0-9_-]+/)) {
        return lastPart
      }
    }

    // 最后的尝试：直接提取最后一个路径段
    const urlPattern3 = /\/([^\/]+?)\.(jpg|jpeg|png|webp|gif|mp4|pdf|svg|ico)(?:\?|$)/i
    match = url.match(urlPattern3)

    if (match && match[1]) {
      return match[1]
    }

    return null
  } catch (error) {
    return null
  }
}

