// QR Code 生成工具
import QRCode from 'qrcode'

/**
 * 生成会员QR Code
 * @param memberId 会员ID
 * @param options QR Code选项
 * @returns Promise<string> Base64编码的QR Code图片
 */
export const generateMemberQRCode = async (
  memberId: string, 
  options: {
    size?: number
    margin?: number
    color?: {
      dark?: string
      light?: string
    }
  } = {}
): Promise<string> => {
  try {
    const {
      size = 200,
      margin = 2,
      color = {
        dark: '#000000',
        light: '#FFFFFF'
      }
    } = options

    // 构建QR Code内容 - 包含会员ID和俱乐部信息
    const qrContent = JSON.stringify({
      type: 'gentleman_club_member',
      memberId: memberId,
      club: 'Gentleman Club',
      timestamp: new Date().toISOString(),
      version: '1.0'
    })

    // 生成QR Code
    const qrCodeDataURL = await QRCode.toDataURL(qrContent, {
      width: size,
      margin: margin,
      color: color,
      errorCorrectionLevel: 'M'
    })

    return qrCodeDataURL
  } catch (error) {
    throw new Error('QR Code生成失败')
  }
}

/**
 * 生成简单的会员ID QR Code
 * @param memberId 会员ID
 * @returns Promise<string> Base64编码的QR Code图片
 */
export const generateSimpleMemberQRCode = async (memberId: string): Promise<string> => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(memberId, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })

    return qrCodeDataURL
  } catch (error) {
    throw new Error('QR Code生成失败')
  }
}

/**
 * 生成会员卡专用的QR Code
 * @param memberId 会员ID
 * @param memberName 会员姓名
 * @returns Promise<string> Base64编码的QR Code图片
 */
export const generateMemberCardQRCode = async (
  memberId: string, 
  memberName?: string
): Promise<string> => {
  try {
    const qrContent = JSON.stringify({
      type: 'member_card',
      memberId: memberId,
      memberName: memberName || 'Gentleman Club Member',
      club: 'Gentleman Club',
      generatedAt: new Date().toISOString()
    })

    const qrCodeDataURL = await QRCode.toDataURL(qrContent, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })

    return qrCodeDataURL
  } catch (error) {
    throw new Error('会员卡QR Code生成失败')
  }
}
