/**
 * 会员编号生成工具
 * memberId 格式：M + 6位大写字母数字组合（基于 userId hash）
 * memberId 用途：
 * 1. 会员唯一标识
 * 2. 引荐码（直接使用 memberId）
 * 3. 会员卡展示
 */

import { collection, query, limit, getDocs, where } from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * 简单的字符串 hash 函数
 * @param str 输入字符串
 * @returns 数字 hash 值
 */
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

/**
 * 将数字转换为 Base36 (0-9, A-Z)
 * @param num 数字
 * @param length 目标长度
 * @returns Base36 字符串
 */
const toBase36 = (num: number, length: number = 6): string => {
  return num.toString(36).toUpperCase().padStart(length, '0').slice(-length);
};

/**
 * 基于用户 ID 生成会员编号
 * @param userId Firebase 用户文档 ID
 * @returns Promise<string> 格式：M + 6位大写字母数字（如 M3K7Y2W）
 */
export const generateMemberId = async (userId: string): Promise<string> => {
  try {
    // 基于 userId 生成 hash
    const hash = simpleHash(userId);
    
    // 转换为 Base36 格式（0-9, A-Z），取6位
    const code = toBase36(hash, 6);
    
    const memberId = `M${code}`;
    
    console.log(`🎫 [generateMemberId] userId: ${userId} → memberId: ${memberId}`);
    
    // 验证唯一性（极小概率会冲突）
    const exists = await checkMemberIdExists(memberId);
    if (exists) {
      // 如果存在冲突，使用 userId + timestamp 重新生成
      console.warn(`⚠️ [generateMemberId] ${memberId} 已存在，使用备用方案`);
      const timestamp = Date.now();
      const fallbackHash = simpleHash(`${userId}-${timestamp}`);
      const fallbackCode = toBase36(fallbackHash, 6);
      return `M${fallbackCode}`;
    }
    
    return memberId;
  } catch (error) {
    console.error('❌ [generateMemberId] 生成会员编号失败:', error);
    // 降级方案：使用时间戳
    const timestamp = Date.now();
    const fallbackCode = toBase36(timestamp, 6);
    return `M${fallbackCode}`;
  }
};

/**
 * 检查会员编号是否已存在
 */
export const checkMemberIdExists = async (memberId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'users'),
      where('memberId', '==', memberId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('检查会员编号失败:', error);
    return false;
  }
};

/**
 * 通过会员编号查找用户（用于引荐码验证）
 */
export const getUserByMemberId = async (memberId: string): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    // 标准化 memberId（转大写，去空格）
    const normalized = memberId.trim().toUpperCase();
    
    // ✅ 不验证格式，只验证是否为空
    if (!normalized) {
      return { success: false, error: '引荐码不能为空' };
    }
    
    // ✅ 直接查询是否存在
    const q = query(
      collection(db, 'users'),
      where('memberId', '==', normalized),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: false, error: '引荐码不存在' };
    }
    
    const userDoc = snapshot.docs[0];
    const userData = { id: userDoc.id, ...userDoc.data() };
    
    return { success: true, user: userData };
  } catch (error) {
    console.error('查找会员失败:', error);
    return { success: false, error: '查询失败，请重试' };
  }
};

/**
 * 验证引荐码（即验证 memberId）
 */
export const validateReferralCode = async (code: string): Promise<{ valid: boolean; referrer?: any; error?: string }> => {
  const result = await getUserByMemberId(code);
  
  if (!result.success) {
    return { valid: false, error: result.error };
  }
  
  return { valid: true, referrer: result.user };
};

/**
 * 格式化会员编号显示
 * @param memberId 会员编号
 * @param format 格式化方式: 'full' | 'short' | 'display'
 */
export const formatMemberId = (memberId: string | undefined, format: 'full' | 'short' | 'display' = 'full'): string => {
  if (!memberId) return '-';
  
  switch (format) {
    case 'full':
      return memberId;  // M000001
    case 'short':
      return memberId.replace('M', '');  // 000001
    case 'display':
      return memberId.replace('M', 'M-');  // M-000001
    default:
      return memberId;
  }
};

