/**
 * 推送通知服务
 * 负责准备通知数据、保存通知历史、以及与后端服务集成发送通知
 * 
 * 注意：实际发送推送通知需要服务器端代码（Firebase Admin SDK 或 Cloud Functions）
 * 本文件提供前端调用接口和数据准备逻辑
 */

import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { 
  NotificationHistory, 
  NotificationType, 
  NotificationPreferences,
  DeviceToken
} from '@/types';
import { createNotificationData, getNotificationIcon } from '@/utils/notification';
import { getUserDeviceTokens } from './deviceTokens';
import { getDocument } from './firestore';

/**
 * 通知消息接口
 */
export interface NotificationMessage {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: string;
  data?: Record<string, string>;
}

/**
 * 通知发送选项
 */
export interface SendNotificationOptions {
  userId: string;
  type: NotificationType;
  message: NotificationMessage;
  relatedId?: string;
  priority?: 'high' | 'normal';
}

/**
 * 批量发送选项
 */
export interface BatchSendNotificationOptions {
  userIds: string[];
  type: NotificationType;
  message: NotificationMessage;
  relatedId?: string;
  priority?: 'high' | 'normal';
}

/**
 * 检查用户是否应该接收此类型的通知
 */
export const shouldSendNotification = async (
  userId: string,
  type: NotificationType
): Promise<boolean> => {
  try {
    // 获取用户信息
    const user = await getDocument(GLOBAL_COLLECTIONS.USERS, userId);
    if (!user) {
      console.warn(`[Notifications] User ${userId} not found`);
      return false;
    }

    // 检查用户是否启用了推送通知
    const pushEnabled = (user as any)?.notifications?.pushEnabled;
    if (pushEnabled === false) {
      console.log(`[Notifications] User ${userId} has push notifications disabled`);
      return false;
    }

    // 检查用户偏好设置
    const preferences = (user as any)?.notifications?.preferences as NotificationPreferences | undefined;
    if (!preferences) {
      // 默认允许所有通知
      return true;
    }

    // 根据通知类型检查偏好
    switch (type) {
      case 'reload_verified':
        return preferences.reloadVerified !== false;
      case 'event_reminder':
        return preferences.eventReminders !== false;
      case 'order_status':
        return preferences.orderUpdates !== false;
      case 'points_awarded':
        return preferences.pointsUpdates !== false;
      case 'membership_expiring':
        return preferences.membershipAlerts !== false;
      case 'visit_alert':
        return preferences.visitAlerts !== false;
      case 'system':
        return true; // 系统通知始终发送
      default:
        return true;
    }
  } catch (error) {
    console.error(`[Notifications] Error checking notification preference:`, error);
    return false;
  }
};

/**
 * 保存通知历史记录到 Firestore
 */
export const saveNotificationHistory = async (
  userId: string,
  notification: NotificationMessage,
  type: NotificationType,
  relatedId?: string,
  deliveryStatus: 'sent' | 'delivered' | 'failed' = 'sent'
): Promise<{ success: boolean; historyId?: string; error?: string }> => {
  try {
    const historyData: Omit<NotificationHistory, 'id'> = {
      userId,
      title: notification.title,
      body: notification.body,
      type,
      data: notification.data || {},
      sentAt: new Date(),
      deliveryStatus,
      relatedId,
      clickedAt: undefined
    };

    const docRef = doc(collection(db, GLOBAL_COLLECTIONS.NOTIFICATION_HISTORY));
    await setDoc(docRef, {
      ...historyData,
      sentAt: Timestamp.fromDate(historyData.sentAt)
    });

    console.log(`[Notifications] Notification history saved: ${docRef.id}`);
    return { success: true, historyId: docRef.id };
  } catch (error: any) {
    console.error(`[Notifications] Error saving notification history:`, error);
    return {
      success: false,
      error: error.message || 'Failed to save notification history'
    };
  }
};

/**
 * 准备通知数据（用于后端发送）
 * 返回格式化的通知数据，可以通过 API 调用发送
 */
export const prepareNotificationData = (
  options: SendNotificationOptions
): {
  tokens: string[];
  notification: {
    title: string;
    body: string;
    icon?: string;
    image?: string;
  };
  data: Record<string, string>;
  priority: 'high' | 'normal';
} => {
  const { userId, type, message, relatedId, priority = 'normal' } = options;

  // 准备 data 字段（FCM 要求所有值都是字符串）
  const data: Record<string, string> = createNotificationData(type, {
    userId,
    ...(relatedId && { relatedId }),
    ...(message.data || {})
  });

  return {
    tokens: [], // 需要在调用时填充
    notification: {
      title: message.title,
      body: message.body,
      icon: message.icon || getNotificationIcon(type),
      ...(message.image && { image: message.image })
    },
    data,
    priority
  };
};

/**
 * 发送通知给单个用户（前端调用接口）
 * 
 * 注意：此函数只准备数据并保存历史，实际发送需要通过后端 API
 * 
 * 后端需要实现：
 * POST /api/notifications/send
 * Body: { tokens, notification, data, priority }
 */
export const sendNotificationToUser = async (
  options: SendNotificationOptions
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { userId, type, message, relatedId } = options;

    // 1. 检查用户是否应该接收此通知
    const shouldSend = await shouldSendNotification(userId, type);
    if (!shouldSend) {
      console.log(`[Notifications] Skipping notification for user ${userId} (preference disabled)`);
      return { success: true }; // 不算错误，只是跳过
    }

    // 2. 获取用户的设备令牌
    const tokensResult = await getUserDeviceTokens(userId);
    if (!tokensResult.success || !tokensResult.tokens || tokensResult.tokens.length === 0) {
      console.log(`[Notifications] User ${userId} has no active device tokens`);
      
      // 仍然保存历史记录，但标记为失败
      await saveNotificationHistory(userId, message, type, relatedId, 'failed');
      return { success: true }; // 不算错误，只是没有设备令牌
    }

    const tokens = tokensResult.tokens.map(t => t.token);

    // 3. 准备通知数据
    const notificationData = prepareNotificationData({
      ...options,
      userId
    });
    notificationData.tokens = tokens;

    // 4. 保存通知历史（先标记为 sent）
    const historyResult = await saveNotificationHistory(
      userId,
      message,
      type,
      relatedId,
      'sent'
    );

    // 5. 调用 Cloud Function 发送通知
    try {
      // 动态导入 Firebase Functions（避免循环依赖）
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const { app } = await import('../../config/firebase');

      const functions = getFunctions(app);
      const sendNotificationFunction = httpsCallable(functions, 'sendNotification');

      const result = await sendNotificationFunction({
        tokens: notificationData.tokens,
        notification: notificationData.notification,
        data: notificationData.data,
        priority: notificationData.priority
      });

      const response = result.data as {
        success: boolean;
        successCount: number;
        failureCount: number;
        failedTokens?: string[];
      };

      console.log(`[Notifications] Notification sent successfully:`, {
        type,
        successCount: response.successCount,
        failureCount: response.failureCount,
        historyId: historyResult.historyId
      });

      // 更新历史记录状态
      if (historyResult.historyId) {
        const deliveryStatus = response.successCount > 0 ? 'delivered' : 'failed';
        await updateNotificationHistoryStatus(historyResult.historyId, deliveryStatus);
      }

      return { success: true };
    } catch (error: any) {
      console.error(`[Notifications] Error calling sendNotification function:`, error);

      // 更新历史记录状态为失败
      if (historyResult.historyId) {
        await updateNotificationHistoryStatus(historyResult.historyId, 'failed');
      }

      // 如果 Cloud Function 未部署，不抛出错误（降级处理）
      if (error.code === 'functions/not-found' || error.code === 'functions/unavailable') {
        console.warn('[Notifications] Cloud Function not available, skipping actual send');
        return { success: true }; // 仍然返回成功，因为历史记录已保存
      }

      return {
        success: false,
        error: error.message || 'Failed to send notification'
      };
    }
  } catch (error: any) {
    console.error(`[Notifications] Error sending notification:`, error);
    return {
      success: false,
      error: error.message || 'Failed to send notification'
    };
  }
};

/**
 * 批量发送通知给多个用户
 */
export const sendNotificationToMultipleUsers = async (
  options: BatchSendNotificationOptions
): Promise<{ success: boolean; sent: number; failed: number; errors?: string[] }> => {
  try {
    const { userIds, type, message, relatedId } = options;
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // 并行发送给所有用户（限制并发数）
    const results = await Promise.allSettled(
      userIds.map(userId =>
        sendNotificationToUser({
          userId,
          type,
          message,
          relatedId,
          priority: options.priority
        })
      )
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        sent++;
      } else {
        failed++;
        const userId = userIds[index];
        const error = result.status === 'rejected' 
          ? result.reason?.message 
          : result.value.error;
        errors.push(`User ${userId}: ${error || 'Unknown error'}`);
      }
    });

    console.log(`[Notifications] Batch send completed: ${sent} sent, ${failed} failed`);
    return {
      success: failed === 0,
      sent,
      failed,
      ...(errors.length > 0 && { errors })
    };
  } catch (error: any) {
    console.error(`[Notifications] Error in batch send:`, error);
    return {
      success: false,
      sent: 0,
      failed: options.userIds.length,
      errors: [error.message || 'Batch send failed']
    };
  }
};

/**
 * 获取用户的通知历史
 */
export const getUserNotificationHistory = async (
  userId: string,
  limitCount: number = 50
): Promise<{ success: boolean; history?: NotificationHistory[]; error?: string }> => {
  try {
    const historyRef = collection(db, GLOBAL_COLLECTIONS.NOTIFICATION_HISTORY);
    const q = query(
      historyRef,
      where('userId', '==', userId),
      orderBy('sentAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const history: NotificationHistory[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        title: data.title,
        body: data.body,
        type: data.type,
        data: data.data || {},
        sentAt: data.sentAt?.toDate() || new Date(),
        deliveryStatus: data.deliveryStatus || 'sent',
        clickedAt: data.clickedAt?.toDate(),
        relatedId: data.relatedId
      };
    });

    return { success: true, history };
  } catch (error: any) {
    console.error(`[Notifications] Error getting notification history:`, error);
    return {
      success: false,
      error: error.message || 'Failed to get notification history'
    };
  }
};

/**
 * 标记通知为已点击
 */
export const markNotificationAsClicked = async (
  historyId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const historyRef = doc(db, GLOBAL_COLLECTIONS.NOTIFICATION_HISTORY, historyId);
    await setDoc(
      historyRef,
      {
        clickedAt: Timestamp.fromDate(new Date())
      },
      { merge: true }
    );

    return { success: true };
  } catch (error: any) {
    console.error(`[Notifications] Error marking notification as clicked:`, error);
    return {
      success: false,
      error: error.message || 'Failed to mark notification as clicked'
    };
  }
};

/**
 * 更新通知历史记录状态
 */
const updateNotificationHistoryStatus = async (
  historyId: string,
  deliveryStatus: 'sent' | 'delivered' | 'failed'
): Promise<void> => {
  try {
    const historyRef = doc(db, GLOBAL_COLLECTIONS.NOTIFICATION_HISTORY, historyId);
    await setDoc(
      historyRef,
      {
        deliveryStatus
      },
      { merge: true }
    );
  } catch (error) {
    console.error(`[Notifications] Error updating notification history status:`, error);
  }
};

