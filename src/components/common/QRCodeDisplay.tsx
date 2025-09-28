// QR Code 显示组件
import React from 'react'
import { Spin, Alert } from 'antd'
import { QrcodeOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

interface QRCodeDisplayProps {
  qrCodeDataURL: string | null
  loading?: boolean
  error?: string | null
  size?: number
  className?: string
  style?: React.CSSProperties
  showPlaceholder?: boolean
}

/**
 * QR Code 显示组件
 * @param props 组件属性
 * @returns JSX.Element
 */
export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  qrCodeDataURL,
  loading = false,
  error = null,
  size = 64,
  className = '',
  style = {},
  showPlaceholder = true
}) => {
  const { t } = useTranslation()
  // 加载状态
  if (loading) {
    return (
      <div 
        className={className}
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: 6,
          ...style
        }}
      >
        <Spin size="small" />
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div 
        className={className}
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: 6,
          ...style
        }}
      >
        <QrcodeOutlined style={{ fontSize: size * 0.5, color: '#ff4d4f' }} />
      </div>
    )
  }

  // 有QR Code数据
  if (qrCodeDataURL) {
    return (
      <div 
        className={className}
        style={{
          background: 'rgba(255,255,255,1)',
          padding: 3,
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          border: '1px solid #e5e5e5',
          ...style
        }}
      >
        <img
          alt={t('common.memberQRCode')}
          src={qrCodeDataURL}
          style={{ 
            width: size, 
            height: size,
            display: 'block'
          }}
        />
      </div>
    )
  }

  // 占位符
  if (showPlaceholder) {
    return (
      <div 
        className={className}
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          border: '1px solid #e5e5e5',
          ...style
        }}
      >
        <QrcodeOutlined style={{ fontSize: size * 0.5, color: '#d9d9d9' }} />
      </div>
    )
  }

  return null
}
