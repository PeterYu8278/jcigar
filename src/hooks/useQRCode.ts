// QR Code Hook
import { useState, useEffect, useCallback } from 'react'
import { generateMemberCardQRCode } from '../utils/qrCodeGenerator'

interface UseQRCodeOptions {
  memberId?: string
  memberName?: string
  autoGenerate?: boolean
}

interface UseQRCodeReturn {
  qrCodeDataURL: string | null
  loading: boolean
  error: string | null
  generateQRCode: (memberId: string, memberName?: string) => Promise<void>
  clearQRCode: () => void
}

/**
 * QR Code生成Hook
 * @param options 配置选项
 * @returns QR Code相关状态和方法
 */
export const useQRCode = (options: UseQRCodeOptions = {}): UseQRCodeReturn => {
  const { memberId, memberName, autoGenerate = true } = options
  
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateQRCode = useCallback(async (id: string, name?: string) => {
    if (!id) {
      setError('会员ID不能为空')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const qrCode = await generateMemberCardQRCode(id, name)
      setQrCodeDataURL(qrCode)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '生成QR Code失败'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearQRCode = useCallback(() => {
    setQrCodeDataURL(null)
    setError(null)
  }, [])

  // 自动生成QR Code
  useEffect(() => {
    if (autoGenerate && memberId) {
      generateQRCode(memberId, memberName)
    }
  }, [memberId, memberName, autoGenerate, generateQRCode])

  return {
    qrCodeDataURL,
    loading,
    error,
    generateQRCode,
    clearQRCode
  }
}
