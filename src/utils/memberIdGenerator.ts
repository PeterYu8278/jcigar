/**
 * 会员ID生成器
 * 使用 Hash-Based 方案确保唯一性和字母数字混合
 */

import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * 从 Firebase UID 生成确定性的唯一会员ID
 * 
 * 原理：使用简单的哈希算法将 Firebase UID 转换为固定长度的会员ID
 * 格式：C + 5位字母数字混合（排除易混淆字符 I, O）
 * 
 * @param firebaseUid - Firebase 用户 UID
 * @returns 会员ID，例如：CA3F7, CB2K9, CX9P4
 * 
 * @example
 * ```ts
 * const memberId = generateMemberIdFromUID('a1b2c3d4e5f6g7h8')
 * console.log(memberId) // 'CA3F7'
 * ```
 */
export const generateMemberIdFromUID = (firebaseUid: string): string => {
  // 使用简单的哈希函数（适用于浏览器环境）
  let hash = 0
  for (let i = 0; i < firebaseUid.length; i++) {
    const char = firebaseUid.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  
  // 确保是正数
  hash = Math.abs(hash)
  
  // 转换为自定义 Base34 编码（排除易混淆的 I 和 O）
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ' // 34个字符
  let result = ''
  
  // 生成5位编码
  let num = hash
  for (let i = 0; i < 5; i++) {
    result = chars[num % chars.length] + result
    num = Math.floor(num / chars.length)
  }
  
  return `C${result}`
}

/**
 * 验证会员ID是否已存在于数据库中
 * 
 * @param memberId - 要验证的会员ID
 * @returns true = 唯一（不存在），false = 已存在
 * 
 * @example
 * ```ts
 * const isUnique = await validateMemberIdUniqueness('CA3F7')
 * if (isUnique) {
 *   console.log('可以使用此ID')
 * }
 * ```
 */
export const validateMemberIdUniqueness = async (memberId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'users'),
      where('memberId', '==', memberId),
      limit(1)
    )
    const snapshot = await getDocs(q)
    return snapshot.empty // true = 唯一
  } catch (error) {
    // 出错时返回 false，确保安全
    return false
  }
}

/**
 * 生成唯一的会员ID
 * 
 * 主逻辑：
 * 1. 从 Firebase UID 生成确定性的会员ID
 * 2. 验证唯一性（理论上几乎不可能冲突）
 * 3. 如果冲突（极罕见），通过添加后缀重试
 * 
 * @param firebaseUid - Firebase 用户 UID
 * @param maxRetries - 最大重试次数（默认5次）
 * @returns 唯一的会员ID
 * @throws 如果无法生成唯一ID
 * 
 * @example
 * ```ts
 * try {
 *   const memberId = await generateMemberId('firebase_uid_here')
 *   console.log('生成的会员ID:', memberId)
 * } catch (error) {
 *   console.error('生成失败:', error)
 * }
 * ```
 */
export const generateMemberId = async (
  firebaseUid: string,
  maxRetries: number = 5
): Promise<string> => {
  if (!firebaseUid) {
    throw new Error('Firebase UID 不能为空')
  }
  
  try {
    // 第一次尝试：使用原始 UID 生成
    const baseMemberId = generateMemberIdFromUID(firebaseUid)
    const isUnique = await validateMemberIdUniqueness(baseMemberId)
    
    if (isUnique) {
      return baseMemberId
    }
    
    // 如果冲突（极罕见），尝试添加后缀重试
    
    for (let i = 1; i <= maxRetries; i++) {
      const retryMemberId = generateMemberIdFromUID(`${firebaseUid}_${i}`)
      const isRetryUnique = await validateMemberIdUniqueness(retryMemberId)
      
      if (isRetryUnique) {
        return retryMemberId
      }
    }
    
    // 如果所有重试都失败
    throw new Error(`无法生成唯一会员ID，已尝试 ${maxRetries + 1} 次`)
    
  } catch (error) {
    throw error
  }
}

/**
 * 批量验证会员ID（用于数据迁移或批量导入）
 * 
 * @param memberIds - 要验证的会员ID数组
 * @returns 验证结果对象，key为会员ID，value为是否唯一
 */
export const batchValidateMemberIds = async (
  memberIds: string[]
): Promise<Record<string, boolean>> => {
  const results: Record<string, boolean> = {}
  
  for (const memberId of memberIds) {
    results[memberId] = await validateMemberIdUniqueness(memberId)
  }
  
  return results
}

/**
 * 为现有用户生成会员ID（用于数据迁移）
 * 
 * @param users - 用户数组，每个用户包含 id (Firebase UID)
 * @returns 生成结果数组
 */
export const generateMemberIdsForExistingUsers = async (
  users: Array<{ id: string; displayName?: string }>
): Promise<Array<{ uid: string; memberId: string; name?: string }>> => {
  const results = []
  
  for (const user of users) {
    try {
      const memberId = await generateMemberId(user.id)
      results.push({
        uid: user.id,
        memberId,
        name: user.displayName
      })
    } catch (error) {
    }
  }
  
  return results
}

export default generateMemberId

