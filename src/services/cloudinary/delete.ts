// Cloudinary Delete 服务 - 删除资源
// 注意：删除功能需要 Admin API 和签名，通常在服务器端使用
// 这里提供基础实现，提示需要通过后端 API 实现

import { getCloudinaryConfig, getCloudinaryDeleteUrl } from './config'
import type { DeleteOptions, DeleteResult, BulkDeleteOptions, BulkDeleteResult, ResourceType } from './types'
import { CloudinaryError } from './types'

/**
 * 生成 SHA-1 哈希（浏览器端实现）
 */
const sha1 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * 删除单个资源
 * 注意：此功能在浏览器端实现，需要 API Secret（不推荐，但可以使用）
 * 生产环境建议通过后端 API 代理删除请求以确保安全性
 * @param publicId 资源的 public_id
 * @param options 删除选项
 * @returns Promise<DeleteResult>
 */
export const deleteResource = async (
  publicId: string,
  options: DeleteOptions = {}
): Promise<DeleteResult> => {
  try {
    if (!publicId) {
      throw new CloudinaryError('public_id 不能为空', 'INVALID_PUBLIC_ID', 400)
    }

    const config = getCloudinaryConfig()
    const resourceType = options.resourceType || 'image'

    // 生成时间戳
    const timestamp = Math.round(Date.now() / 1000)

    // 构建参数字典（用于签名和 formData）
    const params: { [key: string]: string } = {
      public_id: publicId,
      timestamp: timestamp.toString()
    }

    // 如果设置了 invalidate，添加到参数中
    if (options.invalidate) {
      params.invalidate = 'true'
    }

    // 按字母顺序排序参数，构建签名字符串
    const sortedKeys = Object.keys(params).sort()
    const stringToSign = sortedKeys
      .map(key => `${key}=${params[key]}`)
      .join('&') + config.apiSecret

    // 生成 SHA-1 签名
    const signature = await sha1(stringToSign)

    // 构建删除请求
    const formData = new FormData()
    formData.append('public_id', publicId)
    formData.append('timestamp', timestamp.toString())
    formData.append('api_key', config.apiKey)
    formData.append('signature', signature)

    // 添加其他参数（如 invalidate）
    if (options.invalidate) {
      formData.append('invalidate', 'true')
    }

    // 调用删除 API
    const deleteUrl = getCloudinaryDeleteUrl(config, resourceType)
    const response = await fetch(deleteUrl, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new CloudinaryError(
        errorData.error?.message || '删除失败',
        errorData.error?.name || 'DELETE_ERROR',
        response.status,
        errorData
      )
    }

    const result = await response.json()

    if (result.result === 'ok') {
      return {
        result: 'ok',
        public_id: result.public_id || publicId
      }
    } else if (result.result === 'not found') {
      return {
        result: 'not found',
        public_id: publicId
      }
    } else {
      throw new CloudinaryError(
        result.error?.message || '删除失败',
        result.error?.name || 'DELETE_ERROR',
        response.status,
        result
      )
    }
  } catch (error) {
    if (error instanceof CloudinaryError) {
      throw error
    }
    throw new CloudinaryError(
      error instanceof Error ? error.message : '删除资源失败',
      'DELETE_ERROR',
      500,
      error
    )
  }
}

/**
 * 批量删除资源
 * 注意：此功能需要 Admin API 和签名，通常在服务器端使用
 * @param options 批量删除选项
 * @returns Promise<BulkDeleteResult>
 */
export const deleteResources = async (
  options: BulkDeleteOptions
): Promise<BulkDeleteResult> => {
  try {
    // 警告：删除功能需要在服务器端实现，以确保安全性
    console.warn('⚠️ 批量删除功能建议在服务器端实现，以确保 API Secret 安全')

    // 注意：批量删除 API 需要签名，无法在浏览器端直接调用
    // 如果需要在浏览器端删除，请通过后端 API 代理
    throw new CloudinaryError(
      'deleteResources 功能需要 Admin API 签名，请在服务器端实现。建议通过后端 API 代理删除请求。',
      'NOT_SUPPORTED_IN_BROWSER',
      501
    )
  } catch (error) {
    if (error instanceof CloudinaryError) {
      throw error
    }
    throw new CloudinaryError(
      error instanceof Error ? error.message : '批量删除资源失败',
      'BULK_DELETE_ERROR',
      500,
      error
    )
  }
}

/**
 * 删除文件夹（包括文件夹中的所有资源）
 * 注意：此功能需要 Admin API 和签名，通常在服务器端使用
 * @param folderPath 文件夹路径
 * @param options 删除选项
 * @returns Promise<DeleteResult>
 */
export const deleteFolder = async (
  folderPath: string,
  options: DeleteOptions = {}
): Promise<DeleteResult> => {
  try {
    // 警告：删除功能需要在服务器端实现，以确保安全性
    console.warn('⚠️ 删除文件夹功能建议在服务器端实现，以确保 API Secret 安全')

    // 注意：删除文件夹 API 需要签名，无法在浏览器端直接调用
    // 如果需要在浏览器端删除，请通过后端 API 代理
    throw new CloudinaryError(
      'deleteFolder 功能需要 Admin API 签名，请在服务器端实现。建议通过后端 API 代理删除请求。',
      'NOT_SUPPORTED_IN_BROWSER',
      501
    )
  } catch (error) {
    if (error instanceof CloudinaryError) {
      throw error
    }
    throw new CloudinaryError(
      error instanceof Error ? error.message : '删除文件夹失败',
      'DELETE_FOLDER_ERROR',
      500,
      error
    )
  }
}

/**
 * 服务器端删除资源（示例实现，需要在后端使用）
 * 此函数展示了如何在服务器端实现删除功能
 * @param publicId 资源的 public_id
 * @param resourceType 资源类型
 * @param config Cloudinary 配置（包含 apiSecret）
 * @returns Promise<DeleteResult>
 */
export const deleteResourceServerSide = async (
  publicId: string,
  resourceType: ResourceType = 'image',
  config: { cloudName: string; apiKey: string; apiSecret: string }
): Promise<DeleteResult> => {
  // 此函数需要在服务器端实现
  // 示例代码（Node.js）：
  /*
  const crypto = require('crypto')
  const timestamp = Math.round(Date.now() / 1000)
  const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${config.apiSecret}`
  const signature = crypto.createHash('sha1').update(stringToSign).digest('hex')
  
  const formData = new FormData()
  formData.append('public_id', publicId)
  formData.append('timestamp', timestamp.toString())
  formData.append('api_key', config.apiKey)
  formData.append('signature', signature)
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/destroy`,
    {
      method: 'POST',
      body: formData
    }
  )
  
  return await response.json()
  */
  
  throw new CloudinaryError(
    '此函数需要在服务器端实现。请参考注释中的示例代码。',
    'SERVER_SIDE_ONLY',
    501
  )
}



