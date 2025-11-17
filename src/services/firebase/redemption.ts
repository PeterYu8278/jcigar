// 兑换配置与记录服务
import { 
  doc, 
  getDoc, 
  setDoc, 
  addDoc,
  getDocs,
  collection,
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { GLOBAL_COLLECTIONS } from '../../config/globalCollections';
import type { RedemptionConfig, RedemptionRecord, User } from '../../types';

/**
 * 获取兑换配置
 */
export const getRedemptionConfig = async (): Promise<RedemptionConfig | null> => {
  try {
    const docRef = doc(db, 'config', 'redemption');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
      } as RedemptionConfig;
    }
    
    return getDefaultRedemptionConfig();
  } catch (error) {
    return null;
  }
};

/**
 * 更新兑换配置
 */
export const updateRedemptionConfig = async (
  config: Omit<RedemptionConfig, 'id' | 'updatedAt'>,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, 'config', 'redemption');
    
    await setDoc(docRef, {
      ...config,
      updatedAt: Timestamp.fromDate(new Date()),
      updatedBy: userId
    }, { merge: true });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || '更新失败' };
  }
};

/**
 * 获取默认兑换配置
 */
export const getDefaultRedemptionConfig = (): RedemptionConfig => {
  return {
    id: 'default',
    dailyLimit: 3,
    totalLimit: 25,
    hourlyLimit: undefined, // 可选
    milestoneRewards: [
      {
        hoursRequired: 50,
        dailyLimitBonus: 1, // 每日限额 +1
        totalLimitBonus: 5  // 总限额 +5
      },
      {
        hoursRequired: 100,
        dailyLimitBonus: 2,
        totalLimitBonus: 10
      },
      {
        hoursRequired: 150,
        dailyLimitBonus: 3,
        totalLimitBonus: 15
      }
    ],
    cutoffTime: '23:00',
    updatedAt: new Date(),
    updatedBy: 'system'
  };
};

/**
 * 计算基于小时数的兑换限额（每50小时+25支）
 */
const calculateCigarLimitFromHours = (hours: number): number => {
  const baseLimit = 25; // 基础25支
  const bonusPer50Hours = 25; // 每50小时+25支
  const bonusHours = Math.floor(hours / 50) * 50; // 向下取整到最近的50的倍数
  const bonusCigars = (bonusHours / 50) * bonusPer50Hours;
  return baseLimit + bonusCigars;
};

/**
 * 获取用户的实际兑换限额（考虑累计时长里程碑）
 * 新规则：每50小时+25支雪茄
 */
export const getUserRedemptionLimits = async (userId: string): Promise<{
  dailyLimit: number;
  totalLimit: number;
  hourlyLimit?: number;
}> => {
  const config = await getRedemptionConfig();
  if (!config) {
    return { dailyLimit: 3, totalLimit: 25 };
  }

  // 获取用户累计时长
  const userDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.USERS, userId));
  if (!userDoc.exists()) {
    return { dailyLimit: config.dailyLimit, totalLimit: config.totalLimit, hourlyLimit: config.hourlyLimit };
  }

  const userData = userDoc.data() as User;
  const totalVisitHours = userData.membership?.totalVisitHours || 0;

  // 使用新的计算方式：每50小时+25支
  const totalLimit = calculateCigarLimitFromHours(totalVisitHours);

  // 计算里程碑加成（用于每日限额）
  let dailyLimitBonus = 0;

  if (config.milestoneRewards && config.milestoneRewards.length > 0) {
    // 按小时数排序，找到已达到的最高里程碑
    const sortedRewards = [...config.milestoneRewards].sort(
      (a, b) => a.hoursRequired - b.hoursRequired
    );

    for (const reward of sortedRewards) {
      if (totalVisitHours >= reward.hoursRequired) {
        dailyLimitBonus = reward.dailyLimitBonus;
      }
    }
  }

  return {
    dailyLimit: config.dailyLimit + dailyLimitBonus,
    totalLimit: totalLimit, // 使用新的计算方式
    hourlyLimit: config.hourlyLimit
  };
};

/**
 * 检查用户是否可以兑换
 */
export const canUserRedeem = async (
  userId: string,
  quantity: number,
  targetDate?: Date
): Promise<{ canRedeem: boolean; reason?: string }> => {
  try {
    // 检查会员状态
    const userDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) {
      return { canRedeem: false, reason: '用户不存在' };
    }

    const userData = userDoc.data() as User;
    if (userData.status !== 'active') {
      return { canRedeem: false, reason: '会员状态不活跃，无法兑换' };
    }

    // 检查是否在截止时间之前
    const config = await getRedemptionConfig();
    if (config) {
      const now = targetDate || new Date();
      const [cutoffHour, cutoffMinute] = config.cutoffTime.split(':').map(Number);
      const cutoffTime = new Date(now);
      cutoffTime.setHours(cutoffHour, cutoffMinute, 0, 0);

      if (now >= cutoffTime) {
        return { canRedeem: false, reason: `兑换截止时间为 ${config.cutoffTime}，请明日再试` };
      }
    }

    // 检查是否有pending的visit session
    const { getPendingVisitSession } = await import('./visitSessions');
    const pendingSession = await getPendingVisitSession(userId);
    if (!pendingSession) {
      return { canRedeem: false, reason: '必须在驻店期间才能兑换（请先check-in）' };
    }

    // 获取限额
    const limits = await getUserRedemptionLimits(userId);

    // 检查每日限额
    const dayKey = (targetDate || new Date()).toISOString().split('T')[0]; // YYYY-MM-DD
    const dailyRedemptions = await getDailyRedemptions(userId, dayKey);
    const dailyCount = dailyRedemptions.reduce((sum, r) => sum + r.quantity, 0);
    if (dailyCount + quantity > limits.dailyLimit) {
      return { canRedeem: false, reason: `今日兑换限额为 ${limits.dailyLimit}，已兑换 ${dailyCount}，剩余 ${limits.dailyLimit - dailyCount}` };
    }

    // 检查总限额
    const totalRedemptions = await getTotalRedemptions(userId);
    const totalCount = totalRedemptions.reduce((sum, r) => sum + r.quantity, 0);
    if (totalCount + quantity > limits.totalLimit) {
      return { canRedeem: false, reason: `总兑换限额为 ${limits.totalLimit}，已兑换 ${totalCount}，剩余 ${limits.totalLimit - totalCount}` };
    }

    // 检查每小时限额（如果有）
    if (limits.hourlyLimit) {
      const hourKey = (targetDate || new Date()).toISOString().split(':')[0]; // YYYY-MM-DDTHH
      const hourlyRedemptions = await getHourlyRedemptions(userId, hourKey);
      const hourlyCount = hourlyRedemptions.reduce((sum, r) => sum + r.quantity, 0);
      if (hourlyCount + quantity > limits.hourlyLimit) {
        return { canRedeem: false, reason: `每小时兑换限额为 ${limits.hourlyLimit}，本小时已兑换 ${hourlyCount}` };
      }
    }

    return { canRedeem: true };
  } catch (error: any) {
    return { canRedeem: false, reason: error.message || '检查失败' };
  }
};

/**
 * 创建兑换记录
 */
export const createRedemptionRecord = async (
  userId: string,
  visitSessionId: string,
  cigarId: string,
  cigarName: string,
  quantity: number,
  redeemedBy: string,
  targetDate?: Date
): Promise<{ success: boolean; recordId?: string; error?: string }> => {
  try {
    // 验证是否可以兑换
    const canRedeem = await canUserRedeem(userId, quantity, targetDate);
    if (!canRedeem.canRedeem) {
      return { success: false, error: canRedeem.reason || '无法兑换' };
    }

    const userDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) {
      return { success: false, error: '用户不存在' };
    }

    const userData = userDoc.data() as User;
    const now = targetDate || new Date();
    
    // 获取限额
    const limits = await getUserRedemptionLimits(userId);
    const dayKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const hourKey = limits.hourlyLimit ? now.toISOString().split(':')[0] : undefined; // YYYY-MM-DDTHH

    // 获取当日兑换次数
    const dailyRedemptions = await getDailyRedemptions(userId, dayKey);
    const redemptionIndex = dailyRedemptions.length + 1;

    const recordData: Omit<RedemptionRecord, 'id'> = {
      userId,
      userName: userData.displayName,
      visitSessionId,
      cigarId,
      cigarName,
      quantity,
      dayKey,
      hourKey,
      redemptionIndex,
      redeemedAt: now,
      redeemedBy,
      createdAt: now
    };

    const docRef = await addDoc(collection(db, GLOBAL_COLLECTIONS.REDEMPTION_RECORDS), {
      ...recordData,
      redeemedAt: Timestamp.fromDate(now),
      createdAt: Timestamp.fromDate(now)
    });

    // 添加到visit session的redemptions数组
    const { addRedemptionToSession } = await import('./visitSessions');
    await addRedemptionToSession(visitSessionId, {
      cigarId,
      cigarName,
      quantity,
      redeemedBy
    });

    return { success: true, recordId: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message || '创建兑换记录失败' };
  }
};

/**
 * 获取用户当日的兑换记录
 */
export const getDailyRedemptions = async (
  userId: string,
  dayKey: string
): Promise<RedemptionRecord[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.REDEMPTION_RECORDS),
      where('userId', '==', userId),
      where('dayKey', '==', dayKey),
      orderBy('redeemedAt', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        redeemedAt: data.redeemedAt?.toDate?.() || new Date(data.redeemedAt),
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
      } as RedemptionRecord;
    });
  } catch (error) {
    return [];
  }
};

/**
 * 获取用户每小时的兑换记录
 */
export const getHourlyRedemptions = async (
  userId: string,
  hourKey: string
): Promise<RedemptionRecord[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.REDEMPTION_RECORDS),
      where('userId', '==', userId),
      where('hourKey', '==', hourKey),
      orderBy('redeemedAt', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        redeemedAt: data.redeemedAt?.toDate?.() || new Date(data.redeemedAt),
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
      } as RedemptionRecord;
    });
  } catch (error) {
    return [];
  }
};

/**
 * 获取用户的总兑换记录
 */
export const getTotalRedemptions = async (userId: string): Promise<RedemptionRecord[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.REDEMPTION_RECORDS),
      where('userId', '==', userId),
      orderBy('redeemedAt', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        redeemedAt: data.redeemedAt?.toDate?.() || new Date(data.redeemedAt),
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
      } as RedemptionRecord;
    });
  } catch (error) {
    return [];
  }
};

