// 出库订单生成器
import { doc, addDoc, Timestamp, getDocs, query, limit, where, collection } from 'firebase/firestore'
import { db } from '../../../../config/firebase'
import { GLOBAL_COLLECTIONS } from '../../../../config/globalCollections'
import type { OutboundOrder, Order, InventoryMovement } from '../../../../types'
import { removeUndefined } from './utils'

/**
 * 批量生成出库订单
 */
export async function generateOutboundOrders(
  count: number,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    // 获取所有兑换订单
    const ordersQuery = query(
      collection(db, GLOBAL_COLLECTIONS.ORDERS),
      where('source.type', '==', 'direct'),
      limit(200000)
    )
    const ordersSnapshot = await getDocs(ordersQuery)
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order)).filter(o => o.source?.type === 'direct' && o.total === 0)

    if (orders.length === 0) {
      return { success: false, error: '请先生成兑换订单数据' }
    }

    let generated = 0
    const batchSize = 100

    for (let i = 0; i < Math.min(orders.length, count); i++) {
      const order = orders[i]
      if (!order.items || order.items.length === 0) continue

      const createdAt = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt)
      const dateStr = createdAt.toISOString().split('T')[0].replace(/-/g, '')
      const seq = String(i + 1).padStart(4, '0')
      const referenceNo = `OUT-${dateStr}-${seq}`

      const outboundItems = order.items.map(item => ({
        cigarId: item.cigarId,
        cigarName: item.name || 'Unknown',
        itemType: 'cigar' as const,
        quantity: item.quantity,
        unitPrice: 0,
        subtotal: 0
      }))

      const orderData: Omit<OutboundOrder, 'id'> = {
        referenceNo,
        type: 'sale',
        reason: '驻店兑换',
        items: outboundItems,
        totalQuantity: outboundItems.reduce((sum, item) => sum + item.quantity, 0),
        totalValue: 0,
        orderId: order.id,
        userId: order.userId,
        userName: undefined,
        eventId: undefined,
        status: 'completed',
        operatorId: 'system',
        createdAt,
        updatedAt: createdAt
      }

      const data = removeUndefined({
        ...orderData,
        createdAt: Timestamp.fromDate(createdAt),
        updatedAt: Timestamp.fromDate(createdAt)
      })
      const orderRef = await addDoc(collection(db, GLOBAL_COLLECTIONS.OUTBOUND_ORDERS), data)

      // 创建 inventory_movements 记录
      for (const item of outboundItems) {
        const movement: Omit<InventoryMovement, 'id'> = {
          cigarId: item.cigarId,
          cigarName: item.cigarName,
          itemType: 'cigar',
          type: 'out',
          quantity: item.quantity,
          referenceNo,
          orderType: 'outbound',
          outboundOrderId: orderRef.id,
          reason: '驻店兑换',
          unitPrice: 0,
          createdAt
        }

        await addDoc(collection(db, GLOBAL_COLLECTIONS.INVENTORY_MOVEMENTS), {
          ...movement,
          createdAt: Timestamp.fromDate(createdAt)
        })
      }

      generated++

      if (generated % batchSize === 0) {
        const progress = Math.round((generated / Math.min(orders.length, count)) * 100)
        onProgress?.(progress)
      }
    }

    const progress = 100
    onProgress?.(progress)

    return { success: true, count: generated }
  } catch (error: any) {
    return { success: false, error: error.message || '生成出库订单失败' }
  }
}

