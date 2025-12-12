/**
 * 统一状态管理工具
 * 提供标准化的 Zustand store 创建和管理
 */

import { create, StateCreator } from 'zustand'
import { persist, PersistOptions, createJSONStorage } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Store 配置选项
export interface StoreConfig<T> {
  name: string
  persist?: boolean
  persistOptions?: Partial<PersistOptions<T>>
  devtools?: boolean
  immer?: boolean
}

// Store 基础类型
export interface BaseStore {
  _meta?: {
    name: string
    version: number
    lastUpdated: number
  }
  reset?: () => void
}

/**
 * 创建标准化的 Store
 */
export const createStore = <T extends BaseStore>(
  stateCreator: StateCreator<T>,
  config: StoreConfig<T>
) => {
  let creator = stateCreator

  // 添加 immer 中间件
  if (config.immer !== false) {
    creator = immer(creator as any) as any as StateCreator<T>
  }

  // 添加 devtools 中间件
  if (config.devtools !== false && import.meta.env.DEV) {
    creator = devtools(creator, { name: config.name }) as any as StateCreator<T>
  }

  // 添加 persist 中间件
  if (config.persist) {
    creator = persist(creator, {
      name: `${config.name}-storage`,
      storage: createJSONStorage(() => localStorage) as any,
      ...config.persistOptions
    }) as any as StateCreator<T>
  }

  return create<T>()(creator)
}

/**
 * 创建带元数据的 Store
 */
export const createStoreWithMeta = <T extends BaseStore>(
  stateCreator: StateCreator<T>,
  config: StoreConfig<T>
) => {
  const enhancedCreator: StateCreator<T> = (set, get, api) => {
    const initialState = stateCreator(set, get, api)

    return {
      ...initialState,
      _meta: {
        name: config.name,
        version: 1,
        lastUpdated: Date.now()
      },
      reset: () => {
        set(initialState as any)
      }
    } as T
  }

  return createStore(enhancedCreator, config)
}

/**
 * Store 工厂函数
 */
export const storeFactory = {
  /**
   * 创建简单 Store
   */
  simple: <T extends BaseStore>(
    name: string,
    initialState: Omit<T, keyof BaseStore>
  ) => {
    return createStoreWithMeta<T>(
      (set) => ({
        ...initialState,
        reset: () => set(initialState as any)
      } as T),
      { name, persist: false, devtools: true }
    )
  },

  /**
   * 创建持久化 Store
   */
  persisted: <T extends BaseStore>(
    name: string,
    initialState: Omit<T, keyof BaseStore>,
    persistOptions?: Partial<PersistOptions<T>>
  ) => {
    return createStoreWithMeta<T>(
      (set) => ({
        ...initialState,
        reset: () => set(initialState as any)
      } as T),
      { name, persist: true, persistOptions, devtools: true }
    )
  },

  /**
   * 创建复杂 Store（带自定义逻辑）
   */
  complex: <T extends BaseStore>(
    name: string,
    stateCreator: StateCreator<T>,
    options: Partial<StoreConfig<T>> = {}
  ) => {
    return createStoreWithMeta<T>(stateCreator, {
      name,
      ...options
    })
  }
}

/**
 * Store 组合器
 */
export const combineStores = <T extends Record<string, any>>(
  stores: T
): (() => { [K in keyof T]: ReturnType<T[K]> }) => {
  return () => {
    const combined: any = {}
    Object.keys(stores).forEach((key) => {
      combined[key] = stores[key]()
    })
    return combined
  }
}

/**
 * Store 选择器工具
 */
export const createSelector = <T, R>(
  selector: (state: T) => R,
  equalityFn?: (a: R, b: R) => boolean
) => {
  let lastResult: R | undefined
  let lastState: T | undefined

  return (state: T): R => {
    if (state === lastState) {
      return lastResult!
    }

    const result = selector(state)

    if (equalityFn && lastResult !== undefined) {
      if (equalityFn(result, lastResult)) {
        return lastResult
      }
    }

    lastState = state
    lastResult = result
    return result
  }
}

/**
 * 浅比较工具
 */
export const shallowEqual = <T>(objA: T, objB: T): boolean => {
  if (Object.is(objA, objB)) {
    return true
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false
  }

  const keysA = Object.keys(objA)
  const keysB = Object.keys(objB)

  if (keysA.length !== keysB.length) {
    return false
  }

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i]
    if (
      !Object.prototype.hasOwnProperty.call(objB, key) ||
      !Object.is((objA as any)[key], (objB as any)[key])
    ) {
      return false
    }
  }

  return true
}

/**
 * Store 订阅工具
 */
export const createStoreSubscriber = <T>(store: any) => {
  return {
    /**
     * 订阅特定字段的变化
     */
    subscribeField: <K extends keyof T>(
      field: K,
      callback: (value: T[K], prevValue: T[K]) => void
    ) => {
      let prevValue = store.getState()[field]

      return store.subscribe((state: T) => {
        const currentValue = state[field]
        if (currentValue !== prevValue) {
          callback(currentValue, prevValue)
          prevValue = currentValue
        }
      })
    },

    /**
     * 订阅多个字段的变化
     */
    subscribeFields: <K extends keyof T>(
      fields: K[],
      callback: (changes: Partial<T>, prevState: Partial<T>) => void
    ) => {
      let prevState: Partial<T> = {}
      fields.forEach(field => {
        prevState[field] = store.getState()[field]
      })

      return store.subscribe((state: T) => {
        const changes: Partial<T> = {}
        let hasChanges = false

        fields.forEach(field => {
          if (state[field] !== prevState[field]) {
            changes[field] = state[field]
            hasChanges = true
          }
        })

        if (hasChanges) {
          callback(changes, prevState)
          fields.forEach(field => {
            prevState[field] = state[field]
          })
        }
      })
    },

    /**
     * 订阅基于条件的变化
     */
    subscribeWhen: (
      condition: (state: T) => boolean,
      callback: (state: T) => void
    ) => {
      return store.subscribe((state: T) => {
        if (condition(state)) {
          callback(state)
        }
      })
    }
  }
}

/**
 * Store 调试工具
 */
export const createStoreDebugger = <T extends object>(store: any, name: string) => {
  if (!import.meta.env.DEV) return

  return {
    /**
     * 记录所有状态变化
     */
    logChanges: () => {
      return store.subscribe((state: T, prevState: T) => {
        console.group(`[${name}] State Changed`)
        console.groupEnd()
      })
    },

    /**
     * 获取当前状态快照
     */
    snapshot: () => {
      const state = store.getState()
      return state
    },

    /**
     * 比较两个状态
     */
    compare: (stateA: T, stateB: T) => {
      const differences: Partial<Record<keyof T, { old: any; new: any }>> = {}

      Object.keys(stateA as object).forEach((key) => {
        const k = key as keyof T
        if (stateA[k] !== stateB[k]) {
          differences[k] = { old: stateA[k], new: stateB[k] }
        }
      })

      return differences
    },

    /**
     * 性能分析
     */
    profile: (operation: () => void) => {
      const start = performance.now()
      operation()
      const end = performance.now()
    }
  }
}

/**
 * Store 测试工具
 */
export const createStoreTestUtils = <T>(store: any) => {
  return {
    /**
     * 重置到初始状态
     */
    reset: () => {
      const state = store.getState()
      if (state.reset) {
        state.reset()
      }
    },

    /**
     * 设置测试状态
     */
    setState: (partial: Partial<T>) => {
      store.setState(partial)
    },

    /**
     * 获取当前状态
     */
    getState: (): T => {
      return store.getState()
    },

    /**
     * 等待状态更新
     */
    waitForState: async (
      condition: (state: T) => boolean,
      timeout: number = 5000
    ): Promise<T> => {
      return new Promise((resolve, reject) => {
        const state = store.getState()
        if (condition(state)) {
          resolve(state)
          return
        }

        const timer = setTimeout(() => {
          unsubscribe()
          reject(new Error('Timeout waiting for state'))
        }, timeout)

        const unsubscribe = store.subscribe((newState: T) => {
          if (condition(newState)) {
            clearTimeout(timer)
            unsubscribe()
            resolve(newState)
          }
        })
      })
    }
  }
}

export default {
  createStore,
  createStoreWithMeta,
  storeFactory,
  combineStores,
  createSelector,
  shallowEqual,
  createStoreSubscriber,
  createStoreDebugger,
  createStoreTestUtils
}
