/**
 * 会员编号生成工具
 * memberId 格式：M + 6位数字（如 M000001, M000002）
 * memberId 用途：
 * 1. 会员唯一标识
 * 2. 引荐码（直接使用 memberId）
 * 3. 会员卡展示
 */

import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * 生成下一个会员编号
 * @returns Promise<string> 格式：M000001
 */
export const generateMemberId = async (): Promise<string> => {
  try {
    // 查询最新的会员编号
    const q = query(
      collection(db, 'users'),
      orderBy('memberId', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    let nextNumber = 1;
    
    if (!snapshot.empty) {
      const lastMemberId = snapshot.docs[0].data().memberId;
      if (lastMemberId && typeof lastMemberId === 'string') {
        // 提取数字部分
        const match = lastMemberId.match(/M(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
    }
    
    // 格式化为6位数字
    const memberId = `M${String(nextNumber).padStart(6, '0')}`;
    
    // 二次验证唯一性
    const exists = await checkMemberIdExists(memberId);
    if (exists) {
      // 如果存在冲突，递归生成下一个
      console.warn(`memberId ${memberId} 已存在，生成下一个`);
      return generateMemberId();
    }
    
    return memberId;
  } catch (error) {
    console.error('生成会员编号失败:', error);
    // 如果查询失败（如索引不存在），使用基于时间戳的生成
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    const number = (timestamp % 999999) + randomSuffix;
    return `M${String(number).padStart(6, '0')}`;
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

