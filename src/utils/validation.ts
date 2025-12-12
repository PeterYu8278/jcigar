/**
 * 数据验证工具
 * 提供统一的表单验证和数据处理功能
 */

// 验证规则类型
export interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  email?: boolean
  phone?: boolean
  url?: boolean
  custom?: (value: any) => string | undefined
  message?: string
}

// 验证结果
export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

// 常用正则表达式
export const PATTERNS = {
  // 邮箱
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // 手机号（支持国际格式）
  PHONE: /^(\+?86)?1[3-9]\d{9}$|^(\+?1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/,
  
  // 中国手机号
  PHONE_CN: /^1[3-9]\d{9}$/,
  
  // URL
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  
  // 密码（至少8位，包含字母和数字）
  PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
  
  // 强密码（至少8位，包含大小写字母、数字和特殊字符）
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  
  // 身份证号
  ID_CARD: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
  
  // 银行卡号
  BANK_CARD: /^[1-9]\d{15,18}$/,
  
  // 中文姓名
  CHINESE_NAME: /^[\u4e00-\u9fa5]{2,4}$/,
  
  // 英文姓名
  ENGLISH_NAME: /^[a-zA-Z\s]{2,50}$/,
  
  // 数字（整数）
  INTEGER: /^-?\d+$/,
  
  // 数字（小数）
  DECIMAL: /^-?\d+(\.\d+)?$/,
  
  // 正数
  POSITIVE_NUMBER: /^\d+(\.\d+)?$/,
  
  // 金额（最多两位小数）
  MONEY: /^\d+(\.\d{1,2})?$/
}

// 默认错误消息
export const ERROR_MESSAGES = {
  required: '此字段为必填项',
  min: '值不能小于 {{min}}',
  max: '值不能大于 {{max}}',
  minLength: '长度不能少于 {{minLength}} 个字符',
  maxLength: '长度不能超过 {{maxLength}} 个字符',
  pattern: '格式不正确',
  email: '请输入有效的邮箱地址',
  phone: '请输入有效的手机号',
  url: '请输入有效的网址',
  password: '密码至少8位，包含字母和数字',
  strongPassword: '密码至少8位，包含大小写字母、数字和特殊字符',
  idCard: '请输入有效的身份证号',
  bankCard: '请输入有效的银行卡号',
  chineseName: '请输入有效的中文姓名',
  englishName: '请输入有效的英文姓名',
  integer: '请输入整数',
  decimal: '请输入数字',
  positiveNumber: '请输入正数',
  money: '请输入有效的金额'
}

/**
 * 验证单个值
 */
export const validateValue = (value: any, rules: ValidationRule): string | undefined => {
  // 必填验证
  if (rules.required && (value === undefined || value === null || value === '')) {
    return rules.message || ERROR_MESSAGES.required
  }
  
  // 如果值为空且不是必填，跳过其他验证
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  
  const stringValue = String(value)
  const numberValue = Number(value)
  
  // 最小值验证
  if (rules.min !== undefined && numberValue < rules.min) {
    return rules.message || ERROR_MESSAGES.min.replace('{{min}}', String(rules.min))
  }
  
  // 最大值验证
  if (rules.max !== undefined && numberValue > rules.max) {
    return rules.message || ERROR_MESSAGES.max.replace('{{max}}', String(rules.max))
  }
  
  // 最小长度验证
  if (rules.minLength !== undefined && stringValue.length < rules.minLength) {
    return rules.message || ERROR_MESSAGES.minLength.replace('{{minLength}}', String(rules.minLength))
  }
  
  // 最大长度验证
  if (rules.maxLength !== undefined && stringValue.length > rules.maxLength) {
    return rules.message || ERROR_MESSAGES.maxLength.replace('{{maxLength}}', String(rules.maxLength))
  }
  
  // 正则验证
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    return rules.message || ERROR_MESSAGES.pattern
  }
  
  // 邮箱验证
  if (rules.email && !PATTERNS.EMAIL.test(stringValue)) {
    return rules.message || ERROR_MESSAGES.email
  }
  
  // 手机号验证
  if (rules.phone && !PATTERNS.PHONE.test(stringValue)) {
    return rules.message || ERROR_MESSAGES.phone
  }
  
  // URL验证
  if (rules.url && !PATTERNS.URL.test(stringValue)) {
    return rules.message || ERROR_MESSAGES.url
  }
  
  // 自定义验证
  if (rules.custom) {
    return rules.custom(value)
  }
  
  return undefined
}

/**
 * 验证对象
 */
export const validateObject = (
  data: Record<string, any>, 
  rules: Record<string, ValidationRule>
): ValidationResult => {
  const errors: Record<string, string> = {}
  
  Object.entries(rules).forEach(([field, rule]) => {
    const error = validateValue(data[field], rule)
    if (error) {
      errors[field] = error
    }
  })
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * 常用验证规则
 */
export const VALIDATION_RULES = {
  // 必填
  required: { required: true },
  
  // 邮箱
  email: { 
    email: true,
    message: ERROR_MESSAGES.email
  },
  
  // 手机号
  phone: { 
    phone: true,
    message: ERROR_MESSAGES.phone
  },
  
  // 密码
  password: {
    pattern: PATTERNS.PASSWORD,
    message: ERROR_MESSAGES.password
  },
  
  // 强密码
  strongPassword: {
    pattern: PATTERNS.STRONG_PASSWORD,
    message: ERROR_MESSAGES.strongPassword
  },
  
  // 中文姓名
  chineseName: {
    pattern: PATTERNS.CHINESE_NAME,
    message: ERROR_MESSAGES.chineseName
  },
  
  // 英文姓名
  englishName: {
    pattern: PATTERNS.ENGLISH_NAME,
    message: ERROR_MESSAGES.englishName
  },
  
  // 金额
  money: {
    pattern: PATTERNS.MONEY,
    message: ERROR_MESSAGES.money
  },
  
  // 正数
  positiveNumber: {
    pattern: PATTERNS.POSITIVE_NUMBER,
    message: ERROR_MESSAGES.positiveNumber
  },
  
  // URL
  url: {
    url: true,
    message: ERROR_MESSAGES.url
  }
}

/**
 * 表单验证 Hook
 */
export const useFormValidation = <T extends Record<string, any>>(
  initialData: T,
  rules: Record<keyof T, ValidationRule>
) => {
  const [data, setData] = React.useState<T>(initialData)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  
  const validate = () => {
    const result = validateObject(data, rules as Record<string, ValidationRule>)
    setErrors(result.errors)
    return result.valid
  }
  
  const validateField = (field: keyof T, value: any) => {
    const rule = rules[field]
    if (!rule) return true
    
    const error = validateValue(value, rule)
    setErrors(prev => ({
      ...prev,
      [field as string]: error || ''
    }))
    return !error
  }
  
  const setField = (field: keyof T, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
    validateField(field, value)
  }
  
  const reset = () => {
    setData(initialData)
    setErrors({})
  }
  
  return {
    data,
    errors,
    setData,
    setField,
    validate,
    validateField,
    reset,
    isValid: Object.keys(errors).length === 0
  }
}

/**
 * 数据清洗函数
 */
export const sanitizeData = <T extends Record<string, any>>(
  data: T,
  options: {
    removeEmpty?: boolean
    trimStrings?: boolean
    convertNumbers?: boolean
    removeUndefined?: boolean
  } = {}
): T => {
  const {
    removeEmpty = true,
    trimStrings = true,
    convertNumbers = false,
    removeUndefined = true
  } = options
  
  const result = { ...data }
  
  Object.entries(result).forEach(([key, value]) => {
    // 移除 undefined
    if (removeUndefined && value === undefined) {
      delete result[key]
      return
    }
    
    // 移除空值
    if (removeEmpty && (value === null || value === '')) {
      delete result[key]
      return
    }
    
    // 去除字符串空格
    if (trimStrings && typeof value === 'string') {
      (result as any)[key] = value.trim()
    }
    
    // 转换数字
    if (convertNumbers && typeof value === 'string' && !isNaN(Number(value))) {
      (result as any)[key] = Number(value)
    }
  })
  
  return result
}

/**
 * 数据比较函数
 */
export const compareData = <T extends Record<string, any>>(
  original: T,
  current: T,
  fields?: (keyof T)[]
): Record<string, { original: any; current: any; changed: boolean }> => {
  const result: Record<string, { original: any; current: any; changed: boolean }> = {}
  
  const fieldsToCompare = fields || Object.keys(original) as (keyof T)[]
  
  fieldsToCompare.forEach(field => {
    const originalValue = original[field]
    const currentValue = current[field]
    const changed = originalValue !== currentValue
    
    result[field as string] = {
      original: originalValue,
      current: currentValue,
      changed
    }
  })
  
  return result
}

// 导入 React 用于 Hook
import React from 'react'
