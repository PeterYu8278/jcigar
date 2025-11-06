// 用户数据迁移工具
import { doc, getDoc, setDoc, deleteDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User } from '../types';

/**
 * 转换 Date 对象为 Firestore Timestamp
 */
const convertDatesToTimestamps = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return Timestamp.fromDate(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertDatesToTimestamps(item));
  }

  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertDatesToTimestamps(value);
    }
    return converted;
  }

  return obj;
};

/**
 * 迁移单个用户数据到新的文档ID
 * @param sourceUserId 源用户ID（当前的文档ID）
 * @param targetUserId 目标用户ID（新的文档ID）
 * @param deleteSource 是否删除源文档（默认false）
 */
export const migrateUserToNewId = async (
  sourceUserId: string,
  targetUserId: string,
  deleteSource: boolean = false
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. 检查源用户是否存在
    const sourceRef = doc(db, 'users', sourceUserId);
    const sourceSnap = await getDoc(sourceRef);
    
    if (!sourceSnap.exists()) {
      return { success: false, error: `源用户不存在: ${sourceUserId}` };
    }

    // 2. 检查目标用户是否已存在
    const targetRef = doc(db, 'users', targetUserId);
    const targetSnap = await getDoc(targetRef);
    
    if (targetSnap.exists()) {
      return { success: false, error: `目标用户ID已存在: ${targetUserId}` };
    }

    // 3. 获取源用户数据（保持原始格式）
    const sourceData = sourceSnap.data();

    // 4. 创建新用户数据，只更新必要字段
    const newUserData = {
      ...sourceData,
      id: targetUserId,
      updatedAt: Timestamp.now()
    };

    // 5. 写入新文档
    await setDoc(targetRef, newUserData);

    // 6. 更新相关集合中的用户引用
    await updateUserReferences(sourceUserId, targetUserId);

    // 7. 如果需要，删除源文档
    if (deleteSource) {
      await deleteDoc(sourceRef);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * 更新所有集合中对该用户的引用
 */
const updateUserReferences = async (oldUserId: string, newUserId: string) => {
  // 更新订单中的用户引用
  const ordersRef = collection(db, 'orders');
  const ordersQuery = query(ordersRef, where('userId', '==', oldUserId));
  const ordersSnap = await getDocs(ordersQuery);
  
  for (const orderDoc of ordersSnap.docs) {
    await updateDoc(doc(db, 'orders', orderDoc.id), { userId: newUserId });
  }

  // 更新活动参与者列表中的用户引用
  const eventsRef = collection(db, 'events');
  const eventsSnap = await getDocs(eventsRef);
  
  for (const eventDoc of eventsSnap.docs) {
    const eventData = eventDoc.data();
    let updated = false;
    
    // 更新 registered 数组
    if (eventData.participants?.registered?.includes(oldUserId)) {
      const newRegistered = eventData.participants.registered.map((id: string) => 
        id === oldUserId ? newUserId : id
      );
      await updateDoc(doc(db, 'events', eventDoc.id), {
        'participants.registered': newRegistered
      });
      updated = true;
    }
    
    // 更新 checkedIn 数组
    if (eventData.participants?.checkedIn?.includes(oldUserId)) {
      const newCheckedIn = eventData.participants.checkedIn.map((id: string) => 
        id === oldUserId ? newUserId : id
      );
      await updateDoc(doc(db, 'events', eventDoc.id), {
        'participants.checkedIn': newCheckedIn
      });
      updated = true;
    }
  }

  // 更新积分记录中的用户引用
  const pointsRecordsRef = collection(db, 'pointsRecords');
  const pointsQuery = query(pointsRecordsRef, where('userId', '==', oldUserId));
  const pointsSnap = await getDocs(pointsQuery);
  
  for (const pointsDoc of pointsSnap.docs) {
    await updateDoc(doc(db, 'pointsRecords', pointsDoc.id), { userId: newUserId });
  }

  // 更新引荐关系
  const usersRef = collection(db, 'users');
  
  // 更新被该用户引荐的人
  const referredQuery = query(usersRef, where('referral.referredByUserId', '==', oldUserId));
  const referredSnap = await getDocs(referredQuery);
  
  for (const referredDoc of referredSnap.docs) {
    await updateDoc(doc(db, 'users', referredDoc.id), {
      'referral.referredByUserId': newUserId
    });
  }

  // 更新该用户引荐的人列表
  const referrersQuery = query(usersRef, where('referral.referrals', 'array-contains', oldUserId));
  const referrersSnap = await getDocs(referrersQuery);
  
  for (const referrerDoc of referrersSnap.docs) {
    const referrerData = referrerDoc.data();
    if (referrerData.referral?.referrals) {
      const newReferrals = referrerData.referral.referrals.map((id: string) => 
        id === oldUserId ? newUserId : id
      );
      await updateDoc(doc(db, 'users', referrerDoc.id), {
        'referral.referrals': newReferrals
      });
    }
  }
};

/**
 * 批量迁移用户（根据映射表）
 * @param migrations 迁移映射 { sourceId: targetId }
 */
export const batchMigrateUsers = async (
  migrations: Record<string, string>,
  deleteSource: boolean = false
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ sourceId: string; targetId: string; error: string }>;
}> => {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ sourceId: string; targetId: string; error: string }>
  };

  for (const [sourceId, targetId] of Object.entries(migrations)) {
    const result = await migrateUserToNewId(sourceId, targetId, deleteSource);
    
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({
        sourceId,
        targetId,
        error: result.error || '未知错误'
      });
    }
  }

  return results;
};

/**
 * 验证用户是否存在
 */
export const checkUserExists = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    return userSnap.exists();
  } catch (error) {
    return false;
  }
};

