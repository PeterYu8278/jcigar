# Firebase Cloud Functions

本目录包含 Firebase Cloud Functions，用于处理推送通知发送和其他后端任务。

## 📋 功能

### 1. `sendNotification` - HTTP Callable 函数

发送推送通知给指定设备令牌。

**调用方式（前端）：**
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/config/firebase';

const functions = getFunctions(app);
const sendNotification = httpsCallable(functions, 'sendNotification');

const result = await sendNotification({
  tokens: ['token1', 'token2'],
  notification: {
    title: '测试通知',
    body: '这是一条测试消息'
  },
  data: {
    type: 'system',
    url: '/'
  },
  priority: 'normal'
});
```

### 2. `onReloadVerified` - Firestore 触发器

当充值记录状态从 `pending` 变为 `completed` 时，自动发送充值成功通知。

**触发条件：**
- `reloadRecords/{recordId}` 文档更新
- 状态从 `pending` 变为 `completed`

**自动操作：**
- 检查用户通知偏好
- 获取用户设备令牌
- 发送充值成功通知

### 3. `sendEventReminders` - 定时任务

每天上午 9 点（Asia/Kuala_Lumpur 时区）检查即将开始的活动，并发送提醒给报名用户。

**运行时间：** 每天 09:00 (Asia/Kuala_Lumpur)

**功能：**
- 查询明天开始的活动
- 获取活动参与者
- 检查用户通知偏好
- 发送活动提醒通知

---

## 🚀 部署

### 前提条件

1. **安装 Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **登录 Firebase**
   ```bash
   firebase login
   ```

3. **选择项目**
   ```bash
   firebase use <project-id>
   ```

### 安装依赖

```bash
cd functions
npm install
```

### 本地测试

```bash
# 启动本地模拟器
npm run serve

# 或单独构建
npm run build
```

### 部署到 Firebase

```bash
# 部署所有函数
npm run deploy

# 或使用 firebase CLI
firebase deploy --only functions

# 部署特定函数
firebase deploy --only functions:sendNotification
firebase deploy --only functions:onReloadVerified
firebase deploy --only functions:sendEventReminders
```

---

## 📝 环境配置

### 必需的环境变量

Cloud Functions 会自动从 Firebase 项目配置中读取，无需手动设置环境变量。

### 权限配置

确保以下 Firestore 安全规则允许 Cloud Functions 访问：

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cloud Functions 有完全访问权限（服务端）
    // 用户只能访问自己的数据
    match /deviceTokens/{tokenId} {
      allow read: if request.auth != null 
                  && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null 
                    && request.resource.data.userId == request.auth.uid;
      allow update, delete: if false; // 只能通过 Cloud Functions 更新
    }
    
    match /notificationHistory/{historyId} {
      allow read: if request.auth != null 
                  && resource.data.userId == request.auth.uid;
      allow create: if false; // 只能通过 Cloud Functions 创建
      allow update: if false;
      allow delete: if false;
    }
  }
}
```

---

## 🧪 测试

### 测试 sendNotification 函数

1. **前端调用测试**
   ```typescript
   // 在浏览器控制台或组件中
   const functions = getFunctions(app);
   const sendNotification = httpsCallable(functions, 'sendNotification');
   
   const result = await sendNotification({
     tokens: ['your-fcm-token-here'],
     notification: {
       title: '测试',
       body: '这是一条测试通知'
     },
     data: { type: 'system' },
     priority: 'normal'
   });
   
   console.log('Result:', result.data);
   ```

2. **测试充值验证通知**
   - 创建一个充值记录
   - 验证充值记录（状态变为 `completed`）
   - 应该自动收到推送通知

3. **测试活动提醒**
   - 创建一个明天开始的活动
   - 等待第二天上午 9 点
   - 或手动触发函数（通过 Firebase Console）

### 查看日志

```bash
# 查看实时日志
firebase functions:log

# 查看特定函数的日志
firebase functions:log --only sendNotification
```

---

## 🔧 开发

### 文件结构

```
functions/
├── src/
│   └── index.ts          # 主要 Cloud Functions 代码
├── package.json          # 依赖配置
├── tsconfig.json         # TypeScript 配置
├── .eslintrc.js          # ESLint 配置
└── README.md             # 本文档
```

### 添加新函数

1. 在 `src/index.ts` 中添加新函数
2. 构建代码：`npm run build`
3. 部署：`firebase deploy --only functions:yourFunctionName`

### 调试

```bash
# 本地调试
npm run serve

# 使用 Firebase Console 调试
# 访问 https://console.firebase.google.com/project/<project-id>/functions/logs
```

---

## 📚 相关文档

- [Firebase Cloud Functions 文档](https://firebase.google.com/docs/functions)
- [Firebase Admin SDK 文档](https://firebase.google.com/docs/admin/setup)
- [Cloud Messaging 文档](https://firebase.google.com/docs/cloud-messaging)
- [后端集成指南](../docs/PUSH_NOTIFICATIONS_BACKEND.md)

---

## ⚠️ 注意事项

1. **成本考虑**
   - Cloud Functions 按调用次数和计算时间收费
   - 定时任务每天运行一次，成本较低
   - Firestore 触发器按文档写入次数收费

2. **冷启动**
   - 首次调用或长时间未使用后，函数可能需要几秒钟启动
   - 建议保持至少一个函数始终活跃

3. **错误处理**
   - 所有错误都会被记录到 Firebase Console
   - 建议定期检查日志

4. **版本控制**
   - Cloud Functions 会自动创建版本
   - 旧版本会保留，可以回滚

