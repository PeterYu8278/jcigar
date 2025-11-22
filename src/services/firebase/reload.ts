// 充值记录服务
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { GLOBAL_COLLECTIONS } from '../../config/globalCollections';
import type { ReloadRecord, User } from '../../types';
import { createPointsRecord } from './pointsRecords';
import { getPointsConfig } from './pointsConfig';

// 充值汇率（1 RM = 多少积分）
const RELOAD_EXCHANGE_RATE = 1; // 1 RM = 1 积分（可根据配置调整）

/**
 * 创建充值记录
 */
export const createReloadRecord = async (
  userId: string,
  requestedAmount: number, // RM
  userName?: string
): Promise<{ success: boolean; recordId?: string; error?: string }> => {
  try {
    const userDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) {
      return { success: false, error: '用户不存在' };
    }

    const userData = userDoc.data() as User;
    const pointsEquivalent = Math.round(requestedAmount * RELOAD_EXCHANGE_RATE);

    const recordData: Omit<ReloadRecord, 'id'> = {
      userId,
      userName: userName || userData.displayName,
      requestedAmount,
      pointsEquivalent,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const now = new Date();
    const docRef = await addDoc(collection(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS), {
      ...recordData,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });

    return { success: true, recordId: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message || '创建充值记录失败' };
  }
};

/**
 * 验证充值记录（管理员操作）
 */
export const verifyReloadRecord = async (
  recordId: string,
  verifiedBy: string,
  verificationProof?: string,
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const recordDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS, recordId));
    if (!recordDoc.exists()) {
      return { success: false, error: '充值记录不存在' };
    }

    const recordData = recordDoc.data();
    const record: ReloadRecord = {
      id: recordDoc.id,
      ...recordData,
      verifiedAt: recordData.verifiedAt?.toDate?.() || recordData.verifiedAt,
      createdAt: recordData.createdAt?.toDate?.() || new Date(recordData.createdAt),
      updatedAt: recordData.updatedAt?.toDate?.() || new Date(recordData.updatedAt)
    } as ReloadRecord;

    if (record.status !== 'pending') {
      return { success: false, error: '该充值记录已处理' };
    }

    // 获取用户信息
    const userDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.USERS, record.userId));
    if (!userDoc.exists()) {
      return { success: false, error: '用户不存在' };
    }

    const userData = userDoc.data() as User;
    const currentPoints = userData.membership?.points || 0;
    let newPoints = currentPoints + record.pointsEquivalent;

    // 如果用户积分为负数，先回填到0或正数
    if (currentPoints < 0) {
      // 负数回填逻辑：新积分 = 原有积分 + 充值积分
      // 例如：-50 + 100 = 50
      newPoints = currentPoints + record.pointsEquivalent;
    }

    // 更新用户积分
    await updateDoc(doc(db, GLOBAL_COLLECTIONS.USERS, record.userId), {
      'membership.points': newPoints,
      updatedAt: Timestamp.fromDate(new Date())
    });

    // 创建积分记录
    const pointsRecord = await createPointsRecord({
      userId: record.userId,
      userName: record.userName,
      type: 'earn',
      amount: record.pointsEquivalent,
      source: 'reload',
      description: `充值 ${record.requestedAmount} RM (${record.pointsEquivalent} 积分)`,
      relatedId: recordId,
      balance: newPoints,
      createdBy: verifiedBy
    });

    const now = new Date();

    // ✅ 检查是否为首次充值，发放首充奖励
    try {
      // 查询该用户是否有其他已完成的充值记录（不包括当前这条）
      const completedReloadsQuery = query(
        collection(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS),
        where('userId', '==', record.userId),
        where('status', '==', 'completed')
      );
      const completedReloadsSnapshot = await getDocs(completedReloadsQuery);
      
      // 如果没有其他已完成的充值记录，说明这是首充
      const isFirstReload = completedReloadsSnapshot.empty;
      
      if (isFirstReload) {
        console.log(`[首充检测] 用户 ${record.userId} 首次充值，检查引荐关系...`);
        
        // 检查用户是否有引荐人
        const referrerId = userData.referral?.referredByUserId;
        
        if (referrerId) {
          console.log(`[首充检测] 发现引荐人 ${referrerId}，准备发放首充奖励...`);
          
          // 获取积分配置
          const pointsConfig = await getPointsConfig();
          
          if (pointsConfig?.reload) {
            const referrerReward = pointsConfig.reload.referrerFirstReload || 0;
            const referredReward = pointsConfig.reload.referredFirstReload || 0;
            
            console.log(`[首充奖励] 引荐人奖励: ${referrerReward}积分, 被引荐人奖励: ${referredReward}积分`);
            
            // 1. 给被引荐人（当前用户）增加首充奖励积分
            if (referredReward > 0) {
              const referredNewPoints = newPoints + referredReward;
              await updateDoc(doc(db, GLOBAL_COLLECTIONS.USERS, record.userId), {
                'membership.points': referredNewPoints,
                updatedAt: Timestamp.fromDate(new Date())
              });
              
              // 创建被引荐人的首充奖励积分记录
              await createPointsRecord({
                userId: record.userId,
                userName: record.userName,
                type: 'earn',
                amount: referredReward,
                source: 'reload',
                description: `首次充值奖励`,
                relatedId: recordId,
                balance: referredNewPoints,
                createdBy: verifiedBy
              });
              
              // 更新 newPoints 以便后续更新充值记录时使用正确的余额
              newPoints = referredNewPoints;
              
              console.log(`[首充奖励] 被引荐人获得 ${referredReward} 积分`);
            }
            
            // 2. 给引荐人增加首充奖励积分
            if (referrerReward > 0) {
              const referrerDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.USERS, referrerId));
              if (referrerDoc.exists()) {
                const referrerData = referrerDoc.data() as User;
                const referrerCurrentPoints = referrerData.membership?.points || 0;
                const referrerNewPoints = referrerCurrentPoints + referrerReward;
                
                await updateDoc(doc(db, GLOBAL_COLLECTIONS.USERS, referrerId), {
                  'membership.points': referrerNewPoints,
                  'membership.referralPoints': (referrerData.membership?.referralPoints || 0) + referrerReward,
                  updatedAt: Timestamp.fromDate(new Date())
                });
                
                // 创建引荐人的首充奖励积分记录
                await createPointsRecord({
                  userId: referrerId,
                  userName: referrerData.displayName,
                  type: 'earn',
                  amount: referrerReward,
                  source: 'reload',
                  description: `引荐用户首次充值奖励 (${record.userName})`,
                  relatedId: recordId,
                  balance: referrerNewPoints,
                  createdBy: verifiedBy
                });
                
                console.log(`[首充奖励] 引荐人获得 ${referrerReward} 积分`);
              } else {
                console.warn(`[首充奖励] 引荐人 ${referrerId} 不存在`);
              }
            }
          } else {
            console.log(`[首充奖励] 积分配置不存在或未配置充值奖励`);
          }
        } else {
          console.log(`[首充检测] 用户没有引荐人，跳过首充奖励`);
        }
      } else {
        console.log(`[首充检测] 非首次充值，跳过首充奖励`);
      }
    } catch (firstReloadError) {
      // 首充奖励发放失败不应该影响充值验证流程
      console.error('[首充奖励] 发放失败:', firstReloadError);
    }

    // 更新充值记录状态为已完成（积分已到账）
    await updateDoc(doc(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS, recordId), {
      status: 'completed',
      verifiedAt: Timestamp.fromDate(now),
      verifiedBy,
      verificationProof: verificationProof || null,
      adminNotes: adminNotes || null,
      pointsRecordId: pointsRecord?.id || null,
      updatedAt: Timestamp.fromDate(now)
    });

    // ✅ 发送充值验证成功通知
    try {
      const { sendNotificationToUser } = await import('./notifications');
      await sendNotificationToUser({
        userId: record.userId,
        type: 'reload_verified',
        message: {
          title: '💰 充值成功',
          body: `您的充值 ${record.requestedAmount} RM (${record.pointsEquivalent} 积分) 已到账`,
          icon: '/icons/money-bag.png'
        },
        relatedId: recordId,
        priority: 'high'
      });
      console.log(`[充值通知] 已发送充值成功通知给用户 ${record.userId}`);
    } catch (notificationError: any) {
      // 通知发送失败不应该影响充值验证流程
      console.error('[充值通知] 发送通知失败:', notificationError);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || '验证充值记录失败' };
  }
};

/**
 * 用户撤销充值记录（用户操作）- 直接删除记录
 */
export const cancelReloadRecord = async (
  recordId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const recordDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS, recordId));
    if (!recordDoc.exists()) {
      return { success: false, error: '充值记录不存在' };
    }

    const recordData = recordDoc.data();
    
    // 验证记录属于当前用户
    if (recordData.userId !== userId) {
      return { success: false, error: '无权操作此充值记录' };
    }

    // 只能撤销 pending 状态的记录
    if (recordData.status !== 'pending') {
      return { success: false, error: '该充值记录已处理，无法撤销' };
    }

    // 直接删除记录
    await deleteDoc(doc(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS, recordId));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || '撤销充值记录失败' };
  }
};

/**
 * 拒绝充值记录（管理员操作）
 */
export const rejectReloadRecord = async (
  recordId: string,
  rejectedBy: string,
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const recordDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS, recordId));
    if (!recordDoc.exists()) {
      return { success: false, error: '充值记录不存在' };
    }

    const recordData = recordDoc.data();
    if (recordData.status !== 'pending') {
      return { success: false, error: '该充值记录已处理' };
    }

    const now = new Date();
    await updateDoc(doc(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS, recordId), {
      status: 'rejected',
      verifiedBy: rejectedBy,
      adminNotes: adminNotes || null,
      updatedAt: Timestamp.fromDate(now)
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || '拒绝充值记录失败' };
  }
};

/**
 * 获取用户的充值记录
 */
export const getUserReloadRecords = async (
  userId: string,
  limitCount: number = 20
): Promise<ReloadRecord[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        verifiedAt: data.verifiedAt?.toDate?.() || data.verifiedAt,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
      } as ReloadRecord;
    });
  } catch (error: any) {
    console.error('[getUserReloadRecords] 查询失败，尝试不使用orderBy:', error);
    
    // 如果是因为缺少索引而失败，尝试不使用orderBy重新查询
    try {
      const q = query(
        collection(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS),
        where('userId', '==', userId),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          verifiedAt: data.verifiedAt?.toDate?.() || data.verifiedAt,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
        } as ReloadRecord;
      });
      
      // 手动排序
      const sortedRecords = records.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });
      
      return sortedRecords;
    } catch (retryError) {
      console.error('[getUserReloadRecords] 重试查询也失败:', retryError);
      return [];
    }
  }
};

/**
 * 获取用户待验证的充值记录
 */
export const getUserPendingReloadRecord = async (
  userId: string
): Promise<ReloadRecord | null> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS),
      where('userId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      verifiedAt: data.verifiedAt?.toDate?.() || data.verifiedAt,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
    } as ReloadRecord;
  } catch (error: any) {
    console.error('[getUserPendingReloadRecord] 查询失败，尝试不使用orderBy:', error);
    
    // 如果是因为缺少索引而失败，尝试不使用orderBy重新查询
    try {
      const q = query(
        collection(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS),
        where('userId', '==', userId),
        where('status', '==', 'pending'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }

      // 手动排序，取最新的
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          verifiedAt: data.verifiedAt?.toDate?.() || data.verifiedAt,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
        } as ReloadRecord;
      });
      
      const sortedRecords = records.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });
      
      return sortedRecords[0] || null;
    } catch (retryError) {
      console.error('[getUserPendingReloadRecord] 重试查询也失败:', retryError);
      return null;
    }
  }
};

/**
 * 获取所有充值记录（支持状态筛选）
 */
export const getAllReloadRecords = async (
  statusFilter?: 'pending' | 'completed' | 'rejected',
  limitCount: number = 100
): Promise<ReloadRecord[]> => {
  try {
    let q;
    if (statusFilter) {
      q = query(
        collection(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS),
        where('status', '==', statusFilter),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        verifiedAt: data.verifiedAt?.toDate?.() || data.verifiedAt,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
      } as ReloadRecord;
    });
  } catch (error: any) {
    // 如果查询失败（可能是缺少索引），尝试不使用orderBy
    console.error('[getAllReloadRecords] 查询失败，尝试不使用orderBy:', error);
    try {
      let q;
      if (statusFilter) {
        q = query(
          collection(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS),
          where('status', '==', statusFilter),
          limit(limitCount)
        );
      } else {
        q = query(
          collection(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS),
          limit(limitCount)
        );
      }
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          verifiedAt: data.verifiedAt?.toDate?.() || data.verifiedAt,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
        } as ReloadRecord;
      });
      // 手动排序
      return records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (retryError) {
      console.error('[getAllReloadRecords] 重试查询也失败:', retryError);
      return [];
    }
  }
};

/**
 * 获取所有待验证的充值记录
 */
export const getPendingReloadRecords = async (limitCount: number = 50): Promise<ReloadRecord[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        verifiedAt: data.verifiedAt?.toDate?.() || data.verifiedAt,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
      } as ReloadRecord;
    });
  } catch (error: any) {
    // 如果查询失败（可能是缺少索引），尝试不使用orderBy
    console.error('[getPendingReloadRecords] 查询失败，尝试不使用orderBy:', error);
    try {
      const q = query(
        collection(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS),
        where('status', '==', 'pending'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          verifiedAt: data.verifiedAt?.toDate?.() || data.verifiedAt,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
        } as ReloadRecord;
      });
      // 手动排序
      return records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (retryError) {
      console.error('[getPendingReloadRecords] 重试查询也失败:', retryError);
      return [];
    }
  }
};

