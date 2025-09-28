// Cloudinary React Hook
import { useState, useCallback } from 'react'
import { uploadFile, deleteFile } from '../services/cloudinary'
import type { UploadResult, UploadOptions } from '../services/cloudinary'

export interface UseCloudinaryReturn {
  upload: (file: File | string, options?: UploadOptions) => Promise<UploadResult>
  delete: (publicId: string) => Promise<boolean>
  uploading: boolean
  error: string | null
}

export const useCloudinary = (): UseCloudinaryReturn => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (
    file: File | string,
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

  const deleteFileById = useCallback(async (publicId: string): Promise<boolean> => {
    setError(null)
    
    try {
      const result = await deleteFile(publicId)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除失败'
      setError(errorMessage)
      return false
    }
  }, [])

  return {
    upload,
    delete: deleteFileById,
    uploading,
    error
  }
}
