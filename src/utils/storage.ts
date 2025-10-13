/**
 * 本地存储工具
 * 提供统一的本地存储操作接口
 */

import { STORAGE_KEYS } from '../config/constants'

// 存储类型
export type StorageType = 'localStorage' | 'sessionStorage'

// 存储选项
export interface StorageOptions {
  type?: StorageType
  expire?: number // 过期时间（毫秒）
  encrypt?: boolean // 是否加密
}

// 存储项
interface StorageItem {
  value: any
  expire?: number
  timestamp: number
}

/**
 * 获取存储对象
 */
const getStorageObject = (type: StorageType): Storage => {
  return type === 'localStorage' ? localStorage : sessionStorage
}

/**
 * 序列化数据
 */
const serialize = (data: any): string => {
  try {
    return JSON.stringify(data)
  } catch (error) {
    console.error('Storage serialize error:', error)
    return ''
  }
}

/**
 * 反序列化数据
 */
const deserialize = <T = any>(data: string): T | null => {
  try {
    return JSON.parse(data)
  } catch (error) {
    console.error('Storage deserialize error:', error)
    return null
  }
}

/**
 * 检查是否过期
 */
const isExpired = (item: StorageItem): boolean => {
  if (!item.expire) return false
  return Date.now() > item.timestamp + item.expire
}

/**
 * 设置存储项
 */
export const setStorage = (
  key: string, 
  value: any, 
  options: StorageOptions = {}
): boolean => {
  try {
    const { type = 'localStorage', expire } = options
    
    const storageItem: StorageItem = {
      value,
      expire,
      timestamp: Date.now()
    }
    
    const storage = getStorageObject(type)
    const serialized = serialize(storageItem)
    
    if (serialized) {
      storage.setItem(key, serialized)
      return true
    }
    
    return false
  } catch (error) {
    console.error('Storage set error:', error)
    return false
  }
}

/**
 * 获取存储项
 */
export const getStorageValue = <T = any>(
  key: string, 
  options: StorageOptions = {}
): T | null => {
  try {
    const { type = 'localStorage' } = options
    const storage = getStorageObject(type)
    const data = storage.getItem(key)
    
    if (!data) return null
    
    const item = deserialize<StorageItem>(data)
    if (!item) return null
    
    // 检查是否过期
    if (isExpired(item)) {
      removeStorage(key, options)
      return null
    }
    
    return item.value
  } catch (error) {
    console.error('Storage get error:', error)
    return null
  }
}

/**
 * 移除存储项
 */
export const removeStorage = (
  key: string, 
  options: StorageOptions = {}
): boolean => {
  try {
    const { type = 'localStorage' } = options
    const storage = getStorageObject(type)
    storage.removeItem(key)
    return true
  } catch (error) {
    console.error('Storage remove error:', error)
    return false
  }
}

/**
 * 清空存储
 */
export const clearStorage = (options: StorageOptions = {}): boolean => {
  try {
    const { type = 'localStorage' } = options
    const storage = getStorageObject(type)
    storage.clear()
    return true
  } catch (error) {
    console.error('Storage clear error:', error)
    return false
  }
}

/**
 * 获取存储大小（字节）
 */
export const getStorageSize = (options: StorageOptions = {}): number => {
  try {
    const { type = 'localStorage' } = options
    const storage = getStorageObject(type)
    let total = 0
    
    for (let key in storage) {
      if (storage.hasOwnProperty(key)) {
        total += storage[key].length + key.length
      }
    }
    
    return total
  } catch (error) {
    console.error('Storage size error:', error)
    return 0
  }
}

/**
 * 获取存储键列表
 */
export const getStorageKeys = (options: StorageOptions = {}): string[] => {
  try {
    const { type = 'localStorage' } = options
    const storage = getStorageObject(type)
    return Object.keys(storage)
  } catch (error) {
    console.error('Storage keys error:', error)
    return []
  }
}

/**
 * 检查存储项是否存在
 */
export const hasStorage = (
  key: string, 
  options: StorageOptions = {}
): boolean => {
  try {
    const { type = 'localStorage' } = options
    const storage = getStorageObject(type)
    return storage.getItem(key) !== null
  } catch (error) {
    console.error('Storage has error:', error)
    return false
  }
}

// 常用存储操作

/**
 * 设置用户令牌
 */
export const setUserToken = (token: string): boolean => {
  return setStorage(STORAGE_KEYS.USER_TOKEN, token, { type: 'localStorage' })
}

/**
 * 获取用户令牌
 */
export const getUserToken = (): string | null => {
  return getStorageValue<string>(STORAGE_KEYS.USER_TOKEN, { type: 'localStorage' })
}

/**
 * 移除用户令牌
 */
export const removeUserToken = (): boolean => {
  return removeStorage(STORAGE_KEYS.USER_TOKEN, { type: 'localStorage' })
}

/**
 * 设置用户信息
 */
export const setUserInfo = (userInfo: any): boolean => {
  return setStorage(STORAGE_KEYS.USER_INFO, userInfo, { type: 'localStorage' })
}

/**
 * 获取用户信息
 */
export const getUserInfo = <T = any>(): T | null => {
  return getStorageValue<T>(STORAGE_KEYS.USER_INFO, { type: 'localStorage' })
}

/**
 * 移除用户信息
 */
export const removeUserInfo = (): boolean => {
  return removeStorage(STORAGE_KEYS.USER_INFO, { type: 'localStorage' })
}

/**
 * 设置语言
 */
export const setLanguage = (language: string): boolean => {
  return setStorage(STORAGE_KEYS.LANGUAGE, language, { type: 'localStorage' })
}

/**
 * 获取语言
 */
export const getLanguage = (): string | null => {
  return getStorageValue<string>(STORAGE_KEYS.LANGUAGE, { type: 'localStorage' })
}

/**
 * 设置主题
 */
export const setTheme = (theme: string): boolean => {
  return setStorage(STORAGE_KEYS.THEME, theme, { type: 'localStorage' })
}

/**
 * 获取主题
 */
export const getTheme = (): string | null => {
  return getStorageValue<string>(STORAGE_KEYS.THEME, { type: 'localStorage' })
}

/**
 * 设置购物车
 */
export const setCart = (cart: any): boolean => {
  return setStorage(STORAGE_KEYS.CART, cart, { type: 'localStorage' })
}

/**
 * 获取购物车
 */
export const getCart = <T = any>(): T | null => {
  return getStorageValue<T>(STORAGE_KEYS.CART, { type: 'localStorage' })
}

/**
 * 设置收藏
 */
export const setFavorites = (favorites: any): boolean => {
  return setStorage(STORAGE_KEYS.FAVORITES, favorites, { type: 'localStorage' })
}

/**
 * 获取收藏
 */
export const getFavorites = <T = any>(): T | null => {
  return getStorageValue<T>(STORAGE_KEYS.FAVORITES, { type: 'localStorage' })
}

/**
 * 设置最近搜索
 */
export const setRecentSearches = (searches: string[]): boolean => {
  return setStorage(STORAGE_KEYS.RECENT_SEARCHES, searches, { type: 'localStorage' })
}

/**
 * 获取最近搜索
 */
export const getRecentSearches = (): string[] => {
  return getStorageValue<string[]>(STORAGE_KEYS.RECENT_SEARCHES, { type: 'localStorage' }) || []
}

/**
 * 添加搜索记录
 */
export const addRecentSearch = (search: string): boolean => {
  const searches = getRecentSearches()
  const filtered = searches.filter(s => s !== search)
  const updated = [search, ...filtered].slice(0, 10) // 最多保存10条
  return setRecentSearches(updated)
}

/**
 * 清除搜索记录
 */
export const clearRecentSearches = (): boolean => {
  return removeStorage(STORAGE_KEYS.RECENT_SEARCHES, { type: 'localStorage' })
}

/**
 * 设置应用设置
 */
export const setSettings = (settings: any): boolean => {
  return setStorage(STORAGE_KEYS.SETTINGS, settings, { type: 'localStorage' })
}

/**
 * 获取应用设置
 */
export const getSettings = <T = any>(): T | null => {
  return getStorageValue<T>(STORAGE_KEYS.SETTINGS, { type: 'localStorage' })
}

// 临时存储（sessionStorage）

/**
 * 设置临时数据
 */
export const setTempData = (key: string, value: any): boolean => {
  return setStorage(key, value, { type: 'sessionStorage' })
}

/**
 * 获取临时数据
 */
export const getTempData = <T = any>(key: string): T | null => {
  return getStorageValue<T>(key, { type: 'sessionStorage' })
}

/**
 * 移除临时数据
 */
export const removeTempData = (key: string): boolean => {
  return removeStorage(key, { type: 'sessionStorage' })
}

/**
 * 清空临时数据
 */
export const clearTempData = (): boolean => {
  return clearStorage({ type: 'sessionStorage' })
}

// 存储监控

/**
 * 存储变化监听器
 */
export interface StorageListener {
  key: string
  callback: (newValue: any, oldValue: any) => void
}

const listeners: StorageListener[] = []

/**
 * 添加存储变化监听
 */
export const addStorageListener = (
  key: string, 
  callback: (newValue: any, oldValue: any) => void
): () => void => {
  const listener: StorageListener = { key, callback }
  listeners.push(listener)
  
  // 返回移除监听器的函数
  return () => {
    const index = listeners.findIndex(l => l.key === key && l.callback === callback)
    if (index > -1) {
      listeners.splice(index, 1)
    }
  }
}

/**
 * 触发存储变化
 */
export const triggerStorageChange = (key: string, newValue: any, oldValue: any): void => {
  listeners
    .filter(listener => listener.key === key)
    .forEach(listener => listener.callback(newValue, oldValue))
}

// 存储工具 Hook（用于 React 组件）

/**
 * 存储 Hook
 */
export const useStorage = <T = any>(
  key: string, 
  defaultValue: T,
  options: StorageOptions = {}
) => {
  const [value, setValue] = React.useState<T>(() => {
    const stored = getStorageValue<T>(key, options)
    return stored !== null ? stored : defaultValue
  })
  
  const setStoredValue = React.useCallback((newValue: T) => {
    setStorage(key, newValue, options)
    setValue(newValue)
    triggerStorageChange(key, newValue, value)
  }, [key, options, value])
  
  const removeValue = React.useCallback(() => {
    removeStorage(key, options)
    setValue(defaultValue)
    triggerStorageChange(key, defaultValue, value)
  }, [key, options, defaultValue, value])
  
  React.useEffect(() => {
    const removeListener = addStorageListener(key, (newValue) => {
      setValue(newValue)
    })
    
    return removeListener
  }, [key])
  
  return [value, setStoredValue, removeValue] as const
}

// 导入 React 用于 Hook
import React from 'react'
