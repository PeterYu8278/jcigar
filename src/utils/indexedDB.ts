/**
 * IndexedDB 工具函数
 * 用于在 Service Worker 和主线程之间共享 appConfig
 */

const DB_NAME = 'CigarAppDB'
const DB_VERSION = 1
const STORE_NAME = 'appConfig'

/**
 * 打开 IndexedDB 数据库
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

/**
 * 存储 appConfig 到 IndexedDB
 * @param appConfig 应用配置
 */
export const saveAppConfigToIndexedDB = async (appConfig: any): Promise<void> => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    await new Promise<void>((resolve, reject) => {
      const request = store.put({ id: 'current', config: appConfig, updatedAt: Date.now() })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to save appConfig to IndexedDB'))
    })

    db.close()
  } catch (error) {
    console.error('[IndexedDB] 保存 appConfig 失败:', error)
    throw error
  }
}

/**
 * 从 IndexedDB 读取 appConfig
 * @returns appConfig 或 null
 */
export const getAppConfigFromIndexedDB = async (): Promise<any | null> => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    const result = await new Promise<any | null>((resolve, reject) => {
      const request = store.get('current')
      request.onsuccess = () => {
        resolve(request.result?.config || null)
      }
      request.onerror = () => {
        reject(new Error('Failed to read appConfig from IndexedDB'))
      }
    })

    db.close()
    return result
  } catch (error) {
    console.error('[IndexedDB] 读取 appConfig 失败:', error)
    return null
  }
}

