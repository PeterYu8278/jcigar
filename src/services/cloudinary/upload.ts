// Cloudinary 上传服务
import { cloudinaryConfig, loadCloudinary } from './config'

export interface UploadResult {
  public_id: string
  secure_url: string
  width: number
  height: number
  format: string
  bytes: number
}

export interface UploadOptions {
  folder?: string
  transformation?: any
  resource_type?: 'image' | 'video' | 'raw' | 'auto'
  allowed_formats?: string[]
  max_bytes?: number
}

/**
 * 上传文件到 Cloudinary
 * @param file 要上传的文件
 * @param options 上传选项
 * @returns Promise<UploadResult>
 */
export const uploadFile = async (
  file: File | string, // File 对象或 base64 字符串
  options: UploadOptions = {}
): Promise<UploadResult> => {
  try {
    const {
      folder = 'cigar-app',
      transformation = {},
      resource_type = 'image',
      allowed_formats = ['jpg', 'jpeg', 'png', 'webp'],
      max_bytes = 10 * 1024 * 1024 // 10MB
    } = options

    // 如果是 File 对象，检查文件大小
    if (file instanceof File) {
      if (file.size > max_bytes) {
        throw new Error(`文件大小不能超过 ${max_bytes / 1024 / 1024}MB`)
      }
    }

    // 加载 Cloudinary
    const cloudinary = await loadCloudinary()

    // 创建上传预设
    const uploadOptions = {
      folder,
      resource_type,
      allowed_formats,
      transformation: {
        quality: 'auto',
        fetch_format: 'auto',
        ...transformation
      }
    }

    let result
    if (file instanceof File) {
      // 上传 File 对象 - 使用 Cloudinary 的 upload 方法
      result = await new Promise((resolve, reject) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', 'ml_default') // 需要创建无签名上传预设
        formData.append('folder', folder)
        
        fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloud_name}/image/upload`, {
          method: 'POST',
          body: formData
        })
        .then(response => response.json())
        .then(data => resolve(data))
        .catch(error => reject(error))
      })
    } else {
      // 上传 base64 字符串
      result = await new Promise((resolve, reject) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', 'ml_default')
        formData.append('folder', folder)
        
        fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloud_name}/image/upload`, {
          method: 'POST',
          body: formData
        })
        .then(response => response.json())
        .then(data => resolve(data))
        .catch(error => reject(error))
      })
    }

    return {
      public_id: (result as any).public_id,
      secure_url: (result as any).secure_url,
      width: (result as any).width,
      height: (result as any).height,
      format: (result as any).format,
      bytes: (result as any).bytes
    }
  } catch (error) {
    console.error('Cloudinary 上传失败:', error)
    throw new Error('文件上传失败，请重试')
  }
}

/**
 * 删除 Cloudinary 上的文件
 * @param publicId 文件的 public_id
 * @returns Promise<boolean>
 */
export const deleteFile = async (publicId: string): Promise<boolean> => {
  try {
    // 注意：删除文件需要服务器端API密钥，这里只是示例
    // 在实际应用中，应该通过后端API来删除文件
    console.warn('删除文件功能需要在服务器端实现')
    return false
  } catch (error) {
    console.error('Cloudinary 删除失败:', error)
    return false
  }
}

/**
 * 生成图片的优化 URL
 * @param publicId 图片的 public_id
 * @param options 转换选项
 * @returns 优化后的图片 URL
 */
export const getOptimizedImageUrl = (
  publicId: string,
  options: {
    width?: number
    height?: number
    quality?: string | number
    format?: string
    crop?: string
    gravity?: string
  } = {}
): string => {
  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto'
  } = options

  // 构建 Cloudinary URL
  let url = `https://res.cloudinary.com/${cloudinaryConfig.cloud_name}/image/upload`
  
  // 添加转换参数
  const transformations = []
  if (width) transformations.push(`w_${width}`)
  if (height) transformations.push(`h_${height}`)
  if (quality) transformations.push(`q_${quality}`)
  if (format !== 'auto') transformations.push(`f_${format}`)
  if (crop) transformations.push(`c_${crop}`)
  if (gravity) transformations.push(`g_${gravity}`)
  
  if (transformations.length > 0) {
    url += `/${transformations.join(',')}`
  }
  
  url += `/${publicId}`
  
  return url
}

/**
 * 生成缩略图 URL
 * @param publicId 图片的 public_id
 * @param size 缩略图尺寸
 * @returns 缩略图 URL
 */
export const getThumbnailUrl = (
  publicId: string,
  size: number = 150
): string => {
  return getOptimizedImageUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'face'
  })
}

/**
 * 生成品牌 logo URL
 * @param publicId 图片的 public_id
 * @param size logo 尺寸
 * @returns logo URL
 */
export const getBrandLogoUrl = (
  publicId: string,
  size: number = 200
): string => {
  return getOptimizedImageUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'center',
    quality: 'auto',
    format: 'auto'
  })
}
