/**
 * 品牌相关 API
 */

import { apiCall, ApiConfig } from './base'
import * as firestoreService from '../firebase/firestore'
import type { Brand } from '../../types'

/**
 * 获取品牌列表
 */
export const getBrandList = (config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.getAllBrands(),
    config
  )
}

/**
 * 获取品牌详情
 */
export const getBrandById = (brandId: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.getBrandById(brandId),
    config
  )
}

/**
 * 创建品牌
 */
export const createBrand = (brandData: Omit<Brand, 'id'>, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.createBrand(brandData),
    {
      showSuccess: true,
      successMessage: '品牌创建成功',
      ...config
    }
  )
}

/**
 * 更新品牌
 */
export const updateBrand = (brandId: string, brandData: Partial<Brand>, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.updateBrand(brandId, brandData),
    {
      showSuccess: true,
      successMessage: '品牌更新成功',
      ...config
    }
  )
}

/**
 * 删除品牌
 */
export const deleteBrand = (brandId: string, config?: ApiConfig) => {
  return apiCall(
    () => firestoreService.deleteBrand(brandId),
    {
      showSuccess: true,
      successMessage: '品牌删除成功',
      ...config
    }
  )
}

/**
 * 批量删除品牌
 */
export const batchDeleteBrands = (brandIds: string[], config?: ApiConfig) => {
  return apiCall(
    async () => {
      const results = await Promise.all(
        brandIds.map(id => firestoreService.deleteBrand(id))
      )
      return results
    },
    {
      showSuccess: true,
      successMessage: `成功删除 ${brandIds.length} 个品牌`,
      ...config
    }
  )
}

/**
 * 搜索品牌
 */
export const searchBrands = (keyword: string, config?: ApiConfig) => {
  return apiCall(
    async () => {
      const brands = await firestoreService.getAllBrands()
      
      if (!keyword) return brands

      const lowerKeyword = keyword.toLowerCase()
      return brands.filter((brand: Brand) =>
        brand.name?.toLowerCase().includes(lowerKeyword) ||
        brand.description?.toLowerCase().includes(lowerKeyword) ||
        brand.country?.toLowerCase().includes(lowerKeyword)
      )
    },
    config
  )
}

