// Cloudinary Create 服务 - 上传文件

import { getCloudinaryConfig, getCloudinaryUploadUrl, generateUniqueFileName, isValidFileType, isValidFileSize } from './config'
import type { CloudinaryResource, UploadOptions, ResourceType, ValidationResult } from './types'
import { CloudinaryError } from './types'

/**
 * 验证上传文件
 */
export const validateUploadFile = (file: File, options: UploadOptions): ValidationResult => {
  // 检查文件大小
  if (options.maxBytes && !isValidFileSize(file, options.maxBytes)) {
    return {
      valid: false,
      error: `文件大小不能超过 ${(options.maxBytes / 1024 / 1024).toFixed(2)}MB`
    }
  }

  // 检查文件类型
  const allowedFormats = options.allowedFormats || ['jpg', 'jpeg', 'png', 'webp', 'gif']
  if (!isValidFileType(file, allowedFormats)) {
    return {
      valid: false,
      error: `不支持的文件格式。支持的格式: ${allowedFormats.join(', ')}`
    }
  }

  // 检查是否为图片文件（如果不是视频或原始文件）
  const resourceType = options.resourceType || 'image'
  if (resourceType === 'image' && !file.type.startsWith('image/')) {
    return {
      valid: false,
      error: '请选择图片文件'
    }
  }

  return { valid: true }
}

/**
 * 构建上传表单数据
 */
const buildUploadFormData = (
  file: File,
  options: UploadOptions,
  config: ReturnType<typeof getCloudinaryConfig>
): FormData => {
  const formData = new FormData()
  
  // 添加文件
  formData.append('file', file)
  
  // 添加上传预设
  formData.append('upload_preset', config.uploadPreset)
  
  // 生成公共 ID（如果未提供）
  const publicId = options.publicId || (() => {
    const folder = options.folder || config.baseFolder
    const uniqueFileName = generateUniqueFileName(file.name)
    return `${folder}/${uniqueFileName}`
  })()
  
  // 使用 public_id 参数指定完整路径，这样可以覆盖 Asset folder 设置
  formData.append('public_id', publicId)
  
  // 可选参数
  if (options.tags && options.tags.length > 0) {
    formData.append('tags', options.tags.join(','))
  }
  
  if (options.context) {
    Object.entries(options.context).forEach(([key, value]) => {
      formData.append(`context[${key}]`, value)
    })
  }
  
  if (options.overwrite !== undefined) {
    formData.append('overwrite', String(options.overwrite))
  }
  
  if (options.useFilename !== undefined) {
    formData.append('use_filename', String(options.useFilename))
  }
  
  if (options.uniqueFilename !== undefined) {
    formData.append('unique_filename', String(options.uniqueFilename))
  }
  
  // 转换参数（如果提供）
  // 注意：未签名上传不支持直接使用 format 参数，必须通过 transformation 指定
  const transformations: string[] = []
  
  if (options.transformation) {
    const transformation = options.transformation
    
    if (transformation.width) transformations.push(`w_${transformation.width}`)
    if (transformation.height) transformations.push(`h_${transformation.height}`)
    if (transformation.crop) transformations.push(`c_${transformation.crop}`)
    if (transformation.gravity) transformations.push(`g_${transformation.gravity}`)
    if (transformation.quality) {
      const quality = transformation.quality === 'auto' ? 'auto' : transformation.quality
      transformations.push(`q_${quality}`)
    }
    // 优先使用 fetchFormat，如果没有则使用 format
    if (transformation.fetchFormat) {
      transformations.push(`f_${transformation.fetchFormat}`)
    } else if (transformation.format) {
      transformations.push(`f_${transformation.format}`)
    }
    if (transformation.angle) transformations.push(`a_${transformation.angle}`)
    if (transformation.opacity) transformations.push(`o_${transformation.opacity}`)
    if (transformation.radius) transformations.push(`r_${transformation.radius}`)
    if (transformation.effect) transformations.push(`e_${transformation.effect}`)
    if (transformation.background) transformations.push(`b_${transformation.background}`)
  }
  
  // 如果 options.format 存在但 transformation 中没有指定格式，通过 transformation 添加
  if (options.format && !transformations.some(t => t.startsWith('f_'))) {
    transformations.push(`f_${options.format}`)
  }
  
  // 如果有转换参数，添加到表单数据
  if (transformations.length > 0) {
    formData.append('transformation', transformations.join(','))
  }
  
  return formData
}

/**
 * 上传文件到 Cloudinary
 * @param file 要上传的文件
 * @param options 上传选项
 * @returns Promise<CloudinaryResource>
 */
export const uploadFile = async (
  file: File,
  options: UploadOptions = {}
): Promise<CloudinaryResource> => {
  try {
    // 验证文件
    const validation = validateUploadFile(file, options)
    if (!validation.valid) {
      throw new CloudinaryError(validation.error || '文件验证失败', 'VALIDATION_ERROR')
    }

    // 获取配置
    const config = getCloudinaryConfig()
    const resourceType = options.resourceType || 'image'

    // 构建表单数据
    const formData = buildUploadFormData(file, options, config)

    // 上传文件
    const uploadUrl = getCloudinaryUploadUrl(config, resourceType)
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new CloudinaryError(
        errorData.error?.message || '上传失败',
        errorData.error?.name || 'UPLOAD_ERROR',
        response.status,
        errorData
      )
    }

    const result = await response.json()

    // 转换为标准格式
    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      width: result.width || 0,
      height: result.height || 0,
      format: result.format,
      bytes: result.bytes || 0,
      resource_type: result.resource_type || resourceType,
      created_at: result.created_at || new Date().toISOString(),
      folder: result.folder,
      tags: result.tags,
      context: result.context
    }
  } catch (error) {
    if (error instanceof CloudinaryError) {
      throw error
    }
    throw new CloudinaryError(
      error instanceof Error ? error.message : '文件上传失败，请重试',
      'UNKNOWN_ERROR',
      500,
      error
    )
  }
}

/**
 * 上传 base64 字符串
 * @param base64String base64 编码的字符串（data URL 格式）
 * @param options 上传选项
 * @returns Promise<CloudinaryResource>
 */
export const uploadBase64 = async (
  base64String: string,
  options: UploadOptions = {}
): Promise<CloudinaryResource> => {
  try {
    // 获取配置
    const config = getCloudinaryConfig()
    const resourceType = options.resourceType || 'image'

    // 构建表单数据
    const formData = new FormData()
    formData.append('file', base64String)
    formData.append('upload_preset', config.uploadPreset)

    // 生成公共 ID（如果未提供）
    if (options.publicId) {
      formData.append('public_id', options.publicId)
    } else {
      const folder = options.folder || config.baseFolder
      const uniqueFileName = generateUniqueFileName()
      formData.append('public_id', `${folder}/${uniqueFileName}`)
    }

    // 可选参数（与 uploadFile 类似）
    if (options.tags && options.tags.length > 0) {
      formData.append('tags', options.tags.join(','))
    }

    if (options.context) {
      Object.entries(options.context).forEach(([key, value]) => {
        formData.append(`context[${key}]`, value)
      })
    }

    // 上传文件
    const uploadUrl = getCloudinaryUploadUrl(config, resourceType)
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new CloudinaryError(
        errorData.error?.message || '上传失败',
        errorData.error?.name || 'UPLOAD_ERROR',
        response.status,
        errorData
      )
    }

    const result = await response.json()

    // 转换为标准格式
    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      width: result.width || 0,
      height: result.height || 0,
      format: result.format,
      bytes: result.bytes || 0,
      resource_type: result.resource_type || resourceType,
      created_at: result.created_at || new Date().toISOString(),
      folder: result.folder,
      tags: result.tags,
      context: result.context
    }
  } catch (error) {
    if (error instanceof CloudinaryError) {
      throw error
    }
    throw new CloudinaryError(
      error instanceof Error ? error.message : '文件上传失败，请重试',
      'UNKNOWN_ERROR',
      500,
      error
    )
  }
}

