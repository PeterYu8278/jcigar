// 雪茄评分 Crown Badge 组件
import React from 'react'
import { CrownOutlined } from '@ant-design/icons'

interface CigarRatingBadgeProps {
  rating?: number | null
  size?: 'small' | 'medium' | 'large'
}

export const CigarRatingBadge: React.FC<CigarRatingBadgeProps> = ({ 
  rating, 
  size = 'medium' 
}) => {
  // 如果没有 rating 数据，不显示 badge
  if (!rating || rating === 0) {
    return null
  }

  // 根据 size 设置样式
  const sizeStyles = {
    small: {
      iconSize: 12,
      fontSize: 10,
      padding: '2px 4px',
      top: '-4px',
      right: '-4px'
    },
    medium: {
      iconSize: 16,
      fontSize: 12,
      padding: '3px 6px',
      top: '-6px',
      right: '-6px'
    },
    large: {
      iconSize: 20,
      fontSize: 14,
      padding: '4px 8px',
      top: '-8px',
      right: '-8px'
    }
  }

  const style = sizeStyles[size]

  return (
    <div
      style={{
        position: 'absolute',
        top: style.top,
        right: style.right,
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        background: 'linear-gradient(135deg, #FDE08D, #C48D3A)',
        borderRadius: '12px',
        padding: style.padding,
        boxShadow: '0 2px 8px rgba(255, 215, 0, 0.4)',
        zIndex: 10,
        border: '1px solid rgba(184, 134, 11, 0.6)'
      }}
    >
      <CrownOutlined 
        style={{ 
          fontSize: style.iconSize, 
          color: '#1a1a1a',
          display: 'flex',
          alignItems: 'center'
        }} 
      />
      <span
        style={{
          fontSize: style.fontSize,
          fontWeight: 700,
          color: '#1a1a1a',
          lineHeight: 1
        }}
      >
        {rating}
      </span>
    </div>
  )
}

