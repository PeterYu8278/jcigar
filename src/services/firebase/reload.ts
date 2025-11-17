// 充值记录服务
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
import type { ReloadRecord, User } from '../../types';
import { createPointsRecord } from './pointsRecords';

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
    };

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

    // 更新充值记录状态
    await updateDoc(doc(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS, recordId), {
      status: 'verified',
      verifiedAt: Timestamp.fromDate(now),
      verifiedBy,
      verificationProof: verificationProof || null,
      adminNotes: adminNotes || null,
      pointsRecordId: pointsRecord?.id || null,
      updatedAt: Timestamp.fromDate(now)
    });

    // 标记为已完成（积分已到账）
    await updateDoc(doc(db, GLOBAL_COLLECTIONS.RELOAD_RECORDS, recordId), {
      status: 'completed',
      updatedAt: Timestamp.fromDate(now)
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || '验证充值记录失败' };
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
  } catch (error) {
    return [];
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
  } catch (error) {
    return [];
  }
};

