// 品牌生成器
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../../config/firebase'
import { GLOBAL_COLLECTIONS } from '../../../../config/globalCollections'
import type { Brand } from '../../../../types'

const BRAND_NAMES = [
  'Cohiba', 'Montecristo', 'Romeo y Julieta', 'Partagas', 'H. Upmann',
  'Punch', 'Bolivar', 'Hoyo de Monterrey', 'Quai d\'Orsay', 'Ramon Allones',
  'Trinidad', 'San Cristobal', 'El Rey del Mundo', 'La Gloria Cubana', 'Vegas Robaina',
  'Padron', 'Arturo Fuente', 'Drew Estate', 'My Father', 'Oliva',
  'Rocky Patel', 'Alec Bradley', 'Perdomo', 'CAO', 'Macanudo',
  'Davidoff', 'Ashton', 'La Flor Dominicana', 'Tatuaje', 'Crowned Heads'
]

const COUNTRIES = [
  'Cuba', 'Dominican Republic', 'Nicaragua', 'Honduras', 'Mexico',
  'Ecuador', 'Brazil', 'Costa Rica', 'Panama', 'Colombia'
]

const TAGS = [
  'Premium', 'Limited Edition', 'Vintage', 'Aged', 'Handmade',
  'Cuban', 'Dominican', 'Nicaraguan', 'Full Body', 'Medium Body', 'Mild'
]

/**
 * 生成随机日期（过去18个月）
 */
function randomDateInLast18Months(): Date {
  const now = new Date()
  const monthsAgo = 18
  const startDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
  const endDate = now
  const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
  return new Date(randomTime)
}

/**
 * 生成品牌数据
 */
function generateBrandData(index: number): Omit<Brand, 'id'> {
  const name = `${BRAND_NAMES[index % BRAND_NAMES.length]} ${index > BRAND_NAMES.length ? Math.floor(index / BRAND_NAMES.length) + 1 : ''}`.trim()
  const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)]
  const foundedYear = 1800 + Math.floor(Math.random() * 220)
  const status = Math.random() > 0.1 ? 'active' : 'inactive'
  const createdAt = randomDateInLast18Months()

  return {
    name,
    description: `${name} is a premium cigar brand from ${country}, established in ${foundedYear}.`,
    country,
    foundedYear,
    status,
    metadata: {
      totalProducts: 0,
      totalSales: 0,
      rating: 3.5 + Math.random() * 1.5,
      tags: TAGS.slice(0, Math.floor(Math.random() * 3) + 1)
    },
    createdAt,
    updatedAt: createdAt
  }
}

/**
 * 批量生成品牌
 */
export async function generateBrands(
  count: number,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const batchSize = 500
    let generated = 0

    for (let i = 0; i < count; i += batchSize) {
      const batch = []
      const currentBatchSize = Math.min(batchSize, count - i)

      for (let j = 0; j < currentBatchSize; j++) {
        const brandData = generateBrandData(i + j)
        batch.push({
          ...brandData,
          createdAt: Timestamp.fromDate(brandData.createdAt),
          updatedAt: Timestamp.fromDate(brandData.updatedAt)
        })
      }

      // 批量写入
      const promises = batch.map(data => 
        addDoc(collection(db, GLOBAL_COLLECTIONS.BRANDS), data)
      )
      await Promise.all(promises)

      generated += currentBatchSize
      const progress = Math.round((generated / count) * 100)
      onProgress?.(progress)
    }

    return { success: true, count: generated }
  } catch (error: any) {
    return { success: false, error: error.message || '生成品牌失败' }
  }
}

