// Cloudinary Read 服务 - 获取资源信息和列表
// 注意：完整的 Admin API 功能（如 listResources, getResource）需要服务器端签名
// 这里提供基础实现，主要用于获取已上传资源的信息

import { getCloudinaryConfig } from './config'
import type { CloudinaryResource, GetResourceOptions, ListResourcesOptions, ListResourcesResult } from './types'
import { CloudinaryError } from './types'

/**
 * 从 URL 解析资源信息
 * @param url Cloudinary URL
 * @returns 解析的资源信息
 */
export const parseResourceFromUrl = (url: string): Partial<CloudinaryResource> | null => {
  try {
    // Cloudinary URL 格式: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{format}
    const urlPattern = /https?:\/\/res\.cloudinary\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(?:v\d+\/)?(?:.+\/)?([^?]+)/
    const match = url.match(urlPattern)

    if (!match) {
      return null
    }

    const [, cloudName, resourceType, action, pathAndFormat] = match
    const parts = pathAndFormat.split('.')
    const format = parts.length > 1 ? parts.pop() : 'unknown'
    const publicId = parts.join('.')

    return {
      public_id: publicId,
      secure_url: url,
      url: url.replace('https://', 'http://'),
      resource_type: resourceType as 'image' | 'video' | 'raw',
      format
    }
  } catch (error) {
    return null
  }
}

/**
 * 从 secure_url 获取 public_id
 * @param secureUrl Cloudinary secure URL
 * @returns public_id
 */
export const extractPublicIdFromUrl = (secureUrl: string): string | null => {
  try {
    // 提取 public_id 和版本号
    // URL 格式: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
    const urlPattern = /\/upload\/v\d+\/(.+)\.(jpg|jpeg|png|webp|gif|mp4|pdf)/
    const match = secureUrl.match(urlPattern)

    if (match && match[1]) {
      return match[1]
    }

    // 如果没有版本号，尝试其他格式
    const urlPattern2 = /\/upload\/(?:.+\/)?(.+)\.(jpg|jpeg|png|webp|gif|mp4|pdf)/
    const match2 = secureUrl.match(urlPattern2)

    if (match2 && match2[1]) {
      return match2[1]
    }

    return null
  } catch (error) {
    return null
  }
}

/**
 * 验证资源是否存在（通过尝试访问 URL）
 * @param publicId 资源的 public_id
 * @param resourceType 资源类型
 * @returns Promise<boolean>
 */
export const checkResourceExists = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<boolean> => {
  try {
    const config = getCloudinaryConfig()
    const protocol = config.secure ? 'https' : 'http'
    const url = `${protocol}://res.cloudinary.com/${config.cloudName}/${resourceType}/upload/${publicId}`

    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch (error) {
    return false
  }
}

/**
 * 获取资源 URL（如果提供的是 public_id）
 * @param publicIdOrUrl public_id 或完整的 URL
 * @param transformationOptions 转换选项
 * @returns 资源的 URL
 */
export const getResourceUrl = (
  publicIdOrUrl: string,
  transformationOptions?: any
): string => {
  // 如果已经是完整的 URL，直接返回
  if (publicIdOrUrl.startsWith('http://') || publicIdOrUrl.startsWith('https://')) {
    return publicIdOrUrl
  }

  // 如果是 public_id，构建 URL
  const config = getCloudinaryConfig()
  const protocol = config.secure ? 'https' : 'http'
  let url = `${protocol}://res.cloudinary.com/${config.cloudName}/image/upload`

  // 添加转换参数（如果提供）
  if (transformationOptions) {
    const transformations: string[] = []
    if (transformationOptions.width) transformations.push(`w_${transformationOptions.width}`)
    if (transformationOptions.height) transformations.push(`h_${transformationOptions.height}`)
    if (transformationOptions.crop) transformations.push(`c_${transformationOptions.crop}`)
    if (transformationOptions.gravity) transformations.push(`g_${transformationOptions.gravity}`)
    if (transformationOptions.quality) transformations.push(`q_${transformationOptions.quality}`)
    if (transformationOptions.format) transformations.push(`f_${transformationOptions.format}`)

    if (transformations.length > 0) {
      url += `/${transformations.join(',')}`
    }
  }

  url += `/${publicIdOrUrl}`

  return url
}

/**
 * 获取资源信息
 * 注意：此函数需要 Admin API，通常在服务器端使用
 * 这里提供一个基于 URL 的简化版本
 * @param publicId 资源的 public_id
 * @param options 获取选项
 * @returns Promise<CloudinaryResource | null>
 */
export const getResource = async (
  publicId: string,
  options: GetResourceOptions = {}
): Promise<CloudinaryResource | null> => {
  try {
    // 由于需要 Admin API 签名，这里只能提供基础验证
    const resourceType = options.resourceType === 'auto' ? undefined : options.resourceType
    const exists = await checkResourceExists(publicId, resourceType)
    if (!exists) {
      return null
    }

    // 构建基础资源信息（无法获取完整信息，需要 Admin API）
    const url = getResourceUrl(publicId)
    const parsed = parseResourceFromUrl(url)

    return {
      public_id: publicId,
      secure_url: url,
      url: url.replace('https://', 'http://'),
      width: 0,
      height: 0,
      format: parsed?.format || 'unknown',
      bytes: 0,
      resource_type: options.resourceType || 'image',
      created_at: new Date().toISOString()
    }
  } catch (error) {
    throw new CloudinaryError(
      error instanceof Error ? error.message : '获取资源信息失败',
      'GET_RESOURCE_ERROR',
      500,
      error
    )
  }
}

/**
 * 列出资源
 * 注意：此功能需要 Admin API，通常在服务器端使用
 * 这里提供一个占位实现，提示需要使用服务器端 API
 * @param options 列表选项
 * @returns Promise<ListResourcesResult>
 */
export const listResources = async (
  options: ListResourcesOptions = {}
): Promise<ListResourcesResult> => {
  // 此功能需要 Admin API 和签名，无法在浏览器端直接实现
  // 建议通过后端 API 实现
  throw new CloudinaryError(
    'listResources 功能需要 Admin API，请在服务器端实现',
    'NOT_SUPPORTED_IN_BROWSER',
    501
  )
}

