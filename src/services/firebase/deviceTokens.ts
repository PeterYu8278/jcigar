/**
 * 设备令牌管理服务
 * 负责将 FCM 令牌保存到 Firestore 并管理令牌生命周期
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  Timestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { DeviceToken } from '@/types';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { getDeviceInfo } from './messaging';

/**
 * 保存设备令牌到 Firestore
 */
export const saveDeviceToken = async (
  userId: string,
  token: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 检查该令牌是否已存在
    const tokensRef = collection(db, GLOBAL_COLLECTIONS.DEVICE_TOKENS);
    const q = query(tokensRef, where('token', '==', token));
    const snapshot = await getDocs(q);

    const deviceInfo = getDeviceInfo();
    const now = new Date();

    if (!snapshot.empty) {
      // 令牌已存在，更新 lastUsedAt
      const tokenDoc = snapshot.docs[0];
      await updateDoc(doc(db, GLOBAL_COLLECTIONS.DEVICE_TOKENS, tokenDoc.id), {
        lastUsedAt: Timestamp.fromDate(now),
        isActive: true,
        deviceInfo // 更新设备信息（可能有变化）
      });
      
      console.log('[DeviceTokens] Updated existing token');
    } else {
      // 创建新令牌
      const tokenData: Omit<DeviceToken, 'id'> = {
        userId,
        token,
        deviceInfo,
        createdAt: now,
        lastUsedAt: now,
        isActive: true
      };

      const docRef = doc(collection(db, GLOBAL_COLLECTIONS.DEVICE_TOKENS));
      await setDoc(docRef, {
        ...tokenData,
        createdAt: Timestamp.fromDate(tokenData.createdAt),
        lastUsedAt: Timestamp.fromDate(tokenData.lastUsedAt)
      });

      console.log('[DeviceTokens] Created new token');
    }

    // 更新用户的 deviceTokens 数组
    const userRef = doc(db, GLOBAL_COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      'notifications.deviceTokens': arrayUnion(token),
      updatedAt: Timestamp.fromDate(now)
    });

    return { success: true };
  } catch (error: any) {
    console.error('[DeviceTokens] Error saving device token:', error);
    return {
      success: false,
      error: error.message || 'Failed to save device token'
    };
  }
};

/**
 * 删除设备令牌
 */
export const removeDeviceToken = async (
  userId: string,
  token: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 从 deviceTokens 集合中删除
    const tokensRef = collection(db, GLOBAL_COLLECTIONS.DEVICE_TOKENS);
    const q = query(tokensRef, where('token', '==', token), where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const deletePromises = snapshot.docs.map(tokenDoc =>
      deleteDoc(doc(db, GLOBAL_COLLECTIONS.DEVICE_TOKENS, tokenDoc.id))
    );
    await Promise.all(deletePromises);

    // 从用户的 deviceTokens 数组中移除
    const userRef = doc(db, GLOBAL_COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      'notifications.deviceTokens': arrayRemove(token),
      updatedAt: Timestamp.fromDate(new Date())
    });

    console.log('[DeviceTokens] Removed device token');
    return { success: true };
  } catch (error: any) {
    console.error('[DeviceTokens] Error removing device token:', error);
    return {
      success: false,
      error: error.message || 'Failed to remove device token'
    };
  }
};

/**
 * 获取用户的所有设备令牌
 */
export const getUserDeviceTokens = async (
  userId: string
): Promise<{ success: boolean; tokens?: DeviceToken[]; error?: string }> => {
  try {
    const tokensRef = collection(db, GLOBAL_COLLECTIONS.DEVICE_TOKENS);
    const q = query(tokensRef, where('userId', '==', userId), where('isActive', '==', true));
    const snapshot = await getDocs(q);

    const tokens: DeviceToken[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        token: data.token,
        deviceInfo: data.deviceInfo,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastUsedAt: data.lastUsedAt?.toDate() || new Date(),
        isActive: data.isActive
      };
    });

    return { success: true, tokens };
  } catch (error: any) {
    console.error('[DeviceTokens] Error getting user device tokens:', error);
    return {
      success: false,
      error: error.message || 'Failed to get device tokens'
    };
  }
};

/**
 * 标记令牌为无效（当推送失败时）
 */
export const markTokenAsInactive = async (
  token: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const tokensRef = collection(db, GLOBAL_COLLECTIONS.DEVICE_TOKENS);
    const q = query(tokensRef, where('token', '==', token));
    const snapshot = await getDocs(q);

    const updatePromises = snapshot.docs.map(tokenDoc =>
      updateDoc(doc(db, GLOBAL_COLLECTIONS.DEVICE_TOKENS, tokenDoc.id), {
        isActive: false,
        updatedAt: Timestamp.fromDate(new Date())
      })
    );
    await Promise.all(updatePromises);

    console.log('[DeviceTokens] Marked token as inactive');
    return { success: true };
  } catch (error: any) {
    console.error('[DeviceTokens] Error marking token as inactive:', error);
    return {
      success: false,
      error: error.message || 'Failed to mark token as inactive'
    };
  }
};

/**
 * 清理用户的所有设备令牌（用户登出时）
 */
export const clearUserDeviceTokens = async (
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 删除 deviceTokens 集合中的所有令牌
    const tokensRef = collection(db, GLOBAL_COLLECTIONS.DEVICE_TOKENS);
    const q = query(tokensRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const deletePromises = snapshot.docs.map(tokenDoc =>
      deleteDoc(doc(db, GLOBAL_COLLECTIONS.DEVICE_TOKENS, tokenDoc.id))
    );
    await Promise.all(deletePromises);

    // 清空用户的 deviceTokens 数组
    const userRef = doc(db, GLOBAL_COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      'notifications.deviceTokens': [],
      updatedAt: Timestamp.fromDate(new Date())
    });

    console.log('[DeviceTokens] Cleared all user device tokens');
    return { success: true };
  } catch (error: any) {
    console.error('[DeviceTokens] Error clearing user device tokens:', error);
    return {
      success: false,
      error: error.message || 'Failed to clear device tokens'
    };
  }
};

