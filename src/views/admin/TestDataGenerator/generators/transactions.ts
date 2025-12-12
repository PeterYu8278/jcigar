// 交易记录生成器
import { doc, setDoc, Timestamp, getDocs, query, limit, where, collection } from 'firebase/firestore'
import { db } from '../../../../config/firebase'
import { GLOBAL_COLLECTIONS } from '../../../../config/globalCollections'
import type { Transaction, Event, Order, MembershipFeeRecord } from '../../../../types'

/**
 * 生成交易记录ID（基于月份）
 */
function generateTransactionId(createdAt: Date, index: number): string {
  const year = createdAt.getFullYear()
  const month = String(createdAt.getMonth() + 1).padStart(2, '0')
  const seq = String(index + 1).padStart(4, '0')
  return `TXN-${year}-${month}-${seq}`
}

/**
 * 批量生成交易记录
 */
export async function generateTransactions(
  count: number,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    // 获取活动订单（用于生成活动收入）
    const eventOrdersQuery = query(
      collection(db, GLOBAL_COLLECTIONS.ORDERS),
      where('source.type', '==', 'event'),
      limit(30000)
    )
    const eventOrdersSnapshot = await getDocs(eventOrdersQuery)
    const eventOrders = eventOrdersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order))

    // 获取会员年费记录（用于生成会员收入）
    const feeRecordsQuery = query(
      collection(db, GLOBAL_COLLECTIONS.MEMBERSHIP_FEE_RECORDS),
      where('status', '==', 'paid'),
      limit(10000)
    )
    const feeRecordsSnapshot = await getDocs(feeRecordsQuery)
    const feeRecords = feeRecordsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        deductedAt: data.deductedAt?.toDate?.() || new Date(data.deductedAt),
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
      } as MembershipFeeRecord
    })

    let generated = 0
    const batchSize = 500

    // 生成活动收入交易记录（30,000条）
    for (let i = 0; i < Math.min(eventOrders.length, 30000); i++) {
      const order = eventOrders[i]
      const createdAt = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt)
      const transactionId = generateTransactionId(createdAt, generated)

      const transactionData: Transaction = {
        id: transactionId,
        type: 'event_fee',
        amount: order.total,
        currency: 'RM',
        description: `活动报名费 - 订单 ${order.orderNo}`,
        relatedId: order.source?.eventId,
        relatedOrders: [{
          orderId: order.id,
          amount: order.total
        }],
        userId: order.userId,
        createdAt
      }

      await setDoc(doc(db, 'transactions', transactionId), {
        ...transactionData,
        createdAt: Timestamp.fromDate(createdAt)
      })

      generated++

      if (generated % batchSize === 0) {
        const progress = Math.round((generated / count) * 100)
        onProgress?.(progress)
      }
    }

    // 生成会员收入交易记录（10,000条）
    for (let i = 0; i < Math.min(feeRecords.length, 10000); i++) {
      const feeRecord = feeRecords[i]
      const createdAt = feeRecord.deductedAt || feeRecord.createdAt
      const transactionId = generateTransactionId(createdAt, generated)

      const transactionData: Transaction = {
        id: transactionId,
        type: 'sale',
        amount: feeRecord.amount,
        currency: 'RM',
        description: `会员年费 - ${feeRecord.userName || feeRecord.userId}`,
        relatedId: feeRecord.id,
        userId: feeRecord.userId,
        createdAt
      }

      await setDoc(doc(db, 'transactions', transactionId), {
        ...transactionData,
        createdAt: Timestamp.fromDate(createdAt)
      })

      generated++

      if (generated % batchSize === 0) {
        const progress = Math.round((generated / count) * 100)
        onProgress?.(progress)
      }
    }

    // 生成其他收入交易记录（剩余数量）
    const remaining = count - generated
    for (let i = 0; i < remaining; i++) {
      const now = new Date()
      const monthsAgo = 18
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
      const randomTime = startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime())
      const createdAt = new Date(randomTime)
      const transactionId = generateTransactionId(createdAt, generated)

      const transactionData: Transaction = {
        id: transactionId,
        type: 'sale',
        amount: 100 + Math.floor(Math.random() * 900), // 100-1000 RM
        currency: 'RM',
        description: '其他收入',
        createdAt
      }

      await setDoc(doc(db, 'transactions', transactionId), {
        ...transactionData,
        createdAt: Timestamp.fromDate(createdAt)
      })

      generated++

      if (generated % batchSize === 0) {
        const progress = Math.round((generated / count) * 100)
        onProgress?.(progress)
      }
    }

    const progress = 100
    onProgress?.(progress)

    return { success: true, count: generated }
  } catch (error: any) {
    return { success: false, error: error.message || '生成交易记录失败' }
  }
}

