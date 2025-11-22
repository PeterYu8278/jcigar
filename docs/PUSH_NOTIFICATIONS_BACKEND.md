# 推送通知后端集成指南

本文档说明如何实现推送通知的实际发送功能。

---

## 📋 当前状态

### ✅ 已完成（前端）

1. **通知接收和显示**
   - ✅ Firebase Messaging 初始化
   - ✅ Service Worker 配置
   - ✅ 前台消息监听
   - ✅ 后台消息处理
   - ✅ 通知权限管理
   - ✅ 设备令牌管理
   - ✅ 通知历史记录保存

2. **通知服务（前端）**
   - ✅ `src/services/firebase/notifications.ts`
   - ✅ 通知数据准备
   - ✅ 用户偏好检查
   - ✅ 通知历史记录保存
   - ✅ 业务触发点集成（充值验证）

3. **业务集成**
   - ✅ 充值验证成功后调用通知发送

### ⚠️ 待实现（后端）

- ❌ 实际推送通知发送（需要服务器端代码）
- ❌ 定时任务（活动提醒、会员到期等）
- ❌ 批量发送优化

---

## 🚀 实现方案

### 方案 1: Firebase Cloud Functions（推荐）

使用 Firebase Cloud Functions 在服务器端发送推送通知。

#### 步骤 1: 初始化 Cloud Functions 项目

```bash
# 在项目根目录下创建 functions 目录
mkdir functions
cd functions

# 初始化 Firebase Functions
firebase init functions

# 选择 TypeScript
# 选择 ESLint（可选）
# 安装依赖
npm install
```

#### 步骤 2: 安装依赖

```bash
cd functions
npm install firebase-admin
npm install firebase-functions
```

#### 步骤 3: 创建通知发送函数

创建 `functions/src/notifications.ts`:

```typescript
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

admin.initializeApp();

/**
 * 发送推送通知（HTTP 触发器）
 * 前端可以调用此函数发送通知
 */
export const sendNotification = functions.https.onCall(async (data, context) => {
  // 验证用户已登录
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const { tokens, notification, data: notificationData, priority } = data;

  if (!tokens || tokens.length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Tokens array is required and cannot be empty'
    );
  }

  try {
    // 发送推送通知
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.icon && { imageUrl: notification.icon }),
        ...(notification.image && { imageUrl: notification.image })
      },
      data: notificationData || {},
      apns: {
        headers: {
          'apns-priority': priority === 'high' ? '10' : '5'
        }
      },
      android: {
        priority: priority === 'high' ? 'high' : 'normal' as 'high' | 'normal'
      },
      webpush: {
        notification: {
          ...notification,
          requireInteraction: priority === 'high'
        }
      }
    };

    const response = await admin.messaging().sendMulticast(message);

    // 处理失败的令牌
    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        failedTokens.push(tokens[idx]);
        console.error(`Failed to send notification to token ${tokens[idx]}:`, resp.error);
      }
    });

    // 标记失效的令牌
    if (failedTokens.length > 0) {
      const batch = admin.firestore().batch();
      failedTokens.forEach(token => {
        const tokenQuery = admin.firestore()
          .collection('deviceTokens')
          .where('token', '==', token);
        
        tokenQuery.get().then(snapshot => {
          snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isActive: false });
          });
        });
      });
      await batch.commit();
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens
    };
  } catch (error: any) {
    console.error('Error sending notification:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send notification',
      error
    );
  }
});

/**
 * 充值验证后自动发送通知（Firestore 触发器）
 */
export const onReloadVerified = functions.firestore
  .document('reloadRecords/{recordId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    // 检查状态是否从 pending 变为 completed
    if (oldData.status === 'pending' && newData.status === 'completed') {
      const userId = newData.userId;
      const recordId = context.params.recordId;

      // 获取用户信息
      const userDoc = await admin.firestore().doc(`users/${userId}`).get();
      if (!userDoc.exists) {
        console.error(`User ${userId} not found`);
        return;
      }

      const userData = userDoc.data();
      
      // 检查用户是否启用了推送通知
      const pushEnabled = userData?.notifications?.pushEnabled;
      if (pushEnabled === false) {
        console.log(`User ${userId} has push notifications disabled`);
        return;
      }

      // 检查用户偏好
      const preferences = userData?.notifications?.preferences;
      if (preferences?.reloadVerified === false) {
        console.log(`User ${userId} has reload verification notifications disabled`);
        return;
      }

      // 获取用户的设备令牌
      const tokensSnapshot = await admin.firestore()
        .collection('deviceTokens')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      if (tokensSnapshot.empty) {
        console.log(`User ${userId} has no active device tokens`);
        return;
      }

      const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

      // 准备通知数据
      const requestedAmount = newData.requestedAmount || 0;
      const pointsEquivalent = newData.pointsEquivalent || 0;

      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: '💰 充值成功',
          body: `您的充值 ${requestedAmount} RM (${pointsEquivalent} 积分) 已到账`,
          icon: '/icons/money-bag.png'
        },
        data: {
          type: 'reload_verified',
          recordId,
          userId,
          url: '/profile'
        },
        apns: {
          headers: {
            'apns-priority': '10'
          }
        },
        android: {
          priority: 'high'
        },
        webpush: {
          notification: {
            requireInteraction: true
          }
        }
      };

      try {
        const response = await admin.messaging().sendMulticast(message);
        console.log(`Sent reload notification: ${response.successCount} successful, ${response.failureCount} failed`);
      } catch (error: any) {
        console.error('Error sending reload notification:', error);
      }
    }
  });

/**
 * 活动提醒（定时任务）
 * 每天检查即将开始的活动并发送提醒
 */
export const sendEventReminders = functions.pubsub
  .schedule('0 9 * * *') // 每天上午 9 点
  .timeZone('Asia/Kuala_Lumpur')
  .onRun(async (context) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 查询明天开始的活动
    const eventsSnapshot = await admin.firestore()
      .collection('events')
      .where('status', '==', 'published')
      .where('startDate', '>=', now)
      .where('startDate', '<=', tomorrow)
      .get();

    if (eventsSnapshot.empty) {
      console.log('No events starting tomorrow');
      return;
    }

    // 对每个活动发送提醒给报名用户
    for (const eventDoc of eventsSnapshot.docs) {
      const eventData = eventDoc.data();
      const eventId = eventDoc.id;

      // 获取活动参与者
      const participants = eventData.participants || [];
      
      for (const userId of participants) {
        // 获取用户信息和设备令牌
        const userDoc = await admin.firestore().doc(`users/${userId}`).get();
        if (!userDoc.exists) continue;

        const userData = userDoc.data();
        
        // 检查用户偏好
        if (userData?.notifications?.preferences?.eventReminders === false) {
          continue;
        }

        // 获取设备令牌
        const tokensSnapshot = await admin.firestore()
          .collection('deviceTokens')
          .where('userId', '==', userId)
          .where('isActive', '==', true)
          .get();

        if (tokensSnapshot.empty) continue;

        const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

        const message: admin.messaging.MulticastMessage = {
          tokens,
          notification: {
            title: '🎉 活动提醒',
            body: `${eventData.title} 将于明天开始`,
            icon: '/icons/event.png'
          },
          data: {
            type: 'event_reminder',
            eventId,
            url: `/events/${eventId}`
          }
        };

        try {
          await admin.messaging().sendMulticast(message);
        } catch (error) {
          console.error(`Error sending event reminder to user ${userId}:`, error);
        }
      }
    }

    console.log(`Sent event reminders for ${eventsSnapshot.size} events`);
  });
```

#### 步骤 4: 部署 Cloud Functions

```bash
# 部署所有函数
firebase deploy --only functions

# 或部署特定函数
firebase deploy --only functions:sendNotification
firebase deploy --only functions:onReloadVerified
firebase deploy --only functions:sendEventReminders
```

#### 步骤 5: 更新前端调用

更新 `src/services/firebase/notifications.ts` 中的 `sendNotificationToUser` 函数：

```typescript
// 在文件顶部添加
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/config/firebase';

// 在 sendNotificationToUser 函数中，替换 TODO 部分：

// 5. 调用 Cloud Function 发送通知
const functions = getFunctions(app);
const sendNotificationFunction = httpsCallable(functions, 'sendNotification');

try {
  const result = await sendNotificationFunction({
    tokens: notificationData.tokens,
    notification: notificationData.notification,
    data: notificationData.data,
    priority: notificationData.priority
  });

  console.log(`[Notifications] Notification sent:`, result.data);
  
  // 更新历史记录状态
  if (historyResult.historyId) {
    await updateNotificationHistoryStatus(
      historyResult.historyId,
      result.data.successCount > 0 ? 'delivered' : 'failed'
    );
  }
} catch (error: any) {
  console.error(`[Notifications] Error calling sendNotification function:`, error);
  
  // 更新历史记录状态为失败
  if (historyResult.historyId) {
    await updateNotificationHistoryStatus(historyResult.historyId, 'failed');
  }
  
  throw error;
}
```

---

### 方案 2: 独立后端服务

如果您有独立的 Node.js 后端服务，可以使用 Firebase Admin SDK 发送通知。

#### 步骤 1: 安装依赖

```bash
npm install firebase-admin express cors
```

#### 步骤 2: 创建后端 API

```typescript
// backend/src/routes/notifications.ts
import express from 'express';
import admin from 'firebase-admin';

const router = express.Router();

// 发送推送通知
router.post('/send', async (req, res) => {
  try {
    const { tokens, notification, data, priority } = req.body;

    if (!tokens || tokens.length === 0) {
      return res.status(400).json({ error: 'Tokens array is required' });
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.icon && { imageUrl: notification.icon })
      },
      data: data || {},
      android: {
        priority: priority === 'high' ? 'high' : 'normal'
      },
      webpush: {
        notification: {
          requireInteraction: priority === 'high'
        }
      }
    };

    const response = await admin.messaging().sendMulticast(message);

    res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

#### 步骤 3: 更新前端调用

```typescript
// 在 notifications.ts 中
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const sendNotificationToUser = async (options: SendNotificationOptions) => {
  // ... 前面的代码 ...

  // 调用后端 API
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}` // 如果有认证
      },
      body: JSON.stringify(notificationData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[Notifications] Notification sent:`, result);
  } catch (error: any) {
    console.error(`[Notifications] Error sending notification:`, error);
    throw error;
  }
};
```

---

## 📝 测试

### 测试推送通知

1. **使用 Firebase Console**
   - 进入 Firebase Console → Cloud Messaging
   - 点击 "Send test message"
   - 输入 FCM 令牌（从浏览器控制台获取）
   - 填写通知内容
   - 点击 "Test"

2. **使用前端测试**
   - 访问个人中心 → 通知设置
   - 点击 "发送测试通知"
   - 应该收到推送通知

3. **测试业务触发**
   - 创建一个充值记录
   - 验证充值记录
   - 应该自动收到推送通知

---

## 🔧 配置检查清单

- [ ] Firebase Admin SDK 已初始化
- [ ] Cloud Functions 已部署（如使用方案 1）
- [ ] 后端 API 已配置（如使用方案 2）
- [ ] 前端已更新调用后端 API/Cloud Functions
- [ ] 通知历史记录正常保存
- [ ] 设备令牌管理正常
- [ ] 用户偏好设置生效

---

## 📚 相关文档

- [Firebase Cloud Messaging 文档](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin SDK 文档](https://firebase.google.com/docs/admin/setup)
- [Firebase Cloud Functions 文档](https://firebase.google.com/docs/functions)
- [PUSH_NOTIFICATIONS_SETUP.md](../PUSH_NOTIFICATIONS_SETUP.md) - 前端配置指南

