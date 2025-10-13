/**
 * i18n类型定义
 * 提供翻译键的TypeScript类型支持
 */

import type enUS from './locales/en-US.json'
import type zhCN from './locales/zh-CN.json'

// 从JSON文件推导类型
type TranslationKeys = typeof enUS
type NestedKeys<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends object
        ? `${K & string}.${NestedKeys<T[K]>}`
        : K & string
    }[keyof T]
  : never

// 导出翻译键的联合类型
export type TranslationKey = NestedKeys<TranslationKeys>

// 支持的语言类型
export type SupportedLanguage = 'zh-CN' | 'en-US'

// 翻译函数类型
export type TFunction = (key: TranslationKey, options?: any) => string

// 语言配置
export interface LanguageConfig {
  code: SupportedLanguage
  name: string
  nativeName: string
}

// 可用语言列表
export const AVAILABLE_LANGUAGES: LanguageConfig[] = [
  {
    code: 'zh-CN',
    name: 'Chinese',
    nativeName: '中文',
  },
  {
    code: 'en-US',
    name: 'English',
    nativeName: 'English',
  },
]

// 翻译命名空间
export const TRANSLATION_NAMESPACES = {
  COMMON: 'common',
  AUTH: 'auth',
  NAVIGATION: 'navigation',
  PROFILE: 'profile',
  EVENTS: 'events',
  SHOP: 'shop',
  MESSAGES: 'messages',
  LANGUAGE: 'language',
  HOME: 'home',
  DASHBOARD: 'dashboard',
  USERS_ADMIN: 'usersAdmin',
  ORDERS_ADMIN: 'ordersAdmin',
  INVENTORY: 'inventory',
  FINANCE_ADMIN: 'financeAdmin',
  PARTICIPANTS: 'participants',
  UPLOAD: 'upload',
  CLOUDINARY: 'cloudinary',
  CROP: 'crop',
  BRAND: 'brand',
  FOOTER: 'footer',
} as const

export type TranslationNamespace = typeof TRANSLATION_NAMESPACES[keyof typeof TRANSLATION_NAMESPACES]

// 验证翻译文件一致性的辅助类型
type ValidateTranslations<T, U> = 
  keyof T extends keyof U 
    ? keyof U extends keyof T 
      ? true 
      : false
    : false

// 类型检查：确保中英文翻译文件的键一致
type TranslationsAreConsistent = ValidateTranslations<typeof enUS, typeof zhCN>

// 如果翻译文件不一致，这里会报错
const _checkConsistency: TranslationsAreConsistent = true

