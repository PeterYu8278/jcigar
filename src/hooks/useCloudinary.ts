// Cloudinary React Hook
import { useState, useCallback } from 'react'
import { uploadFile } from '../services/cloudinary'
import type { UploadResult, UploadOptions } from '../services/cloudinary'

export interface UseCloudinaryReturn {
  upload: (file: File, options?: UploadOptions) => Promise<UploadResult>
  uploading: boolean
  error: string | null
}

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
      return result
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
