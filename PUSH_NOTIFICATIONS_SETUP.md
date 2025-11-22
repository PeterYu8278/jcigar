# 推送通知配置指南

本指南将帮助您在 Cigar App 中配置 Firebase Cloud Messaging (FCM) 推送通知功能。

---

## 📋 前提条件

- ✅ Firebase 项目已创建
- ✅ 已在 Firebase Console 中启用 Cloud Messaging
- ✅ 应用已部署到 HTTPS 域名（推送通知要求 HTTPS）

---

## 🔧 配置步骤

### 步骤 1: 获取 VAPID 密钥

1. 登录 [Firebase Console](https://console.firebase.google.com)
2. 选择您的项目：**jcigar-c0e54**
3. 点击左侧菜单的 **⚙️ Project Settings**（项目设置）
4. 选择 **Cloud Messaging** 标签
5. 滚动到 **Web configuration** 部分
6. 找到 **Web Push certificates**
7. 点击 **Generate key pair** 按钮（如果还没有生成）
8. 复制生成的 **Key pair** 值（这是您的 VAPID 公钥）

### 步骤 2: 配置环境变量

在项目根目录的 `.env` 文件中添加以下配置：

```bash
# Firebase Cloud Messaging (Push Notifications)
VITE_FIREBASE_VAPID_KEY=your_vapid_public_key_here
```

**示例**:
```bash
VITE_FIREBASE_VAPID_KEY=BKxYz1234abcd...（替换为您的实际密钥）
```

### 步骤 3: 验证配置

1. 重启开发服务器：
   ```bash
   npm run dev
   ```

2. 打开浏览器控制台（F12）
3. 查看是否有以下日志：
   - `[FCM] Firebase Messaging initialized successfully`
   - 如果出现错误，检查 VAPID 密钥是否正确配置

---

## 🧪 测试推送通知

### 前端测试（用户权限）

1. **访问个人中心页面** (`/profile`)
2. **查看通知设置卡片**
   - 应该看到"推送通知"设置面板
   - 如果浏览器支持，会显示权限状态
3. **启用推送通知**
   - 点击"启用推送通知"开关
   - 浏览器会弹出权限请求
   - 点击"允许"
4. **检查控制台**
   - 应该看到 `[FCM] FCM token obtained:` 日志
   - 令牌已保存到 Firestore `deviceTokens` 集合

### 后台测试（发送通知）

#### 方法 1: 使用 Firebase Console

1. 进入 Firebase Console → **Cloud Messaging**
2. 点击 **Send your first message**
3. 填写通知内容：
   - **Title**: 测试通知
   - **Text**: 这是一条测试推送消息
4. 点击 **Send test message**
5. 粘贴您的 FCM 令牌（从浏览器控制台复制）
6. 点击 **Test**

#### 方法 2: 使用 Postman 或 cURL

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: Bearer YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "USER_FCM_TOKEN",
    "notification": {
      "title": "测试通知",
      "body": "这是一条测试推送消息",
      "icon": "/icons/icon-192x192.png"
    },
    "data": {
      "type": "system",
      "url": "/"
    }
  }'
```

**注意**: 将 `YOUR_SERVER_KEY` 替换为 Firebase Console → Cloud Messaging → **Server key**

---

## 📱 支持的浏览器和平台

| 浏览器/平台 | 支持状态 | 说明 |
|-------------|----------|------|
| **Chrome (Desktop)** | ✅ 完全支持 | Windows, macOS, Linux |
| **Edge (Desktop)** | ✅ 完全支持 | Chromium 内核 |
| **Firefox (Desktop)** | ✅ 完全支持 | 所有平台 |
| **Safari (macOS 16.4+)** | ✅ 完全支持 | 需要 macOS Big Sur 或更高版本 |
| **Chrome (Android)** | ✅ 完全支持 | 原生浏览器和 PWA |
| **Safari (iOS 16.4+)** | ⚠️ 部分支持 | **仅限 PWA**（需添加到主屏幕） |
| **Safari (iOS < 16.4)** | ❌ 不支持 | 建议升级系统 |

### iOS 用户特别说明

iOS 用户需要将应用**添加到主屏幕**才能接收推送通知：

1. 在 Safari 中打开应用
2. 点击底部的"分享"按钮
3. 选择"添加到主屏幕"
4. 打开添加到主屏幕的应用图标
5. 在应用内启用推送通知

---

## 🗂️ Firestore 数据结构

### deviceTokens 集合

存储用户的设备令牌：

```typescript
{
  id: string,              // 文档 ID
  userId: string,          // 用户 ID
  token: string,           // FCM 令牌
  deviceInfo: {
    browser: "Chrome",
    os: "Windows",
    deviceType: "desktop"
  },
  createdAt: Timestamp,
  lastUsedAt: Timestamp,
  isActive: boolean
}
```

### users 集合（新增字段）

```typescript
{
  // ... 现有字段
  notifications: {
    pushEnabled: boolean,
    preferences: {
      reloadVerified: boolean,
      eventReminders: boolean,
      orderUpdates: boolean,
      pointsUpdates: boolean,
      membershipAlerts: boolean,
      visitAlerts: boolean
    },
    deviceTokens: string[]  // FCM 令牌数组
  }
}
```

---

## 🔒 安全规则

确保 `firestore.rules` 包含以下规则：

```javascript
// 设备令牌：只能读写自己的
match /deviceTokens/{tokenId} {
  allow read: if request.auth != null 
              && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null 
                && request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null 
                        && resource.data.userId == request.auth.uid;
}
```

---

## 🚀 后续步骤（可选）

### 1. 实现 Cloud Functions 自动触发

创建 Firebase Cloud Functions 来自动发送通知：

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// 充值验证后自动发送通知
export const onReloadVerified = functions.firestore
  .document('reloadRecords/{recordId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    
    // 检查状态是否从 pending 变为 completed
    if (oldData.status === 'pending' && newData.status === 'completed') {
      const userId = newData.userId;
      const amount = newData.amount;
      
      // 获取用户的设备令牌
      const userDoc = await admin.firestore().doc(`users/${userId}`).get();
      const tokens = userDoc.data()?.notifications?.deviceTokens || [];
      
      if (tokens.length > 0) {
        // 发送推送通知
        await admin.messaging().sendMulticast({
          tokens,
          notification: {
            title: '💰 充值成功',
            body: `您的充值 MYR ${amount} 已到账`
          },
          data: {
            type: 'reload_verified',
            reloadId: context.params.recordId,
            url: '/profile'
          }
        });
      }
    }
  });
```

### 2. 定期清理失效令牌

创建定时任务清理无效的设备令牌：

```typescript
// 每天运行一次
export const cleanupInactiveTokens = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('Asia/Kuala_Lumpur')
  .onRun(async (context) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30天未使用
    
    const tokensSnapshot = await admin.firestore()
      .collection('deviceTokens')
      .where('lastUsedAt', '<', cutoffDate)
      .get();
    
    const batch = admin.firestore().batch();
    tokensSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Cleaned up ${tokensSnapshot.size} inactive tokens`);
  });
```

---

## 🐛 常见问题

### Q1: 权限被拒绝后如何重新启用？

**A**: 用户需要手动在浏览器设置中启用：

**Chrome/Edge**:
1. 点击地址栏左侧的锁图标
2. 点击"网站设置"
3. 找到"通知"权限
4. 选择"允许"

**Firefox**:
1. 点击地址栏左侧的信息图标
2. 点击"权限"
3. 找到"接收通知"
4. 取消勾选"使用默认设置"
5. 选择"允许"

### Q2: 为什么收不到通知？

检查以下项：

1. ✅ VAPID 密钥配置正确
2. ✅ 浏览器通知权限已授予
3. ✅ Service Worker 正确注册（检查 Chrome DevTools → Application → Service Workers）
4. ✅ 用户已登录并有有效的 FCM 令牌
5. ✅ Firestore 规则允许读写 deviceTokens
6. ✅ 网站通过 HTTPS 访问

### Q3: iOS Safari 收不到通知？

**原因**: iOS Safari 只在 PWA 模式（添加到主屏幕）下支持推送通知。

**解决方案**:
1. 在应用中添加引导，告知 iOS 用户需要"添加到主屏幕"
2. 提供图文教程
3. 或者使用替代方案（应用内通知中心）

### Q4: Service Worker 冲突？

如果您使用了其他 Service Worker 框架（如 Workbox），可能需要合并配置。

**解决方案**: 修改 `vite.config.ts`：

```typescript
VitePWA({
  strategies: 'injectManifest', // 使用自定义 SW
  srcDir: 'src',
  filename: 'custom-sw.ts', // 自定义 SW 文件
  // ... 其他配置
})
```

---

## 📊 监控和分析

### Firebase Console 监控

1. Firebase Console → **Cloud Messaging** → **Reports**
2. 查看以下指标：
   - 发送成功率
   - 打开率
   - 错误率
   - 设备类型分布

### 自定义日志

在应用中添加分析：

```typescript
// 记录通知点击事件
self.addEventListener('notificationclick', (event) => {
  // 发送到 Google Analytics
  analytics.logEvent('notification_clicked', {
    type: event.notification.data.type,
    timestamp: new Date().toISOString()
  });
});
```

---

## 📚 相关资源

- [Firebase Cloud Messaging 文档](https://firebase.google.com/docs/cloud-messaging)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

---

## ✅ 配置完成检查清单

- [ ] VAPID 密钥已配置在 `.env` 文件
- [ ] 应用可以正常启动，无控制台错误
- [ ] 个人中心页面显示通知设置
- [ ] 可以请求通知权限
- [ ] 可以获取 FCM 令牌
- [ ] 令牌已保存到 Firestore
- [ ] 可以从 Firebase Console 发送测试通知
- [ ] 应用在前台和后台都能收到通知
- [ ] 点击通知可以跳转到对应页面

---

如有任何问题，请联系开发团队！🚀

