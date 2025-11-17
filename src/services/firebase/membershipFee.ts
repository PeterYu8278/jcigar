// 会员年费配置与记录服务
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
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { GLOBAL_COLLECTIONS } from '../../config/globalCollections';
import type { MembershipFeeConfig, MembershipFeeRecord, User } from '../../types';
import { createPointsRecord } from './pointsRecords';

/**
 * 获取会员费配置
 */
export const getMembershipFeeConfig = async (): Promise<MembershipFeeConfig | null> => {
  try {
    const docRef = doc(db, 'config', 'membershipFee');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        annualFees: (data.annualFees || []).map((fee: any) => ({
          ...fee,
          startDate: fee.startDate?.toDate?.() || new Date(fee.startDate),
          endDate: fee.endDate?.toDate?.() || fee.endDate
        })),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
      } as MembershipFeeConfig;
    }
    
    return getDefaultMembershipFeeConfig();
  } catch (error) {
    return null;
  }
};

/**
 * 更新会员费配置
 */
export const updateMembershipFeeConfig = async (
  config: Omit<MembershipFeeConfig, 'id' | 'updatedAt'>,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, 'config', 'membershipFee');
    
    await setDoc(docRef, {
      ...config,
      annualFees: config.annualFees.map(fee => ({
        ...fee,
        startDate: Timestamp.fromDate(fee.startDate),
        endDate: fee.endDate ? Timestamp.fromDate(fee.endDate) : null
      })),
      updatedAt: Timestamp.fromDate(new Date()),
      updatedBy: userId
    }, { merge: true });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || '更新失败' };
  }
};

/**
 * 获取默认会员费配置
 */
export const getDefaultMembershipFeeConfig = (): MembershipFeeConfig => {
  return {
    id: 'default',
    annualFees: [
      {
        startDate: new Date('2025-01-01'),
        amount: 1000 // 默认年费1000积分
      }
    ],
    hourlyRate: 10, // 默认每小时10积分
    updatedAt: new Date(),
    updatedBy: 'system'
  };
};

/**
 * 根据日期获取当前生效的年费金额
 */
export const getCurrentAnnualFeeAmount = async (date?: Date): Promise<number> => {
  const config = await getMembershipFeeConfig();
  if (!config || !config.annualFees || config.annualFees.length === 0) {
    return 1000; // 默认值
  }

  const targetDate = date || new Date();
  
  // 找到第一个生效的配置（按startDate排序）
  const sortedFees = [...config.annualFees].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );

  for (const fee of sortedFees.reverse()) {
    if (targetDate >= fee.startDate) {
      if (!fee.endDate || targetDate <= fee.endDate) {
        return fee.amount;
      }
    }
  }

  // 如果没有匹配的，返回第一个（默认）
  return sortedFees[0]?.amount || 1000;
};

/**
 * 创建会员年费记录
 */
export const createMembershipFeeRecord = async (
  userId: string,
  dueDate: Date,
  renewalType: 'initial' | 'renewal' = 'initial',
  previousDueDate?: Date,
  userName?: string
): Promise<{ success: boolean; recordId?: string; error?: string }> => {
  try {
    const amount = await getCurrentAnnualFeeAmount(dueDate);

    const userDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) {
      return { success: false, error: '用户不存在' };
    }

    const userData = userDoc.data() as User;
    const recordData: Omit<MembershipFeeRecord, 'id'> = {
      userId,
      userName: userName || userData.displayName,
      amount,
      dueDate,
      renewalType,
      previousDueDate,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, GLOBAL_COLLECTIONS.MEMBERSHIP_FEE_RECORDS), {
      ...recordData,
      dueDate: Timestamp.fromDate(dueDate),
      previousDueDate: previousDueDate ? Timestamp.fromDate(previousDueDate) : null,
      createdAt: Timestamp.fromDate(recordData.createdAt),
      updatedAt: Timestamp.fromDate(recordData.updatedAt)
    });

    return { success: true, recordId: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message || '创建年费记录失败' };
  }
};

/**
 * 获取待扣费的年费记录
 */
export const getPendingMembershipFeeRecords = async (targetDate?: Date): Promise<MembershipFeeRecord[]> => {
  try {
    const date = targetDate || new Date();
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const q = query(
      collection(db, GLOBAL_COLLECTIONS.MEMBERSHIP_FEE_RECORDS),
      where('status', '==', 'pending'),
      where('dueDate', '>=', Timestamp.fromDate(startOfDay)),
      where('dueDate', '<', Timestamp.fromDate(endOfDay)),
      orderBy('dueDate', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dueDate: data.dueDate?.toDate?.() || new Date(data.dueDate),
        deductedAt: data.deductedAt?.toDate?.() || data.deductedAt,
        previousDueDate: data.previousDueDate?.toDate?.() || data.previousDueDate,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
      } as MembershipFeeRecord;
    });
  } catch (error) {
    return [];
  }
};

/**
 * 扣除年费
 */
export const deductMembershipFee = async (
  recordId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const recordDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERSHIP_FEE_RECORDS, recordId));
    if (!recordDoc.exists()) {
      return { success: false, error: '年费记录不存在' };
    }

    const recordData = recordDoc.data();
    const record: MembershipFeeRecord = {
      id: recordDoc.id,
      ...recordData,
      dueDate: recordData.dueDate?.toDate?.() || new Date(recordData.dueDate),
      deductedAt: recordData.deductedAt?.toDate?.() || recordData.deductedAt,
      previousDueDate: recordData.previousDueDate?.toDate?.() || recordData.previousDueDate,
      createdAt: recordData.createdAt?.toDate?.() || new Date(recordData.createdAt),
      updatedAt: recordData.updatedAt?.toDate?.() || new Date(recordData.updatedAt)
    };

    if (record.status !== 'pending') {
      return { success: false, error: '该年费记录已处理' };
    }

    // 获取用户信息
    const userDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.USERS, record.userId));
    if (!userDoc.exists()) {
      return { success: false, error: '用户不存在' };
    }

    const userData = userDoc.data() as User;
    const currentPoints = userData.membership?.points || 0;
    const newPoints = currentPoints - record.amount;

    // 更新用户积分（允许负数）
    await updateDoc(doc(db, GLOBAL_COLLECTIONS.USERS, record.userId), {
      'membership.points': newPoints,
      updatedAt: Timestamp.fromDate(new Date())
    });

    // 创建积分记录
    const pointsRecord = await createPointsRecord({
      userId: record.userId,
      userName: record.userName,
      type: 'spend',
      amount: record.amount,
      source: 'membership_fee',
      description: `会员年费 (${record.renewalType === 'initial' ? '首次开通' : '续费'})`,
      relatedId: recordId,
      balance: newPoints
    });

    const now = new Date();

    // 更新年费记录状态
    if (newPoints >= 0) {
      // 扣费成功
      await updateDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERSHIP_FEE_RECORDS, recordId), {
        status: 'paid',
        deductedAt: Timestamp.fromDate(now),
        pointsRecordId: pointsRecord?.id || null,
        updatedAt: Timestamp.fromDate(now)
      });

      // 更新用户状态为活跃
      await updateDoc(doc(db, GLOBAL_COLLECTIONS.USERS, record.userId), {
        status: 'active',
        updatedAt: Timestamp.fromDate(now)
      });

      // 如果是续费，设置首次驻店免扣费到期时间（续费后30天内）
      if (record.renewalType === 'renewal') {
        const waiverExpiresAt = new Date(now);
        waiverExpiresAt.setDate(waiverExpiresAt.getDate() + 30);
        await updateDoc(doc(db, GLOBAL_COLLECTIONS.USERS, record.userId), {
          'membership.nextFirstVisitWaiverExpiresAt': Timestamp.fromDate(waiverExpiresAt),
          updatedAt: Timestamp.fromDate(now)
        });
      }

      // 创建下一年的年费记录
      const nextDueDate = new Date(record.dueDate);
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
      await createMembershipFeeRecord(
        record.userId,
        nextDueDate,
        'renewal',
        record.dueDate,
        record.userName
      );
    } else {
      // 扣费失败（余额不足）
      await updateDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERSHIP_FEE_RECORDS, recordId), {
        status: 'failed',
        deductedAt: Timestamp.fromDate(now),
        pointsRecordId: pointsRecord?.id || null,
        updatedAt: Timestamp.fromDate(now)
      });

      // 更新用户状态为不活跃
      await updateDoc(doc(db, GLOBAL_COLLECTIONS.USERS, record.userId), {
        status: 'inactive',
        updatedAt: Timestamp.fromDate(now)
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || '扣除年费失败' };
  }
};

/**
 * 获取用户的所有年费记录
 */
export const getUserMembershipFeeRecords = async (
  userId: string,
  limitCount: number = 20
): Promise<MembershipFeeRecord[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.MEMBERSHIP_FEE_RECORDS),
      where('userId', '==', userId),
      orderBy('dueDate', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dueDate: data.dueDate?.toDate?.() || new Date(data.dueDate),
        deductedAt: data.deductedAt?.toDate?.() || data.deductedAt,
        previousDueDate: data.previousDueDate?.toDate?.() || data.previousDueDate,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
      } as MembershipFeeRecord;
    });
  } catch (error) {
    return [];
  }
};

