// Cloudinary Update 服务 - 更新资源信息
// 注意：完整的 Admin API 功能（如更新标签、上下文）需要服务器端签名
// 这里提供基础实现和通过 URL 转换的"更新"功能

import { getCloudinaryConfig } from './config'
import type { UpdateResourceOptions, RenameResourceOptions, ResourceType } from './types'
import { CloudinaryError } from './types'

/**
 * 更新资源元数据（标签、上下文等）
 * 注意：此功能需要 Admin API 和签名，通常在服务器端使用
 * @param publicId 资源的 public_id
 * @param options 更新选项
 * @returns Promise<void>
 */
export const updateResource = async (
  publicId: string,
  options: UpdateResourceOptions = {}
): Promise<void> => {
  // 此功能需要 Admin API 和签名，无法在浏览器端直接实现
  // 建议通过后端 API 实现
  throw new CloudinaryError(
    'updateResource 功能需要 Admin API，请在服务器端实现',
    'NOT_SUPPORTED_IN_BROWSER',
    501
  )
}

/**
 * 重命名资源
 * 注意：此功能需要 Admin API 和签名，通常在服务器端使用
 * @param fromPublicId 原始 public_id
 * @param toPublicId 新的 public_id
 * @param options 重命名选项
 * @returns Promise<{ public_id: string }>
 */
export const renameResource = async (
  fromPublicId: string,
  toPublicId: string,
  options: RenameResourceOptions = {}
): Promise<{ public_id: string }> => {
  // 此功能需要 Admin API 和签名，无法在浏览器端直接实现
  // 建议通过后端 API 实现
  throw new CloudinaryError(
    'renameResource 功能需要 Admin API，请在服务器端实现',
    'NOT_SUPPORTED_IN_BROWSER',
    501
  )
}

/**
 * 通过转换创建新的资源变体（类似更新）
 * 这是一个变通方案，通过应用转换来创建资源的"更新版本"
 * @param publicId 资源的 public_id
 * @param transformationOptions 转换选项
 * @param resourceType 资源类型
 * @returns 转换后的资源 URL
 */
export const transformResource = (
  publicId: string,
  transformationOptions: {
    width?: number
    height?: number
    crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'limit' | 'pad'
    gravity?: 'center' | 'face' | 'auto' | 'north' | 'south' | 'east' | 'west'
    quality?: 'auto' | 'best' | 'good' | 'eco' | 'low' | number
    format?: 'auto' | 'jpg' | 'png' | 'webp' | 'gif'
    angle?: number
    opacity?: number
    radius?: number | string
    effect?: string
    background?: string
    [key: string]: any
  },
  resourceType: ResourceType = 'image'
): string => {
  try {
    const config = getCloudinaryConfig()
    const protocol = config.secure ? 'https' : 'http'
    let url = `${protocol}://res.cloudinary.com/${config.cloudName}/${resourceType}/upload`

    // 构建转换参数
    const transformations: string[] = []

    if (transformationOptions.width) transformations.push(`w_${transformationOptions.width}`)
    if (transformationOptions.height) transformations.push(`h_${transformationOptions.height}`)
    if (transformationOptions.crop) transformations.push(`c_${transformationOptions.crop}`)
    if (transformationOptions.gravity) transformations.push(`g_${transformationOptions.gravity}`)
    if (transformationOptions.quality) {
      const quality = transformationOptions.quality === 'auto' ? 'auto' : transformationOptions.quality
      transformations.push(`q_${quality}`)
    }
    if (transformationOptions.format && transformationOptions.format !== 'auto') {
      transformations.push(`f_${transformationOptions.format}`)
    }
    if (transformationOptions.angle) transformations.push(`a_${transformationOptions.angle}`)
    if (transformationOptions.opacity) transformations.push(`o_${transformationOptions.opacity}`)
    if (transformationOptions.radius) transformations.push(`r_${transformationOptions.radius}`)
    if (transformationOptions.effect) transformations.push(`e_${transformationOptions.effect}`)
    if (transformationOptions.background) transformations.push(`b_${transformationOptions.background}`)

    // 添加其他转换参数
    Object.entries(transformationOptions).forEach(([key, value]) => {
      if (!['width', 'height', 'crop', 'gravity', 'quality', 'format', 'angle', 'opacity', 'radius', 'effect', 'background'].includes(key) && value) {
        // 支持自定义转换参数
        transformations.push(`${key}_${value}`)
      }
    })

    // 添加转换参数到 URL
    if (transformations.length > 0) {
      url += `/${transformations.join(',')}`
    }

    // 添加 public_id
    url += `/${publicId}`

    return url
  } catch (error) {
    throw new CloudinaryError(
      error instanceof Error ? error.message : '转换资源失败',
      'TRANSFORM_ERROR',
      500,
      error
    )
  }
}

/**
 * 添加标签到资源
 * 注意：此功能需要 Admin API，通常在服务器端使用
 * @param publicId 资源的 public_id
 * @param tags 要添加的标签列表
 * @param resourceType 资源类型
 * @returns Promise<void>
 */
export const addTagsToResource = async (
  publicId: string,
  tags: string[],
  resourceType: ResourceType = 'image'
): Promise<void> => {
  throw new CloudinaryError(
    'addTagsToResource 功能需要 Admin API，请在服务器端实现',
    'NOT_SUPPORTED_IN_BROWSER',
    501
  )
}

/**
 * 移除资源标签
 * 注意：此功能需要 Admin API，通常在服务器端使用
 * @param publicId 资源的 public_id
 * @param tags 要移除的标签列表
 * @param resourceType 资源类型
 * @returns Promise<void>
 */
export const removeTagsFromResource = async (
  publicId: string,
  tags: string[],
  resourceType: ResourceType = 'image'
): Promise<void> => {
  throw new CloudinaryError(
    'removeTagsFromResource 功能需要 Admin API，请在服务器端实现',
    'NOT_SUPPORTED_IN_BROWSER',
    501
  )
}

/**
 * 设置资源上下文信息
 * 注意：此功能需要 Admin API，通常在服务器端使用
 * @param publicId 资源的 public_id
 * @param context 上下文信息
 * @param resourceType 资源类型
 * @returns Promise<void>
 */
export const setResourceContext = async (
  publicId: string,
  context: Record<string, string>,
  resourceType: ResourceType = 'image'
): Promise<void> => {
  throw new CloudinaryError(
    'setResourceContext 功能需要 Admin API，请在服务器端实现',
    'NOT_SUPPORTED_IN_BROWSER',
    501
  )
}

