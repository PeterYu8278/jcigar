// 统一的弹窗主题配置
// Unified Modal Theme Configuration

import type { ModalProps } from 'antd'

/**
 * 统一的弹窗样式配置 - 深色主题
 * Unified modal styles configuration - Dark theme
 */
export const MODAL_THEME_STYLES: ModalProps['styles'] = {
  body: {
    background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
    padding: 0,
    color: '#FFFFFF',
  },
  mask: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  content: {
    background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
    border: '1px solid rgba(255, 215, 0, 0.2)',
  },
  header: {
    background: 'transparent',
    color: '#FFFFFF',
    borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
  },
  footer: {
    background: 'transparent',
    borderTop: '1px solid rgba(255, 215, 0, 0.2)',
  },
}

/**
 * 移动端弹窗样式配置 - 全屏
 * Mobile modal styles configuration - Fullscreen
 */
export const MODAL_THEME_STYLES_MOBILE: ModalProps['styles'] = {
  body: {
    background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
    minHeight: '100vh',
    padding: 0,
    color: '#FFFFFF',
  },
  mask: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  content: {
    background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
    border: 'none',
    boxShadow: 'none',
  },
  header: {
    background: 'transparent',
    color: '#FFFFFF',
    borderBottom: 'none',
  },
  footer: {
    background: 'transparent',
    borderTop: 'none',
  },
}

/**
 * 标准弹窗样式配置（带内边距）
 * Standard modal styles with padding
 */
export const MODAL_THEME_STYLES_WITH_PADDING: ModalProps['styles'] = {
  body: {
    background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
    maxHeight: '80vh',
    overflow: 'auto',
    color: '#FFFFFF',
  },
  mask: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  content: {
    background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
    border: '1px solid rgba(255, 215, 0, 0.2)',
  },
  header: {
    background: 'transparent',
    color: '#FFFFFF',
    borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
  },
  footer: {
    background: 'transparent',
    borderTop: '1px solid rgba(255, 215, 0, 0.2)',
  },
}

/**
 * 根据设备类型获取弹窗样式
 * Get modal styles based on device type
 * @param isMobile - 是否为移动设备
 * @param withPadding - 是否需要内边距
 * @returns Modal styles configuration
 */
export const getModalThemeStyles = (
  isMobile: boolean = false,
  withPadding: boolean = false
): ModalProps['styles'] => {
  if (isMobile) {
    return MODAL_THEME_STYLES_MOBILE
  }
  if (withPadding) {
    return MODAL_THEME_STYLES_WITH_PADDING
  }
  return MODAL_THEME_STYLES
}

/**
 * 获取弹窗顶部位置
 * Get modal top position
 * @param isMobile - 是否为移动设备
 * @returns Top position value
 */
export const getModalTop = (isMobile: boolean = false): number => {
  return isMobile ? 0 : 20
}

/**
 * 获取弹窗宽度
 * Get modal width
 * @param isMobile - 是否为移动设备
 * @param desktopWidth - 桌面端宽度（默认 820）
 * @returns Width value
 */
export const getModalWidth = (
  isMobile: boolean = false,
  desktopWidth: number = 820
): string | number => {
  return isMobile ? '100%' : desktopWidth
}

