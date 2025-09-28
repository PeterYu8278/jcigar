// Cloudinary 上传服务
import cloudinary from './config'

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
      // 上传 File 对象 - 需要转换为 base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
      })
      reader.readAsDataURL(file)
      const base64String = await base64Promise
      result = await cloudinary.uploader.upload(base64String, uploadOptions)
    } else {
      // 上传 base64 字符串
      result = await cloudinary.uploader.upload(file, uploadOptions)
    }

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
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
    const result = await cloudinary.uploader.destroy(publicId)
    return result.result === 'ok'
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

  return cloudinary.url(publicId, {
    width,
    height,
    quality,
    format,
    crop,
    gravity,
    secure: true
  })
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
