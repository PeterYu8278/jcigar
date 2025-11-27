// 用户生成器
import { collection, addDoc, Timestamp, getDocs, query, limit } from 'firebase/firestore'
import { db } from '../../../../config/firebase'
import { GLOBAL_COLLECTIONS } from '../../../../config/globalCollections'
import type { User } from '../../../../types'
import { removeUndefined } from './utils'

const FIRST_NAMES = [
  'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Emma',
  'Robert', 'Olivia', 'William', 'Sophia', 'Richard', 'Isabella', 'Joseph', 'Ava',
  'Thomas', 'Mia', 'Charles', 'Charlotte', 'Daniel', 'Amelia', 'Matthew', 'Harper',
  'Anthony', 'Evelyn', 'Mark', 'Abigail', 'Donald', 'Elizabeth', 'Steven', 'Sofia'
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
  'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez',
  'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King'
]

const PHONE_PREFIXES = ['601', '6012', '6013', '6014', '6016', '6017', '6018', '6019']

/**
 * 生成6位Base36编码的会员ID
 */
function generateMemberId(index: number): string {
  const base36 = index.toString(36).toUpperCase()
  return base36.padStart(6, '0').substring(0, 6)
}

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
 * 生成随机手机号
 */
function generatePhoneNumber(): string {
  const prefix = PHONE_PREFIXES[Math.floor(Math.random() * PHONE_PREFIXES.length)]
  const suffix = Math.floor(1000000 + Math.random() * 9000000).toString()
  return prefix + suffix.substring(prefix.length === 3 ? 0 : 1)
}

/**
 * 生成用户数据
 */
function generateUserData(
  index: number,
  referrers: Array<{ id: string; memberId?: string; createdAt: Date }>
): Omit<User, 'id'> {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
  const displayName = `${firstName} ${lastName}`
  const email = `user${index}@test.com`
  const memberId = generateMemberId(index)
  const createdAt = randomDateInLast18Months()
  
  // 角色分布：95% member, 3% vip, 1% admin, 1% guest
  const roleRand = Math.random()
  const role = roleRand < 0.95 ? 'member' :
               roleRand < 0.98 ? 'vip' :
               roleRand < 0.99 ? 'admin' : 'guest'
  
  // 状态分布：90% active, 8% inactive, 2% suspended
  const statusRand = Math.random()
  const status = statusRand < 0.9 ? 'active' :
                 statusRand < 0.98 ? 'inactive' : 'suspended'

  // 推荐关系：前2000个作为推荐人，后续8000个随机分配推荐人
  let referral = null
  if (index >= 2000 && referrers.length > 0) {
    const referrer = referrers[Math.floor(Math.random() * referrers.length)]
    if (referrer.memberId && referrer.createdAt < createdAt) {
      referral = {
        referredBy: referrer.memberId,
        referredByUserId: referrer.id,
        referralDate: createdAt,
        referrals: [],
        totalReferred: 0,
        activeReferrals: 0
      }
    }
  }

  // 会员等级分布
  const levelRand = Math.random()
  const level = levelRand < 0.4 ? 'bronze' :
                levelRand < 0.7 ? 'silver' :
                levelRand < 0.9 ? 'gold' : 'platinum'

  return {
    email,
    displayName,
    role,
    status,
    memberId,
    referral: referral || {
      referredBy: null,
      referredByUserId: null,
      referralDate: null,
      referrals: [],
      totalReferred: 0,
      activeReferrals: 0
    },
    membership: {
      level,
      joinDate: createdAt,
      lastActive: createdAt,
      points: 0,
      referralPoints: 0,
      totalVisitHours: 0
    },
    profile: {
      phone: generatePhoneNumber()
    },
    createdAt,
    updatedAt: createdAt
  }
}

/**
 * 批量生成用户
 */
export async function generateUsers(
  count: number,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const batchSize = 500
    let generated = 0
    const referrers: Array<{ id: string; memberId?: string; createdAt: Date }> = []

    for (let i = 0; i < count; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, count - i)

      for (let j = 0; j < currentBatchSize; j++) {
        const userData = generateUserData(i + j, referrers)
        
        // 清理 undefined 值
        const cleanUserData = removeUndefined(userData)
        
        const docRef = await addDoc(collection(db, GLOBAL_COLLECTIONS.USERS), {
          ...cleanUserData,
          createdAt: Timestamp.fromDate(userData.createdAt),
          updatedAt: Timestamp.fromDate(userData.updatedAt)
        })

        // 前2000个用户作为推荐人
        if (i + j < 2000) {
          referrers.push({
            id: docRef.id,
            memberId: userData.memberId,
            createdAt: userData.createdAt
          })
        }
      }

      generated += currentBatchSize
      const progress = Math.round((generated / count) * 100)
      onProgress?.(progress)
    }

    return { success: true, count: generated }
  } catch (error: any) {
    return { success: false, error: error.message || '生成用户失败' }
  }
}

