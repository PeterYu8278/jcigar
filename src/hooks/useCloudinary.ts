// Cloudinary React Hook
import { useState, useCallback } from 'react'
import { uploadFile, type CloudinaryResource, type UploadOptions } from '../services/cloudinary'
import type { UploadResult } from '../services/cloudinary'

/**
 * 将 CloudinaryResource 转换为 UploadResult（向后兼容）
 */
const toUploadResult = (resource: CloudinaryResource): UploadResult => ({
  public_id: resource.public_id,
  secure_url: resource.secure_url,
  width: resource.width,
  height: resource.height,
  format: resource.format,
  bytes: resource.bytes
})

export interface UseCloudinaryReturn {
  /** 上传文件 */
  upload: (file: File, options?: UploadOptions) => Promise<UploadResult>
  /** 上传状态 */
  uploading: boolean
  /** 错误信息 */
  error: string | null
}

/**
 * Cloudinary React Hook
 * 提供文件上传功能和状态管理
 */
export const useCloudinary = (): UseCloudinaryReturn => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (
    file: File,
    options?: UploadOptions
  ): Promise<UploadResult> => {
    setUploading(true)
    setError(null)
    
    try {
      const result = await uploadFile(file, options)
      // 转换为向后兼容的格式
      return toUploadResult(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '上传失败'
      setError(errorMessage)
      throw err
    } finally {
      setUploading(false)
    }
  }, [])

  return {
    upload,
    uploading,
    error
  }
}
