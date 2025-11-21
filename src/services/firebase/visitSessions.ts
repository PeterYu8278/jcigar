// 驻店记录服务
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc,
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { GLOBAL_COLLECTIONS } from '../../config/globalCollections';
import type { VisitSession, User } from '../../types';

/**
 * 处理 visit session 数据，转换日期字段和 redemptions
 */
const processVisitSessionData = (data: any, docId: string): VisitSession => {
  // 处理 redemptions 数组中的日期字段
  const redemptions = (data.redemptions || []).map((redemption: any) => ({
    ...redemption,
    redeemedAt: redemption.redeemedAt?.toDate?.() || new Date(redemption.redeemedAt) || new Date()
  }));
  
  return {
    id: docId,
    ...data,
    checkInAt: data.checkInAt?.toDate?.() || new Date(data.checkInAt),
    checkOutAt: data.checkOutAt?.toDate?.() || data.checkOutAt,
    calculatedAt: data.calculatedAt?.toDate?.() || data.calculatedAt,
    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    redemptions: redemptions.length > 0 ? redemptions : undefined
  } as VisitSession;
};

/**
 * 计算驻店时长（分钟转小时，向上取整）
 * 规则：超过15分钟按半小时算，超过半小时则按1小时算
 */
export const calculateVisitDuration = (minutes: number): number => {
  if (minutes <= 15) {
    return 0; // 15分钟内不计费
  } else if (minutes <= 30) {
    return 0.5; // 超过15分钟但不超过30分钟，按半小时
  } else {
    // 超过30分钟，按小时向上取整
    return Math.ceil(minutes / 60);
  }
};

/**
 * 创建驻店记录（Check-in）
 */
export const createVisitSession = async (
  userId: string,
  checkInBy: string,
  userName?: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> => {
  try {
    
    // 检查用户是否有未完成的session
    let pendingSession: VisitSession | null = null;
    try {
      pendingSession = await getPendingVisitSession(userId);
    } catch (error: any) {
      console.error('[createVisitSession] 检查pending session失败:', error);
      // 如果是索引错误，给出明确提示
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        return { 
          success: false, 
          error: 'Firestore索引未创建，请在Firebase控制台创建复合索引：visitSessions (userId, status, checkInAt)' 
        };
      }
      // 其他错误继续处理
    }
    
    if (pendingSession) {
      return { success: false, error: '用户已有未完成的驻店记录，请先check-out' };
    }

    // 获取用户信息，检查会员状态
    const userDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) {
      console.error('[createVisitSession] 用户不存在:', userId);
      return { success: false, error: '用户不存在' };
    }

    const userData = userDoc.data() as User;
    
    // 检查会员状态：undefined 或 'active' 都允许 check-in，只有明确设置为 'inactive' 或 'suspended' 才拒绝
    if (userData.status && userData.status !== 'active') {
      console.error('[createVisitSession] 会员状态不活跃:', userData.status);
      return { success: false, error: `会员状态不活跃（当前状态：${userData.status}），无法check-in` };
    }

    // 检查是否为续费后首次驻店
    const isFirstVisitAfterRenewal = userData.membership?.nextFirstVisitWaiverExpiresAt 
      && new Date() <= new Date(userData.membership.nextFirstVisitWaiverExpiresAt);

    const now = new Date();
    const sessionData: Omit<VisitSession, 'id'> = {
      userId,
      userName: userName || userData.displayName,
      checkInAt: now,
      checkInBy,
      status: 'pending',
      isFirstVisitAfterRenewal: !!isFirstVisitAfterRenewal,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(collection(db, GLOBAL_COLLECTIONS.VISIT_SESSIONS), {
      ...sessionData,
      checkInAt: Timestamp.fromDate(now),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });

    // 更新用户当前session ID和lastCheckInAt
    await updateDoc(doc(db, GLOBAL_COLLECTIONS.USERS, userId), {
      'membership.currentVisitSessionId': docRef.id,
      'membership.lastCheckInAt': Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });

    return { success: true, sessionId: docRef.id };
  } catch (error: any) {
    console.error('[createVisitSession] 创建失败:', error);
    return { success: false, error: error.message || '创建驻店记录失败' };
  }
};

/**
 * 完成驻店记录（Check-out）
 */
export const completeVisitSession = async (
  sessionId: string,
  checkOutBy: string,
  forceHours?: number // 强制使用指定小时数（忘记check-out时）
): Promise<{ success: boolean; pointsDeducted?: number; error?: string }> => {
  try {
    const sessionDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.VISIT_SESSIONS, sessionId));
    if (!sessionDoc.exists()) {
      return { success: false, error: '驻店记录不存在' };
    }

    const sessionData = sessionDoc.data() as any;
    const session: VisitSession = {
      id: sessionDoc.id,
      ...sessionData,
      checkInAt: sessionData.checkInAt?.toDate?.() || new Date(sessionData.checkInAt),
      checkOutAt: sessionData.checkOutAt?.toDate?.() || sessionData.checkOutAt,
      calculatedAt: sessionData.calculatedAt?.toDate?.() || sessionData.calculatedAt,
      createdAt: sessionData.createdAt?.toDate?.() || new Date(sessionData.createdAt),
      updatedAt: sessionData.updatedAt?.toDate?.() || new Date(sessionData.updatedAt)
    };

    if (session.status !== 'pending') {
      return { success: false, error: '该驻店记录已完成或已过期' };
    }

    const now = new Date();
    let durationMinutes: number;
    let durationHours: number;

    if (forceHours !== undefined) {
      // 忘记check-out，使用强制小时数
      durationHours = forceHours;
      durationMinutes = forceHours * 60;
    } else {
      // 正常计算
      durationMinutes = Math.floor((now.getTime() - session.checkInAt.getTime()) / (1000 * 60));
      durationHours = calculateVisitDuration(durationMinutes);
    }

    // 获取当前时期生效的每小时扣除积分（基于签到时间）
    let hourlyRate = 0;
    try {
      const { getCurrentHourlyRate } = await import('./membershipFee');
      // 使用签到时间作为基准日期，确保使用签到时的费率
      hourlyRate = await getCurrentHourlyRate(session.checkInAt);
    } catch (error) {
      console.error('[completeVisitSession] 获取积分扣除配置失败，使用默认值', error);
      // 如果失败，使用默认值
      hourlyRate = 10;
    }

    // 计算应扣除的积分
    let pointsDeducted = 0;
    if (!session.isFirstVisitAfterRenewal) {
      // 非首次驻店，扣除积分
      pointsDeducted = Math.round(durationHours * hourlyRate);
    }

    // 更新用户积分（允许负数）
    const userDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.USERS, session.userId));
    if (!userDoc.exists()) {
      return { success: false, error: '用户不存在' };
    }

    const userData = userDoc.data() as User;
    const currentPoints = userData.membership?.points || 0;
    const newPoints = currentPoints - pointsDeducted;

    // 创建积分记录
    let pointsRecordId: string | undefined;
    if (pointsDeducted > 0) {
      const { createPointsRecord } = await import('./pointsRecords');
      const pointsRecord = await createPointsRecord({
        userId: session.userId,
        userName: session.userName,
        type: 'spend',
        amount: pointsDeducted,
        source: 'visit',
        description: `驻店时长费用 (${durationHours}小时 × ${hourlyRate}积分/小时)`,
        relatedId: sessionId,
        balance: newPoints,
        createdBy: checkOutBy
      });
      pointsRecordId = pointsRecord?.id;
    }

    // 更新用户积分和累计时长
    const totalVisitHours = (userData.membership?.totalVisitHours || 0) + durationHours;
    await updateDoc(doc(db, GLOBAL_COLLECTIONS.USERS, session.userId), {
      'membership.points': newPoints,
      'membership.totalVisitHours': totalVisitHours,
      'membership.currentVisitSessionId': null,
      updatedAt: Timestamp.fromDate(now)
    });

    // 更新驻店记录
    await updateDoc(doc(db, GLOBAL_COLLECTIONS.VISIT_SESSIONS, sessionId), {
      checkOutAt: Timestamp.fromDate(now),
      checkOutBy,
      durationMinutes,
      durationHours,
      calculatedAt: Timestamp.fromDate(now),
      pointsDeducted,
      pointsRecordId: pointsRecordId || null,
      status: 'completed',
      updatedAt: Timestamp.fromDate(now)
    });

    return { success: true, pointsDeducted };
  } catch (error: any) {
    return { success: false, error: error.message || '完成驻店记录失败' };
  }
};

/**
 * 获取用户的待处理驻店记录
 */
export const getPendingVisitSession = async (userId: string): Promise<VisitSession | null> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.VISIT_SESSIONS),
      where('userId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('checkInAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    const session = processVisitSessionData(data, docSnap.id);
    return session;
  } catch (error: any) {
    console.error('[getPendingVisitSession] 查询失败:', error);
    // 如果是索引错误，抛出以便上层处理
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      throw error;
    }
    return null;
  }
};

/**
 * 获取用户的所有驻店记录
 */
export const getUserVisitSessions = async (
  userId: string,
  limitCount: number = 50
): Promise<VisitSession[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.VISIT_SESSIONS),
      where('userId', '==', userId),
      orderBy('checkInAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const sessions = snapshot.docs.map(doc => processVisitSessionData(doc.data(), doc.id));
    
    return sessions;
  } catch (error: any) {
    console.error('[getUserVisitSessions] 查询失败:', error);
    // 如果是索引错误，尝试不使用orderBy
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      try {
        const q = query(
          collection(db, GLOBAL_COLLECTIONS.VISIT_SESSIONS),
          where('userId', '==', userId),
          limit(limitCount)
        );
        const snapshot = await getDocs(q);
        const sessions = snapshot.docs.map(doc => processVisitSessionData(doc.data(), doc.id));
        // 手动排序
        sessions.sort((a, b) => b.checkInAt.getTime() - a.checkInAt.getTime());
        return sessions;
      } catch (retryError) {
        console.error('[getUserVisitSessions] 重试查询也失败:', retryError);
        return [];
      }
    }
    return [];
  }
};

/**
 * 获取所有待处理的驻店记录（包括所有pending状态的记录）
 */
export const getAllPendingVisitSessions = async (): Promise<VisitSession[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.VISIT_SESSIONS),
      where('status', '==', 'pending'),
      orderBy('checkInAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => processVisitSessionData(doc.data(), doc.id));
  } catch (error: any) {
    // 如果查询失败（可能是缺少索引），返回空数组
    console.error('获取待处理驻店记录失败:', error);
    return [];
  }
};

/**
 * 获取所有驻店记录（包括所有状态）
 */
export const getAllVisitSessions = async (limitCount: number = 100): Promise<VisitSession[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.VISIT_SESSIONS),
      orderBy('checkInAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => processVisitSessionData(doc.data(), doc.id));
  } catch (error: any) {
    console.error('获取所有驻店记录失败:', error);
    return [];
  }
};

/**
 * 获取所有待处理的驻店记录（超过24小时未check-out）
 */
export const getExpiredVisitSessions = async (): Promise<VisitSession[]> => {
  try {
    const expireTime = new Date();
    expireTime.setHours(expireTime.getHours() - 24); // 24小时前

    const q = query(
      collection(db, GLOBAL_COLLECTIONS.VISIT_SESSIONS),
      where('status', '==', 'pending'),
      orderBy('checkInAt', 'asc')
    );

    const snapshot = await getDocs(q);
    const sessions: VisitSession[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const checkInAt = data.checkInAt?.toDate?.() || new Date(data.checkInAt);
      // 检查是否超过24小时
      if (checkInAt <= expireTime) {
        sessions.push(processVisitSessionData(data, doc.id));
      }
    });

    return sessions;
  } catch (error: any) {
    // 如果查询失败（可能是缺少索引），返回空数组
    console.error('获取过期驻店记录失败:', error);
    return [];
  }
};

/**
 * 在驻店期间添加兑换项
 */
export const addRedemptionToSession = async (
  sessionId: string,
  redemption: {
    cigarId: string;
    cigarName: string;
    quantity: number;
    redeemedBy: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const sessionDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.VISIT_SESSIONS, sessionId));
    if (!sessionDoc.exists()) {
      return { success: false, error: '驻店记录不存在' };
    }

    const sessionData = sessionDoc.data();
    if (sessionData.status !== 'pending') {
      return { success: false, error: '只能在待处理的驻店记录中添加兑换' };
    }

    const redemptions = sessionData.redemptions || [];
    redemptions.push({
      ...redemption,
      redeemedAt: Timestamp.fromDate(new Date())
    });

    await updateDoc(doc(db, GLOBAL_COLLECTIONS.VISIT_SESSIONS, sessionId), {
      redemptions,
      updatedAt: Timestamp.fromDate(new Date())
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || '添加兑换项失败' };
  }
};

