/**
 * Firebase Cloud Messaging (FCM) 核心服务
 * 负责推送通知的初始化、令牌管理和消息处理
 */

import { getMessaging, getToken, onMessage, deleteToken, Messaging, isSupported } from 'firebase/messaging';
import { app } from '../../config/firebase';
import { message as antMessage } from 'antd';

let messaging: Messaging | null = null;
let messagingInitialized = false;

// VAPID 公钥（需要在 Firebase Console 生成）
// 注意：部署前需要在 .env 中设置 VITE_FIREBASE_VAPID_KEY
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

/**
 * 检查浏览器是否支持推送通知
 */
export const isNotificationSupported = async (): Promise<boolean> => {
  try {
    // 检查 Notification API
    if (!('Notification' in window)) {
      console.log('[FCM] Notification API not supported');
      return false;
    }

    // 检查 Service Worker API
    if (!('serviceWorker' in navigator)) {
      console.log('[FCM] Service Worker not supported');
      return false;
    }

    // 检查 FCM 是否支持
    const supported = await isSupported();
    if (!supported) {
      console.log('[FCM] Firebase Messaging not supported');
      return false;
    }

    return true;
  } catch (error) {
    console.error('[FCM] Error checking notification support:', error);
    return false;
  }
};

/**
 * 初始化 Firebase Messaging
 */
export const initializeMessaging = async (): Promise<Messaging | null> => {
  try {
    if (messagingInitialized && messaging) {
      return messaging;
    }

    // 检查是否支持
    const supported = await isNotificationSupported();
    if (!supported) {
      console.log('[FCM] Push notifications not supported in this browser');
      return null;
    }

    // 检查 VAPID 密钥
    if (!VAPID_KEY) {
      console.error('[FCM] VAPID key not configured. Please set VITE_FIREBASE_VAPID_KEY in .env');
      return null;
    }

    // 初始化 Messaging
    messaging = getMessaging(app);
    messagingInitialized = true;

    console.log('[FCM] Firebase Messaging initialized successfully');
    return messaging;
  } catch (error) {
    console.error('[FCM] Error initializing messaging:', error);
    return null;
  }
};

/**
 * 获取当前通知权限状态
 */
export const getNotificationPermission = (): NotificationPermission => {
  if ('Notification' in window) {
    return Notification.permission;
  }
  return 'denied';
};

/**
 * 请求通知权限
 */
export const requestNotificationPermission = async (): Promise<{
  success: boolean;
  permission: NotificationPermission;
  error?: string;
}> => {
  try {
    // 检查是否支持
    const supported = await isNotificationSupported();
    if (!supported) {
      return {
        success: false,
        permission: 'denied',
        error: 'Push notifications are not supported in this browser'
      };
    }

    // 请求权限
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('[FCM] Notification permission granted');
      return { success: true, permission };
    } else if (permission === 'denied') {
      console.log('[FCM] Notification permission denied');
      return {
        success: false,
        permission,
        error: 'Notification permission denied'
      };
    } else {
      console.log('[FCM] Notification permission dismissed');
      return {
        success: false,
        permission,
        error: 'Notification permission not granted'
      };
    }
  } catch (error: any) {
    console.error('[FCM] Error requesting notification permission:', error);
    return {
      success: false,
      permission: 'denied',
      error: error.message || 'Failed to request permission'
    };
  }
};

/**
 * 获取 FCM 令牌
 */
export const getFCMToken = async (): Promise<{ success: boolean; token?: string; error?: string }> => {
  try {
    // 初始化 Messaging
    const msg = await initializeMessaging();
    if (!msg) {
      return {
        success: false,
        error: 'Firebase Messaging not initialized'
      };
    }

    // 检查权限
    const permission = getNotificationPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Notification permission not granted'
      };
    }

    // 获取 Service Worker 注册
    const registration = await navigator.serviceWorker.ready;
    console.log('[FCM] Service Worker ready:', registration);

    // 获取令牌
    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('[FCM] FCM token obtained:', token.substring(0, 20) + '...');
      return { success: true, token };
    } else {
      console.log('[FCM] No registration token available');
      return {
        success: false,
        error: 'No registration token available'
      };
    }
  } catch (error: any) {
    console.error('[FCM] Error getting FCM token:', error);
    return {
      success: false,
      error: error.message || 'Failed to get FCM token'
    };
  }
};

/**
 * 删除 FCM 令牌
 */
export const deleteFCMToken = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!messaging) {
      return { success: true }; // 没有初始化就不需要删除
    }

    await deleteToken(messaging);
    console.log('[FCM] FCM token deleted');
    return { success: true };
  } catch (error: any) {
    console.error('[FCM] Error deleting FCM token:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete FCM token'
    };
  }
};

/**
 * 监听前台消息（当应用在前台时收到推送）
 */
export const onForegroundMessage = (
  callback: (payload: any) => void
): (() => void) => {
  if (!messaging) {
    console.warn('[FCM] Messaging not initialized, cannot listen to foreground messages');
    return () => {};
  }

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('[FCM] Foreground message received:', payload);
    
    // 显示 Ant Design 通知
    if (payload.notification) {
      antMessage.info({
        content: `${payload.notification.title}: ${payload.notification.body}`,
        duration: 5
      });
    }
    
    // 调用回调
    callback(payload);
  });

  return unsubscribe;
};

/**
 * 获取设备信息
 */
export const getDeviceInfo = (): {
  browser: string;
  os: string;
  deviceType: string;
  userAgent: string;
} => {
  const ua = navigator.userAgent;
  
  // 检测浏览器
  let browser = 'Unknown';
  if (ua.indexOf('Firefox') > -1) {
    browser = 'Firefox';
  } else if (ua.indexOf('Edg') > -1) {
    browser = 'Edge';
  } else if (ua.indexOf('Chrome') > -1) {
    browser = 'Chrome';
  } else if (ua.indexOf('Safari') > -1) {
    browser = 'Safari';
  }

  // 检测操作系统
  let os = 'Unknown';
  if (ua.indexOf('Win') > -1) {
    os = 'Windows';
  } else if (ua.indexOf('Mac') > -1) {
    os = 'macOS';
  } else if (ua.indexOf('Linux') > -1) {
    os = 'Linux';
  } else if (ua.indexOf('Android') > -1) {
    os = 'Android';
  } else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
    os = 'iOS';
  }

  // 检测设备类型
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/Mobi|Android/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/Tablet|iPad/i.test(ua)) {
    deviceType = 'tablet';
  }

  return {
    browser,
    os,
    deviceType,
    userAgent: ua
  };
};

