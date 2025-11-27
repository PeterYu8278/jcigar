// 雪茄产品生成器
import { collection, addDoc, Timestamp, getDocs, query, limit } from 'firebase/firestore'
import { db } from '../../../../config/firebase'
import { GLOBAL_COLLECTIONS } from '../../../../config/globalCollections'
import type { Cigar, Brand } from '../../../../types'

const ORIGINS = [
  'Cuba', 'Dominican Republic', 'Nicaragua', 'Honduras', 'Mexico',
  'Ecuador', 'Brazil', 'Costa Rica', 'Panama', 'Colombia'
]

const SIZES = [
  'Robusto', 'Toro', 'Churchill', 'Corona', 'Petit Corona',
  'Lancero', 'Belicoso', 'Toro Gordo', 'Double Corona', 'Panatela'
]

const STRENGTHS: Array<'mild' | 'medium' | 'full'> = ['mild', 'medium', 'full']

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
 * 生成雪茄数据
 */
function generateCigarData(
  index: number,
  brands: Brand[]
): Omit<Cigar, 'id'> {
  const brand = brands[Math.floor(Math.random() * brands.length)]
  const origin = ORIGINS[Math.floor(Math.random() * ORIGINS.length)]
  const size = SIZES[Math.floor(Math.random() * SIZES.length)]
  const strength = STRENGTHS[Math.floor(Math.random() * STRENGTHS.length)]
  const price = 50 + Math.floor(Math.random() * 450) // 50-500 RM
  const createdAt = randomDateInLast18Months()
  const status = Math.random() > 0.1 ? 'active' : 'inactive'

  return {
    name: `${brand.name} ${size} ${index}`,
    brand: brand.name,
    brandId: brand.id,
    origin,
    size,
    strength,
    price,
    images: [],
    description: `Premium ${strength} strength cigar from ${origin}, ${size} size.`,
    inventory: {
      stock: 0, // 后续通过入库记录更新
      reserved: 0,
      minStock: 10 + Math.floor(Math.random() * 40)
    },
    status,
    createdAt,
    updatedAt: createdAt
  }
}

/**
 * 批量生成雪茄产品
 */
export async function generateCigars(
  count: number,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    // 先获取所有品牌
    const brandsQuery = query(collection(db, GLOBAL_COLLECTIONS.BRANDS), limit(300))
    const brandsSnapshot = await getDocs(brandsQuery)
    const brands = brandsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Brand))

    if (brands.length === 0) {
      return { success: false, error: '请先生成品牌数据' }
    }

    const batchSize = 500
    let generated = 0

    for (let i = 0; i < count; i += batchSize) {
      const batch = []
      const currentBatchSize = Math.min(batchSize, count - i)

      for (let j = 0; j < currentBatchSize; j++) {
        const cigarData = generateCigarData(i + j, brands)
        batch.push({
          ...cigarData,
          createdAt: Timestamp.fromDate(cigarData.createdAt),
          updatedAt: Timestamp.fromDate(cigarData.updatedAt)
        })
      }

      // 批量写入
      const promises = batch.map(data => 
        addDoc(collection(db, GLOBAL_COLLECTIONS.CIGARS), data)
      )
      await Promise.all(promises)

      generated += currentBatchSize
      const progress = Math.round((generated / count) * 100)
      onProgress?.(progress)
    }

    return { success: true, count: generated }
  } catch (error: any) {
    return { success: false, error: error.message || '生成雪茄产品失败' }
  }
}

