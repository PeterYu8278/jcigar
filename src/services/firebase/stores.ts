import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Store } from '../../types';
import { convertFirestoreTimestamps } from './auth';

const STORES_COLLECTION = 'stores';

/**
 * 获取所有门店
 */
export const getAllStores = async () => {
  try {
    const q = query(collection(db, STORES_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertFirestoreTimestamps(doc.data())
    })) as Store[];
  } catch (error) {
    console.error('[Stores Service] getAllStores error:', error);
    throw error;
  }
};

/**
 * 获取活跃门店
 */
export const getActiveStores = async () => {
  try {
    const q = query(
      collection(db, STORES_COLLECTION), 
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertFirestoreTimestamps(doc.data())
    })) as Store[];
  } catch (error) {
    console.error('[Stores Service] getActiveStores error:', error);
    throw error;
  }
};

/**
 * 根据 ID 获取门店
 */
export const getStoreById = async (storeId: string) => {
  try {
    const docRef = doc(db, STORES_COLLECTION, storeId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...convertFirestoreTimestamps(docSnap.data())
      } as Store;
    }
    return null;
  } catch (error) {
    console.error('[Stores Service] getStoreById error:', error);
    throw error;
  }
};

/**
 * 创建门店
 */
export const createStore = async (storeData: Omit<Store, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const now = new Date();
    const docRef = await addDoc(collection(db, STORES_COLLECTION), {
      ...storeData,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('[Stores Service] createStore error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 更新门店
 */
export const updateStore = async (storeId: string, storeData: Partial<Omit<Store, 'id' | 'createdAt' | 'updatedAt'>>) => {
  try {
    const docRef = doc(db, STORES_COLLECTION, storeId);
    await updateDoc(docRef, {
      ...storeData,
      updatedAt: Timestamp.fromDate(new Date())
    });
    return { success: true };
  } catch (error: any) {
    console.error('[Stores Service] updateStore error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 删除门店
 */
export const deleteStore = async (storeId: string) => {
  try {
    const docRef = doc(db, STORES_COLLECTION, storeId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error: any) {
    console.error('[Stores Service] deleteStore error:', error);
    return { success: false, error: error.message };
  }
};
