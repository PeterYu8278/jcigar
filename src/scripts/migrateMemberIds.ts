/**
 * 会员ID迁移脚本
 * 为现有用户生成唯一的会员ID
 */

import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { generateMemberId } from '../utils/memberIdGenerator'
import type { User } from '../types'

interface MigrationResult {
  total: number
  success: number
  failed: number
  skipped: number
  results: Array<{
    uid: string
    displayName?: string
    memberId?: string
    status: 'success' | 'failed' | 'skipped'
    error?: string
  }>
}

/**
 * 为所有现有用户生成会员ID
 * 
 * 注意：此函数应该在浏览器控制台或管理后台中手动调用
 * 不要在生产环境中自动执行
 * 
 * @example
 * ```ts
 * // 在浏览器控制台中运行：
 * import { migrateAllUserMemberIds } from './scripts/migrateMemberIds'
 * const result = await migrateAllUserMemberIds()
 * console.log('迁移结果:', result)
 * ```
 */
export const migrateAllUserMemberIds = async (): Promise<MigrationResult> => {
  
  const result: MigrationResult = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    results: []
  }
  
  try {
    // 获取所有用户
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)
    
    result.total = snapshot.size
    
    // 遍历每个用户
    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data() as User
      const uid = userDoc.id
      
      try {
        // 检查是否已有会员ID
        if (userData.memberId) {
          result.skipped++
          result.results.push({
            uid,
            displayName: userData.displayName,
            memberId: userData.memberId,
            status: 'skipped'
          })
          continue
        }
        
        // 生成新的会员ID
        const memberId = await generateMemberId(uid)
        
        // 更新用户文档
        await updateDoc(doc(db, 'users', uid), {
          memberId,
          updatedAt: new Date()
        })
        
        result.success++
        result.results.push({
          uid,
          displayName: userData.displayName,
          memberId,
          status: 'success'
        })
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        result.failed++
        result.results.push({
          uid,
          displayName: userData.displayName,
          status: 'failed',
          error: errorMessage
        })
      }
    }
    
    // 打印总结
    
    return result
    
  } catch (error) {
    throw error
  }
}

/**
 * 为单个用户生成会员ID（用于手动修复）
 */
export const migrateSingleUser = async (uid: string): Promise<string> => {
  try {
    const userRef = doc(db, 'users', uid)
    const memberId = await generateMemberId(uid)
    
    await updateDoc(userRef, {
      memberId,
      updatedAt: new Date()
    })
    
    return memberId
    
  } catch (error) {
    throw error
  }
}

/**
 * 验证所有用户的会员ID唯一性
 */
export const validateAllMemberIds = async (): Promise<{
  total: number
  unique: number
  duplicates: Array<{ memberId: string; count: number; uids: string[] }>
}> => {
  
  const usersRef = collection(db, 'users')
  const snapshot = await getDocs(usersRef)
  
  const memberIdMap = new Map<string, string[]>()
  
  // 统计每个会员ID对应的用户
  for (const userDoc of snapshot.docs) {
    const userData = userDoc.data() as User
    if (userData.memberId) {
      const uids = memberIdMap.get(userData.memberId) || []
      uids.push(userDoc.id)
      memberIdMap.set(userData.memberId, uids)
    }
  }
  
  // 找出重复的会员ID
  const duplicates: Array<{ memberId: string; count: number; uids: string[] }> = []
  
  for (const [memberId, uids] of memberIdMap.entries()) {
    if (uids.length > 1) {
      duplicates.push({
        memberId,
        count: uids.length,
        uids
      })
    }
  }
  
  const result = {
    total: memberIdMap.size,
    unique: memberIdMap.size - duplicates.length,
    duplicates
  }
  
  
  if (duplicates.length > 0) {
    duplicates.forEach(dup => {
    })
  } else {
  }
  
  return result
}

// 导出便捷函数供控制台使用
if (typeof window !== 'undefined') {
  (window as any).migrateMemberIds = migrateAllUserMemberIds;
  (window as any).validateMemberIds = validateAllMemberIds;
  (window as any).migrateSingleUserMemberId = migrateSingleUser;
  
}

