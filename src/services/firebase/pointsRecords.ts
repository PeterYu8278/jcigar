// 积分记录服务
import { collection, addDoc, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { GLOBAL_COLLECTIONS } from '../../config/globalCollections';
import type { PointsRecord } from '../../types';

/**
 * 获取所有积分记录
 */
export const getAllPointsRecords = async (limitCount: number = 100): Promise<PointsRecord[]> => {
  try {
    const recordsRef = collection(db, GLOBAL_COLLECTIONS.POINTS_RECORDS);
    const q = query(recordsRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
      } as PointsRecord;
    });
  } catch (error) {
    return [];
  }
};

/**
 * 获取指定用户的积分记录
 */
export const getUserPointsRecords = async (userId: string, limitCount: number = 50): Promise<PointsRecord[]> => {
  try {
    const recordsRef = collection(db, GLOBAL_COLLECTIONS.POINTS_RECORDS);
    const q = query(
      recordsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    
    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
      } as PointsRecord;
    });
    
    console.log(`[getUserPointsRecords] 查询用户 ${userId} 的积分记录，找到 ${records.length} 条`);
    return records;
  } catch (error: any) {
    console.error('[getUserPointsRecords] 查询失败:', error);
    
    // 如果是索引错误，尝试降级查询（不使用 orderBy）
    if (error?.code === 'failed-precondition') {
      console.warn('[getUserPointsRecords] Firestore 索引缺失，使用降级查询（不排序）');
      try {
        const recordsRef = collection(db, GLOBAL_COLLECTIONS.POINTS_RECORDS);
        const fallbackQ = query(
          recordsRef,
          where('userId', '==', userId),
          limit(limitCount * 2) // 获取更多记录以便后续排序
        );
        const snapshot = await getDocs(fallbackQ);
        
        const records = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
          } as PointsRecord;
        });
        
        // 在内存中排序
        records.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        // 限制返回数量
        const limitedRecords = records.slice(0, limitCount);
        console.log(`[getUserPointsRecords] 降级查询成功，找到 ${limitedRecords.length} 条记录`);
        return limitedRecords;
      } catch (fallbackError) {
        console.error('[getUserPointsRecords] 降级查询也失败:', fallbackError);
        throw fallbackError;
      }
    }
    
    throw error; // 抛出错误，让调用者处理
  }
};

/**
 * 创建积分记录
 */
export const createPointsRecord = async (
  record: Omit<PointsRecord, 'id' | 'createdAt'>
): Promise<PointsRecord | null> => {
  try {
    const now = new Date();
    const recordData = {
      ...record,
      createdAt: Timestamp.fromDate(now)
    };

    const docRef = await addDoc(collection(db, GLOBAL_COLLECTIONS.POINTS_RECORDS), recordData);
    
    return {
      id: docRef.id,
      ...record,
      createdAt: now
    };
  } catch (error) {
    return null;
  }
};

