// 会员年费记录生成器
import { collection, addDoc, Timestamp, getDocs, query, limit } from 'firebase/firestore'
import { db } from '../../../../config/firebase'
import { GLOBAL_COLLECTIONS } from '../../../../config/globalCollections'
import type { MembershipFeeRecord, User } from '../../../../types'

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
 * 生成会员年费记录数据
 */
function generateMembershipFeeRecordData(
  user: User
): Omit<MembershipFeeRecord, 'id'> {
  const createdAt = randomDateInLast18Months()
  const renewalType = Math.random() > 0.3 ? 'initial' : 'renewal' // 70% 首次，30% 续费
  const dueDate = new Date(createdAt.getTime() + 365 * 24 * 60 * 60 * 1000) // 1年后
  
  // 年费金额：500-2000 积分
  const amount = 500 + Math.floor(Math.random() * 1500)
  
  // 状态：80% completed, 20% pending
  const status = Math.random() > 0.2 ? 'paid' : 'pending'
  const deductedAt = status === 'paid' 
    ? new Date(dueDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000) // 到期后0-30天
    : undefined

  const previousDueDate = renewalType === 'renewal' 
    ? new Date(createdAt.getTime() - 365 * 24 * 60 * 60 * 1000) // 1年前
    : undefined

  return {
    userId: user.id,
    userName: user.displayName,
    amount,
    dueDate,
    deductedAt,
    pointsRecordId: undefined, // 后续生成积分记录时更新
    status,
    renewalType,
    previousDueDate,
    createdAt,
    updatedAt: deductedAt || createdAt
  }
}

/**
 * 批量生成会员年费记录
 */
export async function generateMembershipFeeRecords(
  count: number,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    // 获取所有用户
    const usersQuery = query(collection(db, GLOBAL_COLLECTIONS.USERS), limit(10000))
    const usersSnapshot = await getDocs(usersQuery)
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User))

    if (users.length === 0) {
      return { success: false, error: '请先生成用户数据' }
    }

    // 每个用户至少1条记录，随机选择用户
    const shuffledUsers = [...users].sort(() => Math.random() - 0.5)
    const selectedUsers = shuffledUsers.slice(0, Math.min(count, users.length))

    const batchSize = 500
    let generated = 0

    for (let i = 0; i < selectedUsers.length; i += batchSize) {
      const batch = []
      const currentBatchSize = Math.min(batchSize, selectedUsers.length - i)

      for (let j = 0; j < currentBatchSize; j++) {
        const user = selectedUsers[i + j]
        const recordData = generateMembershipFeeRecordData(user)
        batch.push({
          ...recordData,
          dueDate: Timestamp.fromDate(recordData.dueDate),
          deductedAt: recordData.deductedAt ? Timestamp.fromDate(recordData.deductedAt) : undefined,
          previousDueDate: recordData.previousDueDate ? Timestamp.fromDate(recordData.previousDueDate) : undefined,
          createdAt: Timestamp.fromDate(recordData.createdAt),
          updatedAt: Timestamp.fromDate(recordData.updatedAt)
        })
      }

      // 批量写入
      const promises = batch.map(data => 
        addDoc(collection(db, GLOBAL_COLLECTIONS.MEMBERSHIP_FEE_RECORDS), data)
      )
      await Promise.all(promises)

      generated += currentBatchSize
      const progress = Math.round((generated / selectedUsers.length) * 100)
      onProgress?.(progress)
    }

    return { success: true, count: generated }
  } catch (error: any) {
    return { success: false, error: error.message || '生成会员年费记录失败' }
  }
}

