// Firebase Cloud Messaging 服务
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { collection, doc, setDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import type { User } from '../../types';

// VAPID 公钥（从环境变量读取）
const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY;

let messagingInstance: Messaging | null = null;

/**
 * 获取 Messaging 实例（单例模式）
 */
export const getMessagingInstance = async (): Promise<Messaging | null> => {
  // 检查浏览器支持
  if (!await isSupported()) {
    console.warn('[FCM] Browser does not support Firebase Cloud Messaging');
    return null;
  }

  if (!messagingInstance) {
    try {
      messagingInstance = getMessaging();
    } catch (error) {
      console.error('[FCM] Failed to initialize messaging:', error);
      return null;
    }
  }

  return messagingInstance;
};

/**
 * 请求通知权限
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('[FCM] This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  // 请求权限
  const permission = await Notification.requestPermission();
  return permission;
};

/**
 * 注册 Firebase Messaging Service Worker
 */
const registerFirebaseMessagingSW = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('[FCM] Service Worker not supported');
    return null;
  }

  try {
    // 检查是否已有 Service Worker 注册
    const existingRegistration = await navigator.serviceWorker.getRegistration('/');
    if (existingRegistration) {
      console.log('[FCM] Using existing Service Worker:', existingRegistration.scope);
      return existingRegistration;
    }

    // 尝试注册 Firebase Messaging Service Worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    
    console.log('[FCM] Firebase Messaging Service Worker registered:', registration.scope);
    
    // 等待 Service Worker 激活
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        const installing = registration.installing;
        if (!installing) {
          resolve();
          return;
        }
        
        installing.addEventListener('statechange', () => {
          // 检查 installing 是否仍然存在（可能在事件触发时变为 null）
          if (!installing || installing.state === 'activated' || installing.state === 'redundant') {
            resolve();
          }
        });
        
        // 如果已经激活，立即 resolve
        if (installing.state === 'activated') {
          resolve();
        }
      });
    } else if (registration.waiting) {
      await new Promise<void>((resolve) => {
        const waiting = registration.waiting;
        if (!waiting) {
          resolve();
          return;
        }
        
        waiting.addEventListener('statechange', () => {
          // 检查 waiting 是否仍然存在
          if (!waiting || waiting.state === 'activated' || waiting.state === 'redundant') {
            resolve();
          }
        });
        
        // 如果已经激活，立即 resolve
        if (waiting.state === 'activated') {
          resolve();
        }
      });
    } else if (registration.active) {
      // Service Worker 已经激活
      console.log('[FCM] Service Worker already active');
    }
    
    return registration;
  } catch (error: any) {
    console.error('[FCM] Failed to register Firebase Messaging Service Worker:', error);
    
    // 如果注册失败，尝试使用已存在的 Service Worker
    try {
      const registration = await navigator.serviceWorker.ready;
      console.log('[FCM] Using existing Service Worker (ready):', registration.scope);
      return registration;
    } catch (readyError) {
      console.error('[FCM] No Service Worker available:', readyError);
      // 在开发环境中，如果 Service Worker 不可用，返回 null 但不抛出错误
      if (import.meta.env.DEV) {
        console.warn('[FCM] Service Worker registration skipped in development mode');
      }
      return null;
    }
  }
};

/**
 * 获取 FCM Token
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging || !VAPID_KEY) {
      console.warn('[FCM] Messaging not available or VAPID key missing');
      return null;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('[FCM] User not authenticated');
      return null;
    }

    // 请求权限
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission not granted');
      return null;
    }

    // 注册 Firebase Messaging Service Worker
    const swRegistration = await registerFirebaseMessagingSW();
    
    // 准备 getToken 选项
    const tokenOptions: { vapidKey: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = {
      vapidKey: VAPID_KEY
    };
    
    // 如果成功注册了 Service Worker，则使用它
    if (swRegistration) {
      tokenOptions.serviceWorkerRegistration = swRegistration;
    } else {
      // 如果没有注册成功，尝试让 Firebase 使用默认的 Service Worker
      // 这在开发环境中可能会失败，但不会阻止应用运行
      if (import.meta.env.DEV) {
        console.warn('[FCM] Service Worker registration failed, trying without explicit registration');
      }
    }

    // 获取 Token
    const token = await getToken(messaging, tokenOptions);

    if (!token) {
      console.warn('[FCM] No registration token available');
      return null;
    }

    return token;
  } catch (error) {
    console.error('[FCM] Error getting token:', error);
    return null;
  }
};

/**
 * 保存 FCM Token 到 Firestore
 */
export const saveFCMToken = async (token: string, userId: string): Promise<boolean> => {
  try {
    const deviceInfo = {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language
    };

    const tokenData = {
      token,
      deviceInfo,
      createdAt: new Date(),
      lastUsed: new Date(),
      active: true
    };

    // 检查是否已存在相同的 Token
    const tokensRef = collection(db, 'users', userId, 'fcmTokens');
    const existingQuery = query(tokensRef, where('token', '==', token));
    const existingSnap = await getDocs(existingQuery);

    if (!existingSnap.empty) {
      // 更新现有 Token
      const docId = existingSnap.docs[0].id;
      await setDoc(doc(db, 'users', userId, 'fcmTokens', docId), {
        ...tokenData,
        lastUsed: new Date()
      }, { merge: true });
    } else {
      // 创建新 Token 记录
      const tokenDocRef = doc(tokensRef);
      await setDoc(tokenDocRef, tokenData);
    }

    return true;
  } catch (error) {
    console.error('[FCM] Error saving token:', error);
    return false;
  }
};

/**
 * 删除 FCM Token
 */
export const deleteFCMToken = async (userId: string, token: string): Promise<boolean> => {
  try {
    const tokensRef = collection(db, 'users', userId, 'fcmTokens');
    const querySnapshot = await getDocs(query(tokensRef, where('token', '==', token)));

    if (!querySnapshot.empty) {
      const docId = querySnapshot.docs[0].id;
      await deleteDoc(doc(db, 'users', userId, 'fcmTokens', docId));
      return true;
    }

    return false;
  } catch (error) {
    console.error('[FCM] Error deleting token:', error);
    return false;
  }
};

/**
 * 初始化推送通知（获取 Token 并保存）
 */
export const initializePushNotifications = async (user: User): Promise<boolean> => {
  try {
    // 检查用户是否启用推送通知
    // preferences 在文档根目录下，不在 profile 下
    const pushEnabled = (user as any)?.preferences?.pushNotifications?.enabled !== false;
    if (!pushEnabled) {
      console.log('[FCM] Push notifications disabled by user');
      return false;
    }

    // 获取 Token
    const token = await getFCMToken();
    if (!token) {
      return false;
    }

    // 保存 Token 到 Firestore
    const saved = await saveFCMToken(token, user.id);
    if (!saved) {
      return false;
    }

    // 同时调用 Netlify Function 保存（向后端同步）
    try {
      const response = await fetch('/.netlify/functions/save-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          userId: user.id,
          deviceInfo: {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            language: navigator.language
          }
        })
      });

      if (!response.ok) {
        console.warn('[FCM] Failed to sync token to backend');
      }
    } catch (error) {
      console.warn('[FCM] Error syncing token to backend:', error);
    }

    return true;
  } catch (error) {
    console.error('[FCM] Error initializing push notifications:', error);
    return false;
  }
};

/**
 * 监听前台推送消息（应用打开时）
 */
export const onForegroundMessage = (callback: (payload: any) => void): (() => void) | null => {
  let unsubscribe: (() => void) | null = null;

  getMessagingInstance().then((messaging) => {
    if (!messaging) return;

    unsubscribe = onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      callback(payload);
    });
  });

  return unsubscribe || null;
};

/**
 * 订阅主题
 */
export const subscribeToTopic = async (topic: string): Promise<boolean> => {
  try {
    const token = await getFCMToken();
    if (!token) return false;

    // 调用 Netlify Function 订阅主题
    const response = await fetch('/.netlify/functions/subscribe-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        topic,
        action: 'subscribe'
      })
    });

    return response.ok;
  } catch (error) {
    console.error('[FCM] Error subscribing to topic:', error);
    return false;
  }
};

/**
 * 取消订阅主题
 */
export const unsubscribeFromTopic = async (topic: string): Promise<boolean> => {
  try {
    const token = await getFCMToken();
    if (!token) return false;

    // 调用 Netlify Function 取消订阅
    const response = await fetch('/.netlify/functions/subscribe-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        topic,
        action: 'unsubscribe'
      })
    });

    return response.ok;
  } catch (error) {
    console.error('[FCM] Error unsubscribing from topic:', error);
    return false;
  }
};

