// 统一的弹窗主题配置
// 供所有弹窗调用，确保UI一致性

import type { ModalProps } from 'antd'

/**
 * 深色主题弹窗样式（订单详情等）
 * 渐变背景：#221c10 -> #181611
 */
export const getDarkModalStyles = (isMobile: boolean): ModalProps['styles'] => ({
  body: {
    background: 'linear-gradient(180deg, #221c10 0%, #181611 0%)',
    minHeight: isMobile ? '100vh' : 'auto',
  },
  mask: { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
  content: {
    background: 'linear-gradient(180deg, #221c10 0%, #181611 0%)',
  },
})

/**
 * 浅色主题弹窗样式（表单、编辑等）
 * 白色背景，金色边框
 */
export const getLightModalStyles = (isMobile: boolean, centered = true): ModalProps['styles'] => ({
  body: {
    background: 'rgba(255,255,255,1)',
    maxHeight: centered ? '80vh' : undefined,
    overflow: centered ? 'auto' : undefined,
  },
  mask: { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
  content: {
    background: 'rgba(255,255,255,1)',
    border: '1px solid rgba(255, 215, 0, 0.2)',
  },
})

/**
 * 获取弹窗宽度
 * @param isMobile 是否移动端
 * @param desktopWidth 桌面端宽度（默认960）
 * @returns 弹窗宽度
 */
export const getModalWidth = (isMobile: boolean, desktopWidth: number = 960): number | string => {
  return isMobile ? '100%' : desktopWidth
}

/**
 * 获取弹窗顶部距离
 * @param isMobile 是否移动端
 * @param desktopTop 桌面端顶部距离（默认20）
 * @returns 顶部距离
 */
export const getModalTop = (isMobile: boolean, desktopTop: number = 20): number => {
  return isMobile ? 0 : desktopTop
}

/**
 * 通用弹窗主题样式获取器
 * @param isMobile 是否移动端
 * @param isLight 是否使用浅色主题（默认true）
 * @param centered 是否居中显示（默认true，仅浅色主题生效）
 * @returns 弹窗样式配置
 */
export const getModalThemeStyles = (
  isMobile: boolean,
  isLight: boolean = true,
  centered: boolean = true
): ModalProps['styles'] => {
  return isLight ? getLightModalStyles(isMobile, centered) : getDarkModalStyles(isMobile)
}

