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

