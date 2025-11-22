/**
 * 通知 Hook
 * 管理推送通知的状态和操作
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { message, notification as antNotification } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getFCMToken,
  deleteFCMToken,
  onForegroundMessage
} from '@/services/firebase/messaging';
import {
  saveDeviceToken,
  removeDeviceToken,
  getUserDeviceTokens
} from '@/services/firebase/deviceTokens';
import { DeviceToken, NotificationPreferences } from '@/types';
import { playNotificationSound, getNotificationIcon, getNotificationURL } from '@/utils/notification';
import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { getDocument } from '@/services/firebase/firestore';
import type { User } from '@/types';

interface UseNotificationsReturn {
  // 状态
  isSupported: boolean;
  permission: NotificationPermission;
  isEnabled: boolean;
  currentToken: string | null;
  deviceTokens: DeviceToken[];
  loading: boolean;
  
  // 操作
  requestPermission: () => Promise<boolean>;
  subscribeToNotifications: () => Promise<boolean>;
  unsubscribeFromNotifications: () => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<boolean>;
}

export const useNotifications = (userId?: string, userPushEnabled?: boolean): UseNotificationsReturn => {
  const { t } = useTranslation();
  
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [deviceTokens, setDeviceTokens] = useState<DeviceToken[]>([]);
  const [loading, setLoading] = useState(false);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // 初始化：检查支持和权限
  useEffect(() => {
    const initialize = async () => {
      const supported = await isNotificationSupported();
      setIsSupported(supported);
      
      if (supported) {
        const perm = getNotificationPermission();
        setPermission(perm);
      }
    };

    initialize();
  }, []);

  // 从传入的 userPushEnabled 值更新 isEnabled 状态
  // 这样可以从 useAuthStore 的 user 对象中读取，避免重新查询数据库
  useEffect(() => {
    if (!isSupported) return;
    
    const perm = getNotificationPermission();
    setPermission(perm);
    
    if (!userId) {
      // 没有 userId，只基于浏览器权限
      setIsEnabled(perm === 'granted');
      return;
    }
    
    // ✅ 优先使用传入的 userPushEnabled 值（来自 useAuthStore 的 user 对象）
    // 这样可以确保状态与 store 中的 user 对象一致
    if (userPushEnabled !== undefined) {
      // userPushEnabled 明确是 boolean 值（true/false），使用它
      setIsEnabled(userPushEnabled === true && perm === 'granted');
      console.log('[useNotifications] Initialized from user store:', {
        userPushEnabled,
        permission: perm,
        isEnabled: userPushEnabled === true && perm === 'granted'
      });
    } else {
      // userPushEnabled 是 undefined（user 对象可能还未加载），等待或使用默认值
      // 为了保持一致性，如果浏览器权限已授予，先设置为 false（等待 user 对象加载）
      setIsEnabled(false);
      console.log('[useNotifications] Waiting for user data to load...');
    }
  }, [userId, userPushEnabled, isSupported]);

  // 加载设备令牌
  useEffect(() => {
    if (!userId || !isEnabled) return;

    const loadDeviceTokens = async () => {
      const result = await getUserDeviceTokens(userId);
      if (result.success && result.tokens) {
        setDeviceTokens(result.tokens);
      }
    };

    loadDeviceTokens();
  }, [userId, isEnabled]);

  // 监听前台消息
  useEffect(() => {
    if (!isEnabled) return;

    // 设置前台消息监听
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('[useNotifications] Received foreground message:', payload);
      
      // 播放提示音
      playNotificationSound();
      
      // 显示 Ant Design 通知
      if (payload.notification) {
        const { title, body } = payload.notification;
        const notificationType = payload.data?.type || 'system';
        const iconUrl = getNotificationIcon(notificationType);
        
        // 使用 createElement 而不是 JSX
        const iconElement = React.createElement('img', {
          src: iconUrl,
          alt: 'notification',
          style: { width: 24, height: 24 }
        });
        
        antNotification.open({
          message: title,
          description: body,
          icon: iconElement,
          placement: 'topRight',
          duration: 5,
          onClick: () => {
            // 导航到相应页面
            const url = getNotificationURL(notificationType, payload.data);
            window.location.href = url;
          }
        });
      }
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [isEnabled]);

  // 请求通知权限
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      message.warning(t('notifications.notSupported'));
      return false;
    }

    setLoading(true);
    try {
      const result = await requestNotificationPermission();
      
      if (result.success) {
        setPermission('granted');
        setIsEnabled(true);
        message.success(t('notifications.permissionGranted'));
        return true;
      } else {
        if (result.permission === 'denied') {
          message.error(t('notifications.permissionDenied'));
        }
        return false;
      }
    } finally {
      setLoading(false);
    }
  }, [isSupported, t]);

  // 订阅推送通知
  const subscribeToNotifications = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      message.error('User not authenticated');
      return false;
    }

    if (!isEnabled) {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    setLoading(true);
    try {
      // 获取 FCM 令牌
      const tokenResult = await getFCMToken();
      
      if (!tokenResult.success || !tokenResult.token) {
        message.error(t('notifications.tokenFailed'));
        return false;
      }

      // 保存令牌到 Firestore
      const saveResult = await saveDeviceToken(userId, tokenResult.token);
      
      if (!saveResult.success) {
        message.error(t('notifications.saveFailed'));
        return false;
      }

      setCurrentToken(tokenResult.token);
      message.success(t('notifications.subscribeSuccess'));
      
      // 刷新设备令牌列表
      const devicesResult = await getUserDeviceTokens(userId);
      if (devicesResult.success && devicesResult.tokens) {
        setDeviceTokens(devicesResult.tokens);
      }
      
      // ✅ 更新数据库中的 pushEnabled 状态
      try {
        const userRef = doc(db, GLOBAL_COLLECTIONS.USERS, userId);
        await updateDoc(userRef, {
          'notifications.pushEnabled': true,
          updatedAt: Timestamp.fromDate(new Date())
        });
        setIsEnabled(true);
        console.log('[useNotifications] Updated pushEnabled to true in database');
        
        // ✅ 同步更新 useAuthStore 中的用户数据
        try {
          const { useAuthStore } = await import('@/store/modules/auth');
          const currentUser = useAuthStore.getState().user;
          if (currentUser && currentUser.id === userId) {
            useAuthStore.getState().setUser({
              ...currentUser,
              notifications: {
                ...(currentUser as any)?.notifications,
                pushEnabled: true
              }
            } as User);
            console.log('[useNotifications] Synced pushEnabled to auth store');
          }
        } catch (storeError) {
          console.error('[useNotifications] Error syncing to auth store:', storeError);
          // 同步失败不影响订阅流程
        }
      } catch (error) {
        console.error('[useNotifications] Error updating pushEnabled:', error);
        // 更新失败不影响订阅流程
      }
      
      return true;
    } catch (error) {
      console.error('[useNotifications] Subscribe error:', error);
      message.error(t('notifications.subscribeFailed'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, isEnabled, requestPermission, t]);

  // 取消订阅推送通知
  const unsubscribeFromNotifications = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      message.error('User not authenticated');
      return false;
    }

    setLoading(true);
    try {
      // 如果有令牌，删除 FCM 令牌
      if (currentToken) {
        await deleteFCMToken();
        // 从 Firestore 移除令牌
        await removeDeviceToken(userId, currentToken);
        setCurrentToken(null);
      }
      
      message.success(t('notifications.unsubscribeSuccess'));
      
      // ✅ 更新数据库中的 pushEnabled 状态（即使没有令牌也要更新）
      try {
        const userRef = doc(db, GLOBAL_COLLECTIONS.USERS, userId);
        await updateDoc(userRef, {
          'notifications.pushEnabled': false,
          'notifications.deviceTokens': [], // 清空设备令牌数组
          updatedAt: Timestamp.fromDate(new Date())
        });
        setIsEnabled(false);
        setDeviceTokens([]); // 清空本地状态
        console.log('[useNotifications] Updated pushEnabled to false in database');
        
        // ✅ 同步更新 useAuthStore 中的用户数据
        try {
          const { useAuthStore } = await import('@/store/modules/auth');
          const currentUser = useAuthStore.getState().user;
          if (currentUser && currentUser.id === userId) {
            useAuthStore.getState().setUser({
              ...currentUser,
              notifications: {
                ...(currentUser as any)?.notifications,
                pushEnabled: false,
                deviceTokens: []
              }
            } as User);
            console.log('[useNotifications] Synced pushEnabled to auth store');
          }
        } catch (storeError) {
          console.error('[useNotifications] Error syncing to auth store:', storeError);
          // 同步失败不影响取消订阅流程
        }
      } catch (error) {
        console.error('[useNotifications] Error updating pushEnabled:', error);
        // 更新失败不影响取消订阅流程
        setIsEnabled(false); // 仍然更新本地状态
        setDeviceTokens([]);
      }
      
      return true;
    } catch (error) {
      console.error('[useNotifications] Unsubscribe error:', error);
      message.error(t('notifications.unsubscribeFailed'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, currentToken, t]);

  // 刷新令牌
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    setLoading(true);
    try {
      const tokenResult = await getFCMToken();
      
      if (tokenResult.success && tokenResult.token) {
        await saveDeviceToken(userId, tokenResult.token);
        setCurrentToken(tokenResult.token);
        return true;
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 更新通知偏好设置
  const updatePreferences = useCallback(async (
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> => {
    if (!userId) return false;

    setLoading(true);
    try {
      const userRef = doc(db, GLOBAL_COLLECTIONS.USERS, userId);
      
      // 构建更新对象
      const updates: Record<string, any> = {};
      Object.keys(preferences).forEach(key => {
        updates[`notifications.preferences.${key}`] = preferences[key as keyof NotificationPreferences];
      });
      updates.updatedAt = Timestamp.fromDate(new Date());
      
      await updateDoc(userRef, updates);
      
      message.success(t('notifications.preferencesUpdated'));
      return true;
    } catch (error) {
      console.error('[useNotifications] Update preferences error:', error);
      message.error(t('notifications.preferencesUpdateFailed'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  return {
    isSupported,
    permission,
    isEnabled,
    currentToken,
    deviceTokens,
    loading,
    requestPermission,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    refreshToken,
    updatePreferences
  };
};

