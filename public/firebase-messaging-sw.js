/**
 * Firebase Cloud Messaging Service Worker
 * 用于处理后台推送通知
 */

// 导入 Firebase SDK (使用 CDN)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase 配置 (需要与主应用配置一致)
// 注意：这些配置来自 Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBkYXhf0RuwI7mGmxPmh-2KxJM1Qs-5MO8",
  authDomain: "jcigar-c0e54.firebaseapp.com",
  projectId: "jcigar-c0e54",
  storageBucket: "jcigar-c0e54.firebasestorage.app",
  messagingSenderId: "764964045542",
  appId: "1:764964045542:web:78ad5b9c0766e1e7cf5fff",
  measurementId: "G-PMFYQKZWLX"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 获取 Firebase Messaging 实例
const messaging = firebase.messaging();

// 监听后台消息（当应用不在前台时）
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Gentleman Club';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: payload.data?.type || 'default',
    data: payload.data || {},
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'view',
        title: '查看详情'
      },
      {
        action: 'close',
        title: '关闭'
      }
    ]
  };

  // 显示通知
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 监听通知点击事件
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);

  event.notification.close();

  const clickAction = event.action;
  const notificationData = event.notification.data;

  if (clickAction === 'close') {
    // 用户点击关闭按钮，不做任何操作
    return;
  }

  // 获取跳转 URL
  let urlToOpen = '/';
  
  if (notificationData) {
    const type = notificationData.type;
    
    switch (type) {
      case 'reload_verified':
        urlToOpen = '/profile';
        break;
      case 'event_reminder':
        urlToOpen = notificationData.eventId 
          ? `/events/${notificationData.eventId}` 
          : '/events';
        break;
      case 'order_status':
        urlToOpen = notificationData.orderId 
          ? `/orders/${notificationData.orderId}` 
          : '/orders';
        break;
      case 'membership_expiring':
        urlToOpen = '/reload';
        break;
      case 'points_awarded':
        urlToOpen = '/profile';
        break;
      case 'visit_alert':
        urlToOpen = '/';
        break;
      default:
        urlToOpen = notificationData.url || '/';
    }
  }

  // 打开或聚焦应用窗口
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 检查是否已有打开的窗口
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // 导航到目标页面
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            url: urlToOpen,
            data: notificationData
          });
          return client.focus();
        }
      }
      
      // 如果没有打开的窗口，打开新窗口
      if (clients.openWindow) {
        return clients.openWindow(self.location.origin + urlToOpen);
      }
    })
  );
});

// 监听推送订阅变化
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[firebase-messaging-sw.js] Push subscription changed');
  
  event.waitUntil(
    // 可以在这里处理订阅变化，例如更新服务器上的令牌
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        console.log('[firebase-messaging-sw.js] New subscription:', subscription);
      })
  );
});

// Service Worker 安装事件
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installing...');
  self.skipWaiting();
});

// Service Worker 激活事件
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activated');
  event.waitUntil(clients.claim());
});

