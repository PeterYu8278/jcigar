// 入库记录生成器
import { collection, addDoc, doc, updateDoc, Timestamp, getDocs, query, limit } from 'firebase/firestore'
import { db } from '../../../../config/firebase'
import { GLOBAL_COLLECTIONS } from '../../../../config/globalCollections'
import type { InboundOrder, Cigar, InventoryMovement } from '../../../../types'

const SUPPLIER_NAMES = [
  'Premium Cigar Distributors', 'Cuban Cigar Imports', 'Tobacco Wholesale Co.',
  'Luxury Cigar Suppliers', 'International Tobacco Group', 'Cigar Masters Ltd.'
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
 * 生成入库记录
 */
export async function generateInboundOrders(
  orderCount: number,
  totalStock: number,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    // 获取所有雪茄产品
    const cigarsQuery = query(collection(db, GLOBAL_COLLECTIONS.CIGARS), limit(3000))
    const cigarsSnapshot = await getDocs(cigarsQuery)
    const cigars = cigarsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Cigar))

    if (cigars.length === 0) {
      return { success: false, error: '请先生成雪茄产品数据' }
    }

    // 库存分配策略：加权随机分配
    const stockAllocation = new Map<string, number>() // cigarId -> quantity
    let remainingStock = totalStock

    // 为每个雪茄分配权重（基于价格，价格越高权重越大）
    const weights = cigars.map(c => ({
      cigar: c,
      weight: c.price || 100
    }))

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)

    // 生成入库订单并分配库存
    const batchSize = 100
    let generated = 0
    const stockUpdates = new Map<string, number>() // cigarId -> totalStock

    for (let i = 0; i < orderCount && remainingStock > 0; i++) {
      const orderItems: InboundOrder['items'] = []
      const itemCount = Math.min(1 + Math.floor(Math.random() * 10), Math.ceil(remainingStock / 100)) // 1-10个SKU

      for (let j = 0; j < itemCount && remainingStock > 0; j++) {
        // 加权随机选择雪茄
        let random = Math.random() * totalWeight
        let selectedCigar = weights[0].cigar
        for (const w of weights) {
          random -= w.weight
          if (random <= 0) {
            selectedCigar = w.cigar
            break
          }
        }

        // 计算分配数量（确保不超过剩余库存）
        const maxQuantity = Math.min(500, remainingStock)
        const quantity = Math.max(10, Math.floor(Math.random() * maxQuantity))

        const unitPrice = (selectedCigar.price || 100) * (0.8 + Math.random() * 0.4) // 入库价格波动
        const subtotal = quantity * unitPrice

        orderItems.push({
          cigarId: selectedCigar.id,
          cigarName: selectedCigar.name,
          itemType: 'cigar',
          quantity,
          unitPrice,
          subtotal
        })

        // 更新库存分配
        const currentStock = stockAllocation.get(selectedCigar.id) || 0
        stockAllocation.set(selectedCigar.id, currentStock + quantity)
        remainingStock -= quantity
      }

      if (orderItems.length > 0) {
        const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0)
        const totalValue = orderItems.reduce((sum, item) => sum + (item.subtotal || 0), 0)
        const createdAt = randomDateInLast18Months()

        // 生成单号
        const dateStr = createdAt.toISOString().split('T')[0].replace(/-/g, '')
        const seq = String(i + 1).padStart(4, '0')
        const referenceNo = `IN-${dateStr}-${seq}`

        const orderData: Omit<InboundOrder, 'id'> = {
          referenceNo,
          type: 'purchase',
          reason: '采购入库',
          items: orderItems,
          totalQuantity,
          totalValue,
          status: 'completed',
          operatorId: 'system', // 系统生成
          supplier: {
            name: SUPPLIER_NAMES[Math.floor(Math.random() * SUPPLIER_NAMES.length)],
            contact: 'Supplier Contact',
            phone: '60123456789'
          },
          createdAt,
          updatedAt: createdAt
        }

        // 创建入库订单
        const orderRef = await addDoc(collection(db, GLOBAL_COLLECTIONS.INBOUND_ORDERS), {
          ...orderData,
          createdAt: Timestamp.fromDate(createdAt),
          updatedAt: Timestamp.fromDate(createdAt)
        })

        // 创建 inventory_movements 记录
        for (const item of orderItems) {
          const movement: Omit<InventoryMovement, 'id'> = {
            cigarId: item.cigarId,
            cigarName: item.cigarName,
            itemType: 'cigar',
            type: 'in',
            quantity: item.quantity,
            referenceNo,
            orderType: 'inbound',
            inboundOrderId: orderRef.id,
            reason: '采购入库',
            unitPrice: item.unitPrice,
            createdAt
          }

          await addDoc(collection(db, GLOBAL_COLLECTIONS.INVENTORY_MOVEMENTS), {
            ...movement,
            createdAt: Timestamp.fromDate(createdAt)
          })
        }

        generated++
      }

      if ((i + 1) % batchSize === 0 || i === orderCount - 1) {
        const progress = Math.round(((i + 1) / orderCount) * 100)
        onProgress?.(progress)
      }
    }

    // 批量更新雪茄产品库存
    const updatePromises: Promise<void>[] = []
    for (const [cigarId, quantity] of stockAllocation) {
      const cigarRef = doc(db, GLOBAL_COLLECTIONS.CIGARS, cigarId)
      updatePromises.push(
        updateDoc(cigarRef, {
          'inventory.stock': quantity,
          updatedAt: Timestamp.now()
        }).catch(err => {
          console.error(`更新雪茄 ${cigarId} 库存失败:`, err)
        })
      )
    }

    await Promise.all(updatePromises)

    return { success: true, count: generated }
  } catch (error: any) {
    return { success: false, error: error.message || '生成入库记录失败' }
  }
}

