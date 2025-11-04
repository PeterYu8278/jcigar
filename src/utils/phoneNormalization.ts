/**
 * 手机号标准化工具
 * 实现 E.164 国际标准格式
 */

// 默认国家代码（马来西亚）
const DEFAULT_COUNTRY_CODE = '60'

// E.164 格式验证正则表达式
const E164_PATTERN = /^\+\d{7,15}$/

/**
 * 标准化手机号为 E.164 格式
 * @param phone - 原始手机号输入
 * @param countryCode - 国家代码（默认：60 = 马来西亚）
 * @returns E.164 格式手机号（如 +601157288278）或 null（无效格式）
 * 
 * @example
 * normalizePhoneNumber("+601157288278")    → "+601157288278"
 * normalizePhoneNumber("601157288278")     → "+601157288278"
 * normalizePhoneNumber("01157288278")      → "+601157288278"
 * normalizePhoneNumber("011-5728 8278")    → "+601157288278"
 * normalizePhoneNumber("+6011-5728 8278")  → "+60115728278"
 */
export function normalizePhoneNumber(
  phone: string, 
  countryCode: string = DEFAULT_COUNTRY_CODE
): string | null {
  if (!phone) return null
  
  // 步骤1：清理所有非数字字符（保留+）
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // 步骤2：处理多个+（只保留开头的）
  const hasPlus = cleaned.startsWith('+')
  cleaned = cleaned.replace(/\+/g, '')
  
  // 步骤3：根据不同格式转换为 E.164
  let normalized: string
  
  if (hasPlus) {
    // 格式: +601157288278 → +601157288278
    normalized = '+' + cleaned
  } else if (cleaned.startsWith(countryCode)) {
    // 格式: 601157288278 → +601157288278
    normalized = '+' + cleaned
  } else if (cleaned.startsWith('0')) {
    // 格式: 01157288278 → +601157288278 (移除0，添加国家代码)
    normalized = '+' + countryCode + cleaned.substring(1)
  } else {
    // 格式: 1157288278 → +601157288278
    normalized = '+' + countryCode + cleaned
  }
  
  // 步骤4：验证最终格式
  if (!E164_PATTERN.test(normalized)) {
    return null  // 无效格式
  }
  
  return normalized
}

/**
 * 格式化手机号用于显示（用户友好）
 * @param phone - E.164 格式手机号
 * @returns 格式化后的手机号
 * 
 * @example
 * formatPhoneDisplay("+601157288278")  → "+60 11-5728 8278"
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return ''
  
  // 马来西亚手机号格式: +60 XX-XXXX XXXX
  if (phone.startsWith('+60') && phone.length >= 12) {
    return phone.replace(/(\+60)(\d{2})(\d{4})(\d{4})/, '$1 $2-$3 $4')
  }
  
  // 其他国家保持原样
  return phone
}

/**
 * 识别输入类型
 * @param input - 用户输入
 * @returns 'email' | 'phone' | 'unknown'
 * 
 * @example
 * identifyInputType("admin@example.com")  → 'email'
 * identifyInputType("01157288278")        → 'phone'
 * identifyInputType("+601157288278")      → 'phone'
 * identifyInputType("abc123")             → 'unknown'
 */
export function identifyInputType(input: string): 'email' | 'phone' | 'unknown' {
  if (!input) return 'unknown'
  
  const trimmed = input.trim()
  
  // 包含 @ → 邮箱（RFC 5322 标准的强制字符）
  if (trimmed.includes('@')) {
    return 'email'
  }
  
  // 清理后符合手机号格式
  const cleaned = trimmed.replace(/[^\d+]/g, '')
  if (/^\+?\d{7,15}$/.test(cleaned)) {
    return 'phone'
  }
  
  return 'unknown'
}

/**
 * 验证邮箱格式（基础验证）
 */
export function isValidEmail(email: string): boolean {
  // 基础邮箱格式验证
  return /.+@.+\..+/.test(email)
}

/**
 * 验证手机号格式（E.164）
 */
export function isValidE164Phone(phone: string): boolean {
  return E164_PATTERN.test(phone)
}

