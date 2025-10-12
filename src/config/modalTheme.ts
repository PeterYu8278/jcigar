/**
 * 统一弹窗主题配置（暗色主题）
 * 提供所有弹窗的一致性UI样式配置
 */

import React from 'react'
import type { ModalProps } from 'antd'

/**
 * 弹窗宽度配置
 */
export const getModalWidth = (isMobile: boolean, defaultWidth: number = 960): number => {
  return isMobile ? undefined as any : defaultWidth
}

/**
 * 弹窗样式主题配置（暗色主题）
 */
export const getModalThemeStyles = (isMobile: boolean, isDarkTheme: boolean = true): ModalProps['styles'] => {
  return {
  body: {
      background: 'rgba(24, 22, 17, 0.95)',
      overflow: 'auto'
  },
  mask: {
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)'
  },
  content: {
      background: 'rgba(24, 22, 17, 0.95)',
      border: '1px solid rgba(244, 175, 37, 0.3)',
      borderRadius: '12px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
  },
  header: {
    background: 'transparent',
      borderBottom: '1px solid rgba(244, 175, 37, 0.2)',
      marginBottom: '16px',
      paddingBottom: '12px'
    }
  }
}

/**
 * 弹窗内容区域样式配置
 */
export const modalContentStyles = {
  section: {
    padding: '16px',
    borderRadius: '12px',
    background: 'rgba(39, 35, 27, 0.5)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(57, 51, 40, 0.7)',
    marginBottom: '16px'
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    marginBottom: '12px',
    margin: '0 0 12px 0'
  } as React.CSSProperties,
  label: {
    color: '#bab09c',
    margin: 0,
    fontSize: '14px'
  } as React.CSSProperties,
  value: {
    color: '#FFFFFF',
    margin: 0,
    fontSize: '14px'
  } as React.CSSProperties,
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginBottom: '8px'
  } as React.CSSProperties
}

/**
 * 弹窗标签（Tag）样式配置
 */
export const modalTagStyles = {
  base: {
    background: 'rgba(244, 175, 37, 0.15)',
    border: '1px solid rgba(244, 175, 37, 0.4)',
    color: '#f4af25',
    borderRadius: '4px',
    padding: '2px 8px'
  } as React.CSSProperties,
  success: {
    background: 'rgba(82, 196, 26, 0.15)',
    border: '1px solid rgba(82, 196, 26, 0.4)',
    color: '#52c41a'
  } as React.CSSProperties,
  warning: {
    background: 'rgba(250, 173, 20, 0.15)',
    border: '1px solid rgba(250, 173, 20, 0.4)',
    color: '#faad14'
  } as React.CSSProperties,
  error: {
    background: 'rgba(255, 77, 79, 0.15)',
    border: '1px solid rgba(255, 77, 79, 0.4)',
    color: '#ff4d4f'
  } as React.CSSProperties
}

/**
 * 弹窗按钮样式配置
 */
export const modalButtonStyles = {
  primary: {
    padding: '6px 14px',
    borderRadius: 8,
    background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
    color: '#111',
    fontWeight: 'bold' as const,
    border: 'none',
    cursor: 'pointer'
  } as React.CSSProperties,
  secondary: {
    padding: '6px 14px',
    borderRadius: 8,
    border: '1px solid rgba(244, 175, 37, 0.3)',
    background: 'rgba(255,255,255,0.1)',
    color: '#ffffff',
    cursor: 'pointer'
  } as React.CSSProperties,
  danger: {
    padding: '6px 14px',
    borderRadius: 8,
    border: '1px solid rgba(239, 68, 68, 0.5)',
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#ff6b6b',
    cursor: 'pointer'
  } as React.CSSProperties,
  text: {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid rgba(244, 175, 37, 0.3)',
    background: 'rgba(255,255,255,0.05)',
    color: '#ffffff',
    cursor: 'pointer'
  } as React.CSSProperties
}

/**
 * 弹窗卡片/区块样式配置
 */
export const modalCardStyles = {
  base: {
    border: '1px solid rgba(244, 175, 37, 0.3)',
    borderRadius: 8,
    padding: 12,
    background: 'rgba(255,255,255,0.05)',
    marginBottom: 8
  } as React.CSSProperties,
  elevated: {
    border: '1px solid rgba(244, 175, 37, 0.4)',
    borderRadius: 12,
    padding: 16,
    background: 'rgba(39, 35, 27, 0.5)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
  } as React.CSSProperties,
  highlight: {
    border: '1px solid rgba(244, 175, 37, 0.5)',
    borderRadius: 8,
    padding: 12,
    background: 'rgba(244, 175, 37, 0.1)'
  } as React.CSSProperties,
  error: {
    marginTop: 12,
    padding: 8,
    background: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 4,
    border: '1px solid rgba(239, 68, 68, 0.4)'
  } as React.CSSProperties,
  info: {
    marginTop: 12,
    padding: 8,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    border: '1px solid rgba(244, 175, 37, 0.2)'
  } as React.CSSProperties
}

/**
 * 弹窗输入框样式配置
 */
export const modalInputStyles = {
  base: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(244, 175, 37, 0.3)',
    color: '#ffffff',
    borderRadius: '4px'
  } as React.CSSProperties,
  focus: {
    background: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(244, 175, 37, 0.5)',
    color: '#ffffff'
  } as React.CSSProperties
}

/**
 * 弹窗文本样式配置
 */
export const modalTextStyles = {
  title: {
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    margin: 0
  } as React.CSSProperties,
  subtitle: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#FFFFFF',
    margin: 0
  } as React.CSSProperties,
  body: {
    fontSize: '14px',
    color: '#FFFFFF',
    margin: 0
  } as React.CSSProperties,
  secondary: {
    fontSize: '14px',
    color: '#bab09c',
    margin: 0
  } as React.CSSProperties,
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)'
  } as React.CSSProperties,
  primary: {
    fontSize: '14px',
    color: '#f4af25',
    fontWeight: '600' as const,
    margin: 0
  } as React.CSSProperties,
  error: {
    fontSize: 11,
    color: '#ff6b6b',
    fontWeight: '600' as const
  } as React.CSSProperties,
  success: {
    fontSize: 11,
    color: '#52c41a'
  } as React.CSSProperties
}

/**
 * 弹窗表单样式配置
 */
export const modalFormStyles = {
  // Form.Item label 颜色
  labelColor: '#FFFFFF',
  // Form.Item required 星号颜色
  requiredMarkColor: '#ff6b6b'
}

/**
 * 获取完整的弹窗主题配置（暗色主题）
 * @param isDarkTheme 保留参数以兼容现有代码，但总是返回暗色主题
 * @returns 主题配置对象
 */
export const getModalTheme = (isDarkTheme: boolean = true) => {
  return {
    content: modalContentStyles,
    tag: modalTagStyles,
    button: modalButtonStyles,
    card: modalCardStyles,
    input: modalInputStyles,
    text: modalTextStyles,
    form: modalFormStyles
  }
}

/**
 * 获取响应式弹窗配置
 */
export const getResponsiveModalConfig = (isMobile: boolean, isDarkTheme: boolean = true, width: number = 960) => {
  return {
    width: getModalWidth(isMobile, width),
    styles: getModalThemeStyles(isMobile, true),
    centered: true,
    destroyOnClose: true,
    maskClosable: !isMobile
  }
}
