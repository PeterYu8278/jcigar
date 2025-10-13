/**
 * 字符串格式化工具
 */

/**
 * 截断字符串
 * @param str - 字符串
 * @param maxLength - 最大长度
 * @param suffix - 后缀，默认 '...'
 * 
 * @example
 * truncate('Hello World', 5) // "Hello..."
 * truncate('Hello', 10) // "Hello"
 */
export const truncate = (
  str: string | null | undefined,
  maxLength: number,
  suffix: string = '...'
): string => {
  if (!str) return ''
  
  if (str.length <= maxLength) {
    return str
  }
  
  return str.slice(0, maxLength) + suffix
}

/**
 * 手机号脱敏
 * @param phone - 手机号
 * @param keepStart - 保留开头位数，默认 3
 * @param keepEnd - 保留结尾位数，默认 4
 * 
 * @example
 * maskPhone('13812345678') // "138****5678"
 * maskPhone('13812345678', 4, 4) // "1381****5678"
 */
export const maskPhone = (
  phone: string | null | undefined,
  keepStart: number = 3,
  keepEnd: number = 4
): string => {
  if (!phone) return ''
  
  const cleanPhone = phone.replace(/\D/g, '')
  
  if (cleanPhone.length <= keepStart + keepEnd) {
    return cleanPhone
  }
  
  const start = cleanPhone.slice(0, keepStart)
  const end = cleanPhone.slice(-keepEnd)
  const maskLength = cleanPhone.length - keepStart - keepEnd
  
  return `${start}${'*'.repeat(maskLength)}${end}`
}

/**
 * 邮箱脱敏
 * @param email - 邮箱
 * 
 * @example
 * maskEmail('example@gmail.com') // "ex****@gmail.com"
 */
export const maskEmail = (email: string | null | undefined): string => {
  if (!email) return ''
  
  const [localPart, domain] = email.split('@')
  
  if (!localPart || !domain) {
    return email
  }
  
  const visibleStart = Math.min(2, Math.floor(localPart.length / 3))
  const maskedLocal = localPart.slice(0, visibleStart) + '****'
  
  return `${maskedLocal}@${domain}`
}

/**
 * 身份证号脱敏
 * @param idCard - 身份证号
 * 
 * @example
 * maskIdCard('110101199001011234') // "110101****1234"
 */
export const maskIdCard = (idCard: string | null | undefined): string => {
  if (!idCard) return ''
  
  if (idCard.length < 8) {
    return idCard
  }
  
  const start = idCard.slice(0, 6)
  const end = idCard.slice(-4)
  
  return `${start}****${end}`
}

/**
 * 首字母大写
 * @param str - 字符串
 * 
 * @example
 * capitalize('hello world') // "Hello world"
 */
export const capitalize = (str: string | null | undefined): string => {
  if (!str) return ''
  
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * 每个单词首字母大写
 * @param str - 字符串
 * 
 * @example
 * capitalizeWords('hello world') // "Hello World"
 */
export const capitalizeWords = (str: string | null | undefined): string => {
  if (!str) return ''
  
  return str.replace(/\b\w/g, char => char.toUpperCase())
}

/**
 * 转为驼峰命名
 * @param str - 字符串
 * 
 * @example
 * toCamelCase('hello-world') // "helloWorld"
 * toCamelCase('hello_world') // "helloWorld"
 */
export const toCamelCase = (str: string | null | undefined): string => {
  if (!str) return ''
  
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^[A-Z]/, char => char.toLowerCase())
}

/**
 * 转为短横线命名
 * @param str - 字符串
 * 
 * @example
 * toKebabCase('helloWorld') // "hello-world"
 * toKebabCase('HelloWorld') // "hello-world"
 */
export const toKebabCase = (str: string | null | undefined): string => {
  if (!str) return ''
  
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

/**
 * 转为下划线命名
 * @param str - 字符串
 * 
 * @example
 * toSnakeCase('helloWorld') // "hello_world"
 * toSnakeCase('HelloWorld') // "hello_world"
 */
export const toSnakeCase = (str: string | null | undefined): string => {
  if (!str) return ''
  
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
}

/**
 * 移除 HTML 标签
 * @param str - 字符串
 * 
 * @example
 * stripHtml('<p>Hello <strong>World</strong></p>') // "Hello World"
 */
export const stripHtml = (str: string | null | undefined): string => {
  if (!str) return ''
  
  return str.replace(/<[^>]*>/g, '')
}

/**
 * 转义 HTML 特殊字符
 * @param str - 字符串
 * 
 * @example
 * escapeHtml('<script>alert("XSS")</script>')
 * // "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"
 */
export const escapeHtml = (str: string | null | undefined): string => {
  if (!str) return ''
  
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  
  return str.replace(/[&<>"']/g, char => escapeMap[char])
}

/**
 * 生成随机字符串
 * @param length - 长度
 * @param charset - 字符集，默认 'alphanumeric'
 * 
 * @example
 * randomString(8) // "aB3xY9zK"
 * randomString(6, 'numeric') // "123456"
 * randomString(6, 'alpha') // "aBcDeF"
 */
export const randomString = (
  length: number,
  charset: 'alphanumeric' | 'alpha' | 'numeric' | 'lowercase' | 'uppercase' = 'alphanumeric'
): string => {
  const charsets = {
    alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    numeric: '0123456789',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  }
  
  const chars = charsets[charset]
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * 高亮关键词
 * @param text - 文本
 * @param keyword - 关键词
 * @param highlightClass - 高亮样式类名，默认 'highlight'
 * 
 * @example
 * highlightKeyword('Hello World', 'World')
 * // "Hello <span class=\"highlight\">World</span>"
 */
export const highlightKeyword = (
  text: string | null | undefined,
  keyword: string | null | undefined,
  highlightClass: string = 'highlight'
): string => {
  if (!text || !keyword) return text || ''
  
  const regex = new RegExp(`(${keyword})`, 'gi')
  return text.replace(regex, `<span class="${highlightClass}">$1</span>`)
}

/**
 * 判断字符串是否为空（包括空格）
 * @param str - 字符串
 * 
 * @example
 * isEmpty('') // true
 * isEmpty('   ') // true
 * isEmpty('hello') // false
 */
export const isEmpty = (str: string | null | undefined): boolean => {
  return !str || str.trim().length === 0
}

/**
 * 安全的 JSON 解析
 * @param str - JSON 字符串
 * @param defaultValue - 默认值
 * 
 * @example
 * safeJsonParse('{"name":"John"}') // { name: 'John' }
 * safeJsonParse('invalid json', {}) // {}
 */
export const safeJsonParse = <T = any>(
  str: string | null | undefined,
  defaultValue: T = {} as T
): T => {
  if (!str) return defaultValue
  
  try {
    return JSON.parse(str)
  } catch (error) {
    console.error('JSON 解析失败:', error)
    return defaultValue
  }
}

