// 简化的 Cloudinary 上传服务
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
  max_bytes?: number
}

const CLOUD_NAME = 'dy2zb1n41'
const UPLOAD_PRESET = 'jep-cigar' // 您的上传预设名称

/**
 * 上传文件到 Cloudinary（无签名上传）
 * @param file 要上传的文件
 * @param options 上传选项
 * @returns Promise<UploadResult>
 */
export const uploadFile = async (
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  try {
    const {
      folder = 'jep-cigar',
      max_bytes = 10 * 1024 * 1024 // 10MB
    } = options

    // 检查文件大小
    if (file.size > max_bytes) {
      throw new Error(`文件大小不能超过 ${max_bytes / 1024 / 1024}MB`)
    }

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      throw new Error('请选择图片文件')
    }

    // 创建 FormData
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    
    // 生成唯一的文件名（基于时间戳和随机字符串）
    // Cloudinary 会自动添加文件扩展名，所以 public_id 不需要包含扩展名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const uniqueFileName = `${timestamp}_${randomStr}`
    
    // 使用 public_id 参数指定完整路径，这样可以覆盖 Asset folder 设置
    // public_id 应该包含完整路径，如 'jep-cigar/brands/unique-id'（不包含扩展名）
    // 这样即使 Asset folder 设置为 'jep-cigar'，文件也会存储在正确的子文件夹中
    const publicId = `${folder}/${uniqueFileName}`
    formData.append('public_id', publicId)

    // 上传到 Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || '上传失败')
    }

    const result = await response.json()

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '文件上传失败，请重试')
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
  let url = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`
  
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
