// 兑换记录生成器
import { doc, setDoc, Timestamp, getDocs, query, limit, where } from 'firebase/firestore'
import { db } from '../../../../config/firebase'
import { GLOBAL_COLLECTIONS } from '../../../../config/globalCollections'
import type { RedemptionRecordDocument, RedemptionRecordItem, VisitSession, Cigar } from '../../../../types'

/**
 * 批量生成兑换记录
 */
export async function generateRedemptions(
  targetCount: number,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    // 获取所有有兑换的驻店记录
    const sessionsQuery = query(
      collection(db, GLOBAL_COLLECTIONS.VISIT_SESSIONS),
      where('status', '==', 'completed'),
      limit(200000)
    )
    const sessionsSnapshot = await getDocs(sessionsQuery)
    const sessions = sessionsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        checkInAt: data.checkInAt?.toDate?.() || new Date(data.checkInAt),
        checkOutAt: data.checkOutAt?.toDate?.() || new Date(data.checkOutAt),
        redemptions: data.redemptions?.map((r: any) => ({
          ...r,
          redeemedAt: r.redeemedAt?.toDate?.() || new Date(r.redeemedAt)
        }))
      } as VisitSession
    }).filter(s => s.redemptions && s.redemptions.length > 0)

    if (sessions.length === 0) {
      return { success: false, error: '请先生成驻店记录数据（包含兑换项）' }
    }

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

    const cigarMap = new Map(cigars.map(c => [c.id, c]))

    let generated = 0
    const batchSize = 100

    // 按 visitSessionId 组织兑换记录
    for (let i = 0; i < Math.min(sessions.length, targetCount / 2); i++) {
      const session = sessions[i]
      if (!session.redemptions || session.redemptions.length === 0) continue

      const redemptionItems: RedemptionRecordItem[] = []
      const dayKey = session.checkInAt.toISOString().split('T')[0]
      const hourKey = session.checkInAt.toISOString().split(':')[0]

      for (let j = 0; j < session.redemptions.length; j++) {
        const redemption = session.redemptions[j]
        const cigar = cigarMap.get(redemption.cigarId)
        if (!cigar) continue

        const recordItem: RedemptionRecordItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: session.userId,
          userName: session.userName,
          cigarId: redemption.cigarId,
          cigarName: cigar.name,
          quantity: redemption.quantity,
          status: 'completed',
          dayKey,
          hourKey,
          redemptionIndex: j + 1,
          redeemedAt: redemption.redeemedAt,
          redeemedBy: redemption.redeemedBy || 'system',
          createdAt: redemption.redeemedAt,
          updatedAt: redemption.redeemedAt
        }

        redemptionItems.push(recordItem)
        generated++
      }

      if (redemptionItems.length > 0) {
        const recordDoc: Omit<RedemptionRecordDocument, 'id'> = {
          visitSessionId: session.id,
          userId: session.userId,
          userName: session.userName,
          redemptions: redemptionItems,
          createdAt: session.checkInAt,
          updatedAt: session.checkOutAt || session.checkInAt
        }

        // 使用 visitSessionId 作为文档ID
        await setDoc(doc(db, GLOBAL_COLLECTIONS.REDEMPTION_RECORDS, session.id), {
          ...recordDoc,
          redemptions: recordDoc.redemptions.map(r => ({
            ...r,
            redeemedAt: Timestamp.fromDate(r.redeemedAt),
            createdAt: Timestamp.fromDate(r.createdAt),
            updatedAt: r.updatedAt ? Timestamp.fromDate(r.updatedAt) : undefined
          })),
          createdAt: Timestamp.fromDate(recordDoc.createdAt),
          updatedAt: Timestamp.fromDate(recordDoc.updatedAt)
        })
      }

      if ((i + 1) % batchSize === 0) {
        const progress = Math.round(((i + 1) / Math.min(sessions.length, targetCount / 2)) * 100)
        onProgress?.(progress)
      }
    }

    const progress = 100
    onProgress?.(progress)

    return { success: true, count: generated }
  } catch (error: any) {
    return { success: false, error: error.message || '生成兑换记录失败' }
  }
}

