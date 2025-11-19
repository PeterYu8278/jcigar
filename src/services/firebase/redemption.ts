// 兑换配置与记录服务
import { 
  doc, 
  getDoc, 
  setDoc, 
  addDoc,
  updateDoc,
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
    const docRef = doc(db, GLOBAL_COLLECTIONS.REDEMPTION_CONFIG, 'default');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    } as RedemptionConfig;
  } catch (error) {
    console.error('获取兑换配置失败:', error);
    return null;
  }
};

/**
 * 更新兑换配置
 */
export const updateRedemptionConfig = async (
  config: Partial<RedemptionConfig>,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.REDEMPTION_CONFIG, 'default');
    const now = new Date();
    
    await setDoc(docRef, {
      ...config,
      updatedAt: Timestamp.fromDate(now),
      updatedBy
    }, { merge: true });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || '更新兑换配置失败' };
  }
};

/**
 * 获取用户当前会员期限内的累计驻店时长
 */
const getUserTotalVisitHoursInPeriod = async (userId: string): Promise<number> => {
  try {
    // 获取会员期限
    const { getUserMembershipPeriod } = await import('./membershipFee');
    const period = await getUserMembershipPeriod(userId);
    
    if (!period) {
      // 如果没有会员期限，返回0
      console.warn('[getUserTotalVisitHoursInPeriod] 没有会员期限，返回0');
      return 0;
    }

    // 查询当前会员期限内的completed sessions
    const { getUserVisitSessions } = await import('./visitSessions');
    const sessions = await getUserVisitSessions(userId);
    
    
    // 筛选出在会员期限内的completed sessions
    const periodSessions = sessions.filter(session => {
      if (session.status !== 'completed' || !session.checkOutAt) {
        return false;
      }
      const inPeriod = session.checkOutAt >= period.startDate && session.checkOutAt < period.endDate;
      return inPeriod;
    });
    
    
    // 累计时长
    const totalHours = periodSessions.reduce((sum, session) => sum + (session.durationHours || 0), 0);
    
    
    return totalHours;
  } catch (error) {
    console.error('获取会员期限内累计驻店时长失败:', error);
    return 0;
  }
};

/**
 * 获取用户兑换限额
 * 基于当前会员期限内的累计驻店时长计算里程碑奖励
 */
export const getUserRedemptionLimits = async (userId: string): Promise<{
  dailyLimit: number;
  totalLimit: number;
  hourlyLimit?: number;
}> => {
  try {
    const config = await getRedemptionConfig();
    if (!config) {
      return { dailyLimit: 3, totalLimit: 25 };
    }

    // 获取当前会员期限内的累计驻店时长
    const totalVisitHours = await getUserTotalVisitHoursInPeriod(userId);
    
    // 基础限额
    const baseDailyLimit = config.dailyLimit || 3;
    const baseTotalLimit = config.totalLimit || 25;
    
    // 里程碑奖励计算（固定规则：50/100/150小时）
    let dailyLimitBonus = 0;
    let totalLimitBonus = 0;
    
    if (totalVisitHours >= 150) {
      // 150小时：dailyLimit +3, totalLimit +75
      dailyLimitBonus = 3;
      totalLimitBonus = 75;
    } else if (totalVisitHours >= 100) {
      // 100小时：dailyLimit +2, totalLimit +50
      dailyLimitBonus = 2;
      totalLimitBonus = 50;
    } else if (totalVisitHours >= 50) {
      // 50小时：dailyLimit +1, totalLimit +25
      dailyLimitBonus = 1;
      totalLimitBonus = 25;
    }
    // 超过150小时不再增加

    return {
      dailyLimit: baseDailyLimit + dailyLimitBonus,
      totalLimit: baseTotalLimit + totalLimitBonus,
      hourlyLimit: config.hourlyLimit
    };
  } catch (error) {
    console.error('获取用户兑换限额失败:', error);
    return { dailyLimit: 3, totalLimit: 25 };
  }
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
      return { canRedeem: false, reason: '请先check-in才能兑换' };
    }

    // 获取限额
    const limits = await getUserRedemptionLimits(userId);

    // 检查每日限额（只计算已完成的记录）
    const dayKey = (targetDate || new Date()).toISOString().split('T')[0]; // YYYY-MM-DD
    const dailyRedemptions = await getDailyRedemptions(userId, dayKey);
    const completedDailyRedemptions = dailyRedemptions.filter(r => r.status === 'completed');
    const dailyCount = completedDailyRedemptions.reduce((sum, r) => sum + r.quantity, 0);
    if (dailyCount + quantity > limits.dailyLimit) {
      return { canRedeem: false, reason: `今日兑换限额为 ${limits.dailyLimit}，已兑换 ${dailyCount}，剩余 ${limits.dailyLimit - dailyCount}` };
    }

    // 检查总限额（只计算已完成的记录）
    const totalRedemptions = await getTotalRedemptions(userId);
    const completedTotalRedemptions = totalRedemptions.filter(r => r.status === 'completed');
    const totalCount = completedTotalRedemptions.reduce((sum, r) => sum + r.quantity, 0);
    if (totalCount + quantity > limits.totalLimit) {
      return { canRedeem: false, reason: `总兑换限额为 ${limits.totalLimit}，已兑换 ${totalCount}，剩余 ${limits.totalLimit - totalCount}` };
    }

    // 检查每小时限额（如果没有配置hourlyLimit，默认每小时只能兑换1次，只计算已完成的记录）
    const now = targetDate || new Date();
    const hourKey = now.toISOString().split(':')[0]; // YYYY-MM-DDTHH
    const hourlyRedemptions = await getHourlyRedemptions(userId, hourKey);
    const completedHourlyRedemptions = hourlyRedemptions.filter(r => r.status === 'completed');
    const hourlyCount = completedHourlyRedemptions.reduce((sum, r) => sum + r.quantity, 0);
    
    // 如果配置了hourlyLimit，使用配置值；否则默认每小时只能兑换1次
    const effectiveHourlyLimit = limits.hourlyLimit !== undefined ? limits.hourlyLimit : 1;
    
    if (hourlyCount + quantity > effectiveHourlyLimit) {
      return { canRedeem: false, reason: `每小时兑换限额为 ${effectiveHourlyLimit}，本小时已兑换 ${hourlyCount}` };
    }

    return { canRedeem: true };
  } catch (error: any) {
    return { canRedeem: false, reason: error.message || '检查失败' };
  }
};

/**
 * 创建待处理的兑换记录（用户发起，等待管理员选择雪茄）
 */
export const createPendingRedemptionRecord = async (
  userId: string,
  visitSessionId: string,
  quantity: number,
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
    // 始终设置hourKey（即使没有配置hourlyLimit，也需要记录以便检查每小时限制）
    const hourKey = now.toISOString().split(':')[0]; // YYYY-MM-DDTHH

    // 获取当日兑换次数（只计算已完成的记录）
    const dailyRedemptions = await getDailyRedemptions(userId, dayKey);
    const completedRedemptions = dailyRedemptions.filter(r => r.status === 'completed');
    const redemptionIndex = completedRedemptions.length + 1;

    const recordData: Omit<RedemptionRecord, 'id'> = {
      userId,
      userName: userData.displayName,
      visitSessionId,
      cigarId: '',  // 待管理员选择
      cigarName: '待选择',  // 占位符
      quantity,
      status: 'pending',  // 待处理状态
      dayKey,
      hourKey,
      redemptionIndex,
      redeemedAt: now,
      redeemedBy: userId,  // 用户ID（用户发起）
      createdAt: now
    };

    const docRef = await addDoc(collection(db, GLOBAL_COLLECTIONS.REDEMPTION_RECORDS), {
      ...recordData,
      redeemedAt: Timestamp.fromDate(now),
      createdAt: Timestamp.fromDate(now)
    });

    // 注意：待处理的兑换记录不添加到visit session的redemptions数组
    // 只有当管理员确认后（status变为completed）才添加

    return { success: true, recordId: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message || '创建兑换记录失败' };
  }
};

/**
 * 创建兑换记录（管理员创建或确认）
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
    // 始终设置hourKey（即使没有配置hourlyLimit，也需要记录以便检查每小时限制）
    const hourKey = now.toISOString().split(':')[0]; // YYYY-MM-DDTHH

    // 获取当日兑换次数（只计算已完成的记录）
    const dailyRedemptions = await getDailyRedemptions(userId, dayKey);
    const completedRedemptions = dailyRedemptions.filter(r => r.status === 'completed');
    const redemptionIndex = completedRedemptions.length + 1;

    const recordData: Omit<RedemptionRecord, 'id'> = {
      userId,
      userName: userData.displayName,
      visitSessionId,
      cigarId,
      cigarName,
      quantity,
      status: 'completed',  // 管理员创建的直接是已完成状态
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
 * 更新兑换记录（管理员选择雪茄并确认）
 */
export const updateRedemptionRecord = async (
  recordId: string,
  cigarId: string,
  cigarName: string,
  quantity: number,
  confirmedBy: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const recordRef = doc(db, GLOBAL_COLLECTIONS.REDEMPTION_RECORDS, recordId);
    const recordDoc = await getDoc(recordRef);
    
    if (!recordDoc.exists()) {
      return { success: false, error: '兑换记录不存在' };
    }

    const recordData = recordDoc.data() as RedemptionRecord;
    
    // 允许修改completed状态的记录
    
    const now = new Date();

    // 更新兑换记录
    await updateDoc(recordRef, {
      cigarId,
      cigarName,
      quantity,
      status: 'completed',
      redeemedBy: confirmedBy,  // 更新为确认的管理员ID
      updatedAt: Timestamp.fromDate(now)
    });

    // 注意：我们不调用 addRedemptionToSession，因为这会添加重复项。
    // VisitSession.redemptions 数组可能会与 RedemptionRecord 集合不同步。
    // 建议依赖 getRedemptionRecordsBySession 获取准确的兑换历史。

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || '更新兑换记录失败' };
  }
};

/**
 * 获取指定驻店记录的兑换记录（包括待处理和已完成的）
 */
export const getRedemptionRecordsBySession = async (
  visitSessionId: string
): Promise<RedemptionRecord[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.REDEMPTION_RECORDS),
      where('visitSessionId', '==', visitSessionId),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        status: data.status || 'completed',  // 兼容旧数据，默认为completed
        redeemedAt: data.redeemedAt?.toDate?.() || new Date(data.redeemedAt),
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
      } as RedemptionRecord;
    });
  } catch (error: any) {
    console.error('[getRedemptionRecordsBySession] 查询失败:', error);
    return [];
  }
};

/**
 * 获取用户当日的兑换记录（基于当前会员期限）
 */
export const getDailyRedemptions = async (
  userId: string,
  dayKey: string
): Promise<RedemptionRecord[]> => {
  try {
    // 获取会员期限
    const { getUserMembershipPeriod } = await import('./membershipFee');
    const period = await getUserMembershipPeriod(userId);
    
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.REDEMPTION_RECORDS),
      where('userId', '==', userId),
      where('dayKey', '==', dayKey),
      orderBy('redeemedAt', 'asc')
    );

    const snapshot = await getDocs(q);
    let records = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        status: data.status || 'completed',  // 兼容旧数据，默认为completed
        redeemedAt: data.redeemedAt?.toDate?.() || new Date(data.redeemedAt),
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
      } as RedemptionRecord;
    });
    
    // 如果存在会员期限，过滤出在会员期限内的记录
    if (period) {
      records = records.filter(record => {
        return record.redeemedAt >= period.startDate && record.redeemedAt < period.endDate;
      });
    }
    
    
    return records;
  } catch (error: any) {
    // 如果查询失败（可能是缺少索引），尝试不使用orderBy
    console.error('[getDailyRedemptions] 查询失败，尝试不使用orderBy:', error);
    try {
      // 重新获取会员期限（在重试逻辑中）
      const { getUserMembershipPeriod } = await import('./membershipFee');
      const retryPeriod = await getUserMembershipPeriod(userId);
      
      const q = query(
        collection(db, GLOBAL_COLLECTIONS.REDEMPTION_RECORDS),
        where('userId', '==', userId),
        where('dayKey', '==', dayKey)
      );
      const snapshot = await getDocs(q);
      let records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          status: data.status || 'completed',  // 兼容旧数据，默认为completed
          redeemedAt: data.redeemedAt?.toDate?.() || new Date(data.redeemedAt),
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
        } as RedemptionRecord;
      });
      
      // 如果存在会员期限，过滤出在会员期限内的记录
      if (retryPeriod) {
        records = records.filter(record => {
          return record.redeemedAt >= retryPeriod.startDate && record.redeemedAt < retryPeriod.endDate;
        });
      }
      
      // 手动排序
      const sorted = records.sort((a, b) => a.redeemedAt.getTime() - b.redeemedAt.getTime());
      return sorted;
    } catch (retryError) {
      console.error('[getDailyRedemptions] 重试查询也失败:', retryError);
      return [];
    }
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
        status: data.status || 'completed',  // 兼容旧数据，默认为completed
        redeemedAt: data.redeemedAt?.toDate?.() || new Date(data.redeemedAt),
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
      } as RedemptionRecord;
    });
  } catch (error: any) {
    // 如果查询失败（可能是缺少索引），尝试不使用orderBy
    console.error('[getHourlyRedemptions] 查询失败，尝试不使用orderBy:', error);
    try {
      const q = query(
        collection(db, GLOBAL_COLLECTIONS.REDEMPTION_RECORDS),
        where('userId', '==', userId),
        where('hourKey', '==', hourKey)
      );
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          status: data.status || 'completed',  // 兼容旧数据，默认为completed
          redeemedAt: data.redeemedAt?.toDate?.() || new Date(data.redeemedAt),
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
        } as RedemptionRecord;
      });
      // 手动排序
      return records.sort((a, b) => a.redeemedAt.getTime() - b.redeemedAt.getTime());
    } catch (retryError) {
      console.error('[getHourlyRedemptions] 重试查询也失败:', retryError);
      return [];
    }
  }
};

/**
 * 获取用户的总兑换记录（基于当前会员期限）
 */
export const getTotalRedemptions = async (userId: string): Promise<RedemptionRecord[]> => {
  try {
    // 获取会员期限
    const { getUserMembershipPeriod } = await import('./membershipFee');
    const period = await getUserMembershipPeriod(userId);
    
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.REDEMPTION_RECORDS),
      where('userId', '==', userId),
      orderBy('redeemedAt', 'asc')
    );

    const snapshot = await getDocs(q);
    let records = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        status: data.status || 'completed',  // 兼容旧数据，默认为completed
        redeemedAt: data.redeemedAt?.toDate?.() || new Date(data.redeemedAt),
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
      } as RedemptionRecord;
    });
    
    // 如果存在会员期限，过滤出在会员期限内的记录
    if (period) {
      records = records.filter(record => {
        return record.redeemedAt >= period.startDate && record.redeemedAt < period.endDate;
      });
    }
    
    return records;
  } catch (error) {
    console.error('[getTotalRedemptions] 查询失败:', error);
    return [];
  }
};
