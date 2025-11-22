/**
 * 通知工具函数
 * 提供通知相关的辅助功能
 */

import { NotificationType } from '@/types';

/**
 * 获取通知类型的图标
 */
export const getNotificationIcon = (type: NotificationType): string => {
  const iconMap: Record<NotificationType, string> = {
    reload_verified: '/icons/money-bag.png',
    event_reminder: '/icons/event.png',
    order_status: '/icons/package.png',
    membership_expiring: '/icons/vip.png',
    points_awarded: '/icons/points.png',
    visit_alert: '/icons/clock.png',
    system: '/icons/bell.png'
  };

  return iconMap[type] || '/icons/bell.png';
};

/**
 * 获取通知类型的颜色
 */
export const getNotificationColor = (type: NotificationType): string => {
  const colorMap: Record<NotificationType, string> = {
    reload_verified: '#52c41a',    // 绿色
    event_reminder: '#1890ff',     // 蓝色
    order_status: '#722ed1',       // 紫色
    membership_expiring: '#faad14', // 橙色
    points_awarded: '#C48D3A',     // 金色
    visit_alert: '#13c2c2',        // 青色
    system: '#8c8c8c'              // 灰色
  };

  return colorMap[type] || '#1890ff';
};

/**
 * 播放通知提示音
 */
export const playNotificationSound = (): void => {
  try {
    // 创建音频上下文
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 设置音频参数
    oscillator.frequency.value = 800; // 频率 800Hz
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3; // 音量 30%

    // 播放短促的提示音
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1); // 100ms
  } catch (error) {
    console.warn('[Notification] Failed to play notification sound:', error);
  }
};

/**
 * 检查是否应该显示通知（基于用户偏好和通知频率限制）
 */
export const shouldShowNotification = (
  type: NotificationType,
  preferences: Record<string, boolean>
): boolean => {
  const preferenceMap: Record<NotificationType, string> = {
    reload_verified: 'reloadVerified',
    event_reminder: 'eventReminders',
    order_status: 'orderUpdates',
    membership_expiring: 'membershipAlerts',
    points_awarded: 'pointsUpdates',
    visit_alert: 'visitAlerts',
    system: 'system' // 系统通知始终显示
  };

  const preferenceKey = preferenceMap[type];
  if (preferenceKey === 'system') {
    return true; // 系统通知始终显示
  }

  return preferences[preferenceKey] !== false; // 默认为 true
};

/**
 * 格式化通知时间（相对时间）
 */
export const formatNotificationTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    });
  }
};

/**
 * 创建通知数据对象
 */
export const createNotificationData = (
  type: NotificationType,
  data: Record<string, any>
): Record<string, string> => {
  // Firebase 要求所有 data 字段都是字符串
  const result: Record<string, string> = {
    type,
    timestamp: new Date().toISOString()
  };

  // 转换所有数据为字符串
  Object.keys(data).forEach(key => {
    result[key] = String(data[key]);
  });

  return result;
};

/**
 * 获取通知跳转 URL
 */
export const getNotificationURL = (
  type: NotificationType,
  data?: Record<string, any>
): string => {
  switch (type) {
    case 'reload_verified':
      return '/profile'; // 跳转到个人中心查看积分
    
    case 'event_reminder':
      return data?.eventId ? `/events/${data.eventId}` : '/events';
    
    case 'order_status':
      return data?.orderId ? `/orders/${data.orderId}` : '/orders';
    
    case 'membership_expiring':
      return '/reload'; // 跳转到充值页面
    
    case 'points_awarded':
      return '/profile'; // 跳转到个人中心查看积分
    
    case 'visit_alert':
      return '/'; // 跳转到首页（驻店模块）
    
    case 'system':
    default:
      return '/';
  }
};

/**
 * 检查通知权限并提供友好的提示
 */
export const getPermissionStatusMessage = (permission: NotificationPermission): {
  message: string;
  canRequest: boolean;
  instruction?: string;
} => {
  switch (permission) {
    case 'granted':
      return {
        message: '通知权限已启用',
        canRequest: false
      };
    
    case 'denied':
      return {
        message: '通知权限已被拒绝',
        canRequest: false,
        instruction: '请在浏览器设置中手动启用通知权限'
      };
    
    case 'default':
    default:
      return {
        message: '尚未授予通知权限',
        canRequest: true,
        instruction: '点击按钮请求通知权限'
      };
  }
};

