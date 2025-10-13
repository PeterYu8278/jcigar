/**
 * 字符串格式化工具
 */

/**
 * 首字母大写
 * @param str 字符串
 * @returns 首字母大写的字符串
 * 
 * @example
 * capitalize('hello world') // "Hello world"
 */
export const capitalize = (str: string | null | undefined): string => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * 每个单词首字母大写
 * @param str 字符串
 * @returns 每个单词首字母大写的字符串
 * 
 * @example
 * titleCase('hello world') // "Hello World"
 */
export const titleCase = (str: string | null | undefined): string => {
  if (!str) return ''
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}

/**
 * 驼峰命名转换
 * @param str 字符串
 * @returns 驼峰命名字符串
 * 
 * @example
 * camelCase('hello-world') // "helloWorld"
 */
export const camelCase = (str: string | null | undefined): string => {
  if (!str) return ''
  return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
}

/**
 * 帕斯卡命名转换
 * @param str 字符串
 * @returns 帕斯卡命名字符串
 * 
 * @example
 * pascalCase('hello-world') // "HelloWorld"
 */
export const pascalCase = (str: string | null | undefined): string => {
  if (!str) return ''
  const camel = camelCase(str)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

/**
 * 短横线命名转换
 * @param str 字符串
 * @returns 短横线命名字符串
 * 
 * @example
 * kebabCase('helloWorld') // "hello-world"
 */
export const kebabCase = (str: string | null | undefined): string => {
  if (!str) return ''
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * 下划线命名转换
 * @param str 字符串
 * @returns 下划线命名字符串
 * 
 * @example
 * snakeCase('helloWorld') // "hello_world"
 */
export const snakeCase = (str: string | null | undefined): string => {
  if (!str) return ''
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
}

/**
 * 截断字符串
 * @param str 字符串
 * @param length 最大长度
 * @param suffix 后缀
 * @returns 截断后的字符串
 * 
 * @example
 * truncate('Hello World', 5) // "Hello..."
 * truncate('Hello World', 5, '...') // "Hello..."
 */
export const truncate = (
  str: string | null | undefined, 
  length: number, 
  suffix: string = '...'
): string => {
  if (!str) return ''
  if (str.length <= length) return str
  return str.slice(0, length) + suffix
}

/**
 * 截断单词
 * @param str 字符串
 * @param length 最大长度
 * @param suffix 后缀
 * @returns 截断后的字符串
 * 
 * @example
 * truncateWords('Hello World', 8) // "Hello..."
 * truncateWords('Hello World', 8, '...') // "Hello..."
 */
export const truncateWords = (
  str: string | null | undefined, 
  length: number, 
  suffix: string = '...'
): string => {
  if (!str) return ''
  if (str.length <= length) return str
  
  const truncated = str.slice(0, length)
  const lastSpace = truncated.lastIndexOf(' ')
  
  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + suffix
  }
  
  return truncated + suffix
}

/**
 * 移除HTML标签
 * @param str 字符串
 * @returns 移除HTML标签后的字符串
 * 
 * @example
 * stripHtml('<p>Hello World</p>') // "Hello World"
 */
export const stripHtml = (str: string | null | undefined): string => {
  if (!str) return ''
  return str.replace(/<[^>]*>/g, '')
}

/**
 * 转义HTML
 * @param str 字符串
 * @returns 转义HTML后的字符串
 * 
 * @example
 * escapeHtml('<script>alert("hello")</script>') // "&lt;script&gt;alert(&quot;hello&quot;)&lt;/script&gt;"
 */
export const escapeHtml = (str: string | null | undefined): string => {
  if (!str) return ''
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * 反转义HTML
 * @param str 字符串
 * @returns 反转义HTML后的字符串
 * 
 * @example
 * unescapeHtml('&lt;script&gt;alert(&quot;hello&quot;)&lt;/script&gt;') // '<script>alert("hello")</script>'
 */
export const unescapeHtml = (str: string | null | undefined): string => {
  if (!str) return ''
  const div = document.createElement('div')
  div.innerHTML = str
  return div.textContent || div.innerText || ''
}

/**
 * 格式化手机号
 * @param phone 手机号
 * @param format 格式类型
 * @returns 格式化后的手机号
 * 
 * @example
 * formatPhone('13812345678') // "138-1234-5678"
 * formatPhone('13812345678', 'spaces') // "138 1234 5678"
 */
export const formatPhone = (
  phone: string | null | undefined, 
  format: 'dashes' | 'spaces' | 'dots' | 'parentheses' = 'dashes'
): string => {
  if (!phone) return ''
  
  // 移除所有非数字字符
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length !== 11) return phone
  
  const area = cleaned.slice(0, 3)
  const first = cleaned.slice(3, 7)
  const last = cleaned.slice(7)
  
  switch (format) {
    case 'dashes':
      return `${area}-${first}-${last}`
    case 'spaces':
      return `${area} ${first} ${last}`
    case 'dots':
      return `${area}.${first}.${last}`
    case 'parentheses':
      return `(${area}) ${first}-${last}`
    default:
      return `${area}-${first}-${last}`
  }
}

/**
 * 格式化银行卡号
 * @param cardNumber 银行卡号
 * @param mask 是否遮罩中间部分
 * @returns 格式化后的银行卡号
 * 
 * @example
 * formatCardNumber('1234567890123456') // "1234-5678-9012-3456"
 * formatCardNumber('1234567890123456', true) // "1234-****-****-3456"
 */
export const formatCardNumber = (
  cardNumber: string | null | undefined, 
  mask: boolean = false
): string => {
  if (!cardNumber) return ''
  
  // 移除所有非数字字符
  const cleaned = cardNumber.replace(/\D/g, '')
  
  if (cleaned.length < 16) return cardNumber
  
  if (mask) {
    return `${cleaned.slice(0, 4)}-****-****-${cleaned.slice(-4)}`
  }
  
  // 每4位添加一个短横线
  return cleaned.replace(/(.{4})/g, '$1-').slice(0, -1)
}

/**
 * 格式化身份证号
 * @param idCard 身份证号
 * @param mask 是否遮罩中间部分
 * @returns 格式化后的身份证号
 * 
 * @example
 * formatIdCard('123456789012345678') // "123456789012345678"
 * formatIdCard('123456789012345678', true) // "123456****5678"
 */
export const formatIdCard = (
  idCard: string | null | undefined, 
  mask: boolean = false
): string => {
  if (!idCard) return ''
  
  if (mask && idCard.length >= 8) {
    return `${idCard.slice(0, 6)}****${idCard.slice(-4)}`
  }
  
  return idCard
}

/**
 * 格式化姓名（遮罩中间字符）
 * @param name 姓名
 * @param maskChar 遮罩字符
 * @returns 格式化后的姓名
 * 
 * @example
 * formatName('张三') // "张*"
 * formatName('李小明') // "李*明"
 * formatName('欧阳修') // "欧*修"
 */
export const formatName = (
  name: string | null | undefined, 
  maskChar: string = '*'
): string => {
  if (!name) return ''
  
  if (name.length === 1) return name
  if (name.length === 2) return name[0] + maskChar
  if (name.length === 3) return name[0] + maskChar + name[2]
  
  // 超过3个字符，保留首尾
  return name[0] + maskChar.repeat(name.length - 2) + name[name.length - 1]
}

/**
 * 格式化邮箱（遮罩中间部分）
 * @param email 邮箱
 * @param maskChar 遮罩字符
 * @returns 格式化后的邮箱
 * 
 * @example
 * formatEmail('user@example.com') // "u***@example.com"
 * formatEmail('test@domain.com') // "t***@domain.com"
 */
export const formatEmail = (
  email: string | null | undefined, 
  maskChar: string = '*'
): string => {
  if (!email || !email.includes('@')) return email || ''
  
  const [username, domain] = email.split('@')
  
  if (username.length <= 1) return email
  
  const maskedUsername = username[0] + maskChar.repeat(username.length - 1)
  return `${maskedUsername}@${domain}`
}

/**
 * 生成随机字符串
 * @param length 长度
 * @param charset 字符集
 * @returns 随机字符串
 * 
 * @example
 * randomString(8) // "aB3dEfGh"
 * randomString(8, '0123456789') // "12345678"
 */
export const randomString = (
  length: number, 
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string => {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return result
}

/**
 * 生成UUID
 * @returns UUID字符串
 * 
 * @example
 * generateUUID() // "550e8400-e29b-41d4-a716-446655440000"
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * 格式化文件扩展名
 * @param filename 文件名
 * @returns 文件扩展名
 * 
 * @example
 * getFileExtension('document.pdf') // "pdf"
 * getFileExtension('image.jpg') // "jpg"
 */
export const getFileExtension = (filename: string | null | undefined): string => {
  if (!filename) return ''
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.slice(lastDot + 1).toLowerCase() : ''
}

/**
 * 格式化文件名（移除扩展名）
 * @param filename 文件名
 * @returns 不含扩展名的文件名
 * 
 * @example
 * getFileName('document.pdf') // "document"
 * getFileName('image.jpg') // "image"
 */
export const getFileName = (filename: string | null | undefined): string => {
  if (!filename) return ''
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.slice(0, lastDot) : filename
}

/**
 * 格式化路径
 * @param path 路径
 * @param separator 分隔符
 * @returns 格式化后的路径
 * 
 * @example
 * formatPath('/path/to/file', '/') // "/path/to/file"
 * formatPath('path\\to\\file', '/') // "path/to/file"
 */
export const formatPath = (
  path: string | null | undefined, 
  separator: string = '/'
): string => {
  if (!path) return ''
  
  // 统一使用指定的分隔符
  const normalized = path.replace(/[/\\]/g, separator)
  
  // 移除重复的分隔符
  const deduplicated = normalized.replace(new RegExp(`\\${separator}+`, 'g'), separator)
  
  // 移除末尾的分隔符（除非是根路径）
  return deduplicated.endsWith(separator) && deduplicated !== separator 
    ? deduplicated.slice(0, -1) 
    : deduplicated
}

/**
 * 格式化搜索关键词（高亮显示）
 * @param text 文本
 * @param keyword 关键词
 * @param highlightClass 高亮样式类名
 * @returns 高亮后的HTML字符串
 * 
 * @example
 * highlightKeyword('Hello World', 'world') // "Hello <span class="highlight">World</span>"
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