/**
 * 验证规则常量
 */

/**
 * 正则表达式
 */
export const REGEX = {
  // 邮箱
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // 手机号（中国大陆）
  PHONE_CN: /^1[3-9]\d{9}$/,
  
  // 手机号（马来西亚）
  PHONE_MY: /^(\+?60|0)[1-9]\d{7,9}$/,
  
  // 密码（至少8位，包含字母和数字）
  PASSWORD_STRONG: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
  
  // 密码（至少8位）
  PASSWORD_SIMPLE: /^.{8,}$/,
  
  // URL
  URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
  
  // 身份证（中国大陆）
  ID_CARD_CN: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/,
  
  // 数字（正整数）
  POSITIVE_INTEGER: /^[1-9]\d*$/,
  
  // 数字（非负整数，包括0）
  NON_NEGATIVE_INTEGER: /^\d+$/,
  
  // 数字（正数，可包含小数）
  POSITIVE_NUMBER: /^\d+(\.\d+)?$/,
  
  // 邮政编码（中国大陆）
  POSTAL_CODE_CN: /^\d{6}$/,
  
  // 邮政编码（马来西亚）
  POSTAL_CODE_MY: /^\d{5}$/
} as const

/**
 * 验证消息模板
 */
export const VALIDATION_MESSAGES = {
  // 必填
  REQUIRED: {
    zh: '此字段为必填项',
    en: 'This field is required'
  },
  
  // 邮箱
  EMAIL_INVALID: {
    zh: '请输入有效的邮箱地址',
    en: 'Please enter a valid email address'
  },
  
  // 手机号
  PHONE_INVALID: {
    zh: '请输入有效的手机号码',
    en: 'Please enter a valid phone number'
  },
  
  // 密码
  PASSWORD_TOO_SHORT: {
    zh: '密码至少需要8位',
    en: 'Password must be at least 8 characters'
  },
  PASSWORD_WEAK: {
    zh: '密码需包含字母和数字',
    en: 'Password must contain letters and numbers'
  },
  PASSWORD_MISMATCH: {
    zh: '两次输入的密码不一致',
    en: 'Passwords do not match'
  },
  
  // 长度
  TOO_SHORT: {
    zh: '长度不能少于{min}个字符',
    en: 'Must be at least {min} characters'
  },
  TOO_LONG: {
    zh: '长度不能超过{max}个字符',
    en: 'Must not exceed {max} characters'
  },
  
  // 数值
  NUMBER_TOO_SMALL: {
    zh: '值不能小于{min}',
    en: 'Must be at least {min}'
  },
  NUMBER_TOO_LARGE: {
    zh: '值不能大于{max}',
    en: 'Must not exceed {max}'
  },
  NUMBER_INVALID: {
    zh: '请输入有效的数字',
    en: 'Please enter a valid number'
  },
  
  // URL
  URL_INVALID: {
    zh: '请输入有效的URL地址',
    en: 'Please enter a valid URL'
  },
  
  // 选择
  SELECT_AT_LEAST_ONE: {
    zh: '请至少选择一项',
    en: 'Please select at least one item'
  }
} as const

/**
 * 字段长度限制
 */
export const FIELD_LENGTH = {
  // 用户名
  USERNAME_MIN: 2,
  USERNAME_MAX: 50,
  
  // 密码
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  
  // 姓名
  NAME_MIN: 2,
  NAME_MAX: 100,
  
  // 标题
  TITLE_MIN: 1,
  TITLE_MAX: 200,
  
  // 描述
  DESCRIPTION_MIN: 0,
  DESCRIPTION_MAX: 2000,
  
  // 地址
  ADDRESS_MIN: 5,
  ADDRESS_MAX: 500,
  
  // 备注
  NOTE_MIN: 0,
  NOTE_MAX: 1000
} as const

/**
 * 数值范围限制
 */
export const NUMBER_RANGE = {
  // 价格
  PRICE_MIN: 0,
  PRICE_MAX: 999999.99,
  
  // 数量
  QUANTITY_MIN: 0,
  QUANTITY_MAX: 99999,
  
  // 折扣（百分比）
  DISCOUNT_MIN: 0,
  DISCOUNT_MAX: 100,
  
  // 评分
  RATING_MIN: 1,
  RATING_MAX: 5,
  
  // 年份
  YEAR_MIN: 1900,
  YEAR_MAX: 2100
} as const

/**
 * 文件上传限制
 */
export const FILE_UPLOAD = {
  // 图片
  IMAGE_MAX_SIZE: 5 * 1024 * 1024,      // 5MB
  IMAGE_ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  IMAGE_ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  
  // 文档
  DOCUMENT_MAX_SIZE: 10 * 1024 * 1024,  // 10MB
  DOCUMENT_ALLOWED_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  DOCUMENT_ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx']
} as const

