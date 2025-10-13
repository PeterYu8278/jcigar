/**
 * 雪茄相关 API
 */

import { apiCall, type ApiConfig } from './base'
import * as firestoreService from '../firebase/firestore'
import type { Cigar } from '../../types'

/**
 * 获取雪茄列表
 */
export const getCigarList = (config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.getCigars(),
    config
  )
}

/**
 * 根据品牌获取雪茄列表
 */
export const getCigarsByBrand = (brandId: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.getCigarsByBrand(brandId),
    config
  )
}

/**
 * 获取雪茄详情
 */
export const getCigarById = (cigarId: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.getCigarById(cigarId),
    config
  )
}

/**
 * 创建雪茄
 */
export const createCigar = (cigarData: Omit<Cigar, 'id'>, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.createDocument('cigars', cigarData),
    {
      showSuccess: true,
      successMessage: '雪茄创建成功',
      ...config
    }
  )
}

/**
 * 更新雪茄
 */
export const updateCigar = (cigarId: string, cigarData: Partial<Cigar>, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.updateDocument('cigars', cigarId, cigarData),
    {
      showSuccess: true,
      successMessage: '雪茄更新成功',
      ...config
    }
  )
}

/**
 * 删除雪茄
 */
export const deleteCigar = (cigarId: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.deleteDocument('cigars', cigarId),
    {
      showSuccess: true,
      successMessage: '雪茄删除成功',
      ...config
    }
  )
}

/**
 * 批量删除雪茄
 */
export const batchDeleteCigars = (cigarIds: string[], config?: ApiConfig) => {
  return apiCall(
    async () => {
      const results = await Promise.all(
        cigarIds.map(id => firestoreService.deleteDocument('cigars', id))
      )
      return results
    },
    {
      showSuccess: true,
      successMessage: `成功删除 ${cigarIds.length} 个雪茄`,
      ...config
    }
  )
}

/**
 * 搜索雪茄
 */
export const searchCigars = (keyword: string, config?: ApiConfig) => {
  return apiCall(
    async () => {
      const cigars = await firestoreService.getCigars()
      
      if (!keyword) return cigars

      const lowerKeyword = keyword.toLowerCase()
      return cigars.filter((cigar: Cigar) =>
        cigar.name?.toLowerCase().includes(lowerKeyword) ||
        cigar.description?.toLowerCase().includes(lowerKeyword) ||
        cigar.brand?.toLowerCase().includes(lowerKeyword)
      )
    },
    config
  )
}

/**
 * 更新雪茄库存
 */
export const updateCigarStock = (
  cigarId: string,
  stock: number,
  config?: ApiConfig
) => {
  return apiCall(
    () => firestoreService.updateDocument('cigars', cigarId, { stock }),
    {
      showSuccess: true,
      successMessage: '库存更新成功',
      ...config
    }
  )
}

/**
 * 批量更新雪茄库存
 */
export const batchUpdateCigarStock = (
  updates: Array<{ cigarId: string; stock: number }>,
  config?: ApiConfig
) => {
  return apiCall(
    async () => {
      const results = await Promise.all(
        updates.map(({ cigarId, stock }) =>
          firestoreService.updateDocument('cigars', cigarId, { stock })
        )
      )
      return results
    },
    {
      showSuccess: true,
      successMessage: `成功更新 ${updates.length} 个雪茄的库存`,
      ...config
    }
  )
}

