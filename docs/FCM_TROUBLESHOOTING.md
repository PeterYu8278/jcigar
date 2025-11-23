# FCM 推送通知故障排除指南

## 测试单个 Token

### 方法 1: 使用测试函数（推荐）

创建一个测试请求来发送推送通知到指定的 token：

```bash
curl -X POST https://your-app.netlify.app/.netlify/functions/test-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "fPo8qndTF7bkFfR6wO9FrI:APA91bG9q7yMnWUE8AFjRL0-vpdyFyAB0Nc6KFcUX7Hs073snBP8Gn9IL2BYp1eBWMX_V8XXCK_PBB6fX1JkIB09uWdn97NpWBwsOC0kHchH0xdtDOOAyd0",
    "title": "测试通知",
    "body": "这是一条测试推送通知"
  }'
```

### 方法 2: 使用浏览器控制台

在浏览器控制台中运行：

```javascript
fetch('/.netlify/functions/test-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: 'fPo8qndTF7bkFfR6wO9FrI:APA91bG9q7yMnWUE8AFjRL0-vpdyFyAB0Nc6KFcUX7Hs073snBP8Gn9IL2BYp1eBWMX_V8XXCK_PBB6fX1JkIB09uWdn97NpWBwsOC0kHchH0xdtDOOAyd0',
    title: '测试通知',
    body: '这是一条测试推送通知'
  })
})
.then(res => res.json())
.then(data => console.log('结果:', data))
.catch(err => console.error('错误:', err));
```

## 常见问题诊断

### 1. Token 无效或已过期

**错误代码**: `messaging/invalid-registration-token` 或 `messaging/registration-token-not-registered`

**可能原因**:
- Token 已过期（FCM token 可能会定期更新）
- 设备已卸载应用
- Service Worker 被清除
- 浏览器数据被清除

**解决方法**:
1. 重新获取 token：
   ```javascript
   // 在浏览器控制台运行
   import { getFCMToken } from './src/services/firebase/messaging';
   getFCMToken().then(token => console.log('新 Token:', token));
   ```

2. 检查 Firestore 中的 token 是否是最新的

### 2. Service Worker 未注册

**检查方法**:
```javascript
// 在浏览器控制台运行
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('已注册的 Service Workers:', registrations);
  registrations.forEach(reg => {
    console.log('Scope:', reg.scope);
    console.log('Active:', reg.active);
  });
});
```

**解决方法**:
1. 确保 `public/firebase-messaging-sw.js` 文件存在
2. 检查 Service Worker 是否正确注册
3. 清除浏览器缓存并重新加载

### 3. 浏览器通知权限未授予

**检查方法**:
```javascript
// 在浏览器控制台运行
console.log('通知权限:', Notification.permission);
```

**可能的值**:
- `'granted'` - 已授予 ✅
- `'denied'` - 已拒绝 ❌
- `'default'` - 未请求 ⚠️

**解决方法**:
1. 如果权限是 `'denied'`，需要在浏览器设置中手动开启
2. 如果权限是 `'default'`，需要请求权限：
   ```javascript
   Notification.requestPermission().then(permission => {
     console.log('权限状态:', permission);
   });
   ```

### 4. 应用在前台运行

**问题**: 如果应用在前台运行，推送通知可能不会显示系统通知，而是触发 `onMessage` 回调。

**检查方法**:
```javascript
// 在浏览器控制台运行
// 检查是否有 onMessage 监听器
```

**解决方法**:
1. 最小化浏览器窗口或切换到其他标签页
2. 确保应用在后台运行
3. 检查 `onForegroundMessage` 是否正确处理前台消息

### 5. Firebase Admin SDK 配置问题

**检查方法**:
1. 检查 Netlify 环境变量 `FIREBASE_SERVICE_ACCOUNT` 是否配置
2. 检查 Service Account JSON 格式是否正确
3. 检查 Service Account 是否有 FCM 权限

**解决方法**:
1. 在 Netlify 控制台检查环境变量
2. 确保 Service Account JSON 格式正确（单行格式）
3. 验证 Service Account 权限

### 6. Token 格式问题

**检查方法**:
```javascript
// 在浏览器控制台运行
const token = 'fPo8qndTF7bkFfR6wO9FrI:APA91bG9q7yMnWUE8AFjRL0-vpdyFyAB0Nc6KFcUX7Hs073snBP8Gn9IL2BYp1eBWMX_V8XXCK_PBB6fX1JkIB09uWdn97NpWBwsOC0kHchH0xdtDOOAyd0';
console.log('Token 长度:', token.length);
console.log('Token 格式:', /^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/.test(token) ? '有效' : '无效');
```

**有效的 Token 格式**:
- 长度通常在 150-200 字符之间
- 格式: `前缀:后缀`
- 只包含字母、数字、下划线和连字符

## 诊断步骤

### 步骤 1: 验证 Token 有效性

使用测试函数发送通知，查看返回的错误信息。

### 步骤 2: 检查浏览器环境

1. 打开浏览器开发者工具（F12）
2. 切换到 Application 标签
3. 检查 Service Workers 是否注册
4. 检查通知权限状态

### 步骤 3: 检查 Firestore 数据

1. 打开 Firebase Console
2. 检查 `users/{userId}/fcmTokens` 集合
3. 确认 token 存在且 `active: true`
4. 检查 `deviceId` 和 `deviceInfo` 是否正确

### 步骤 4: 检查 Netlify Function 日志

1. 打开 Netlify 控制台
2. 查看 Functions 日志
3. 查找错误信息

### 步骤 5: 测试 Service Worker

```javascript
// 在浏览器控制台运行
navigator.serviceWorker.ready.then(registration => {
  registration.showNotification('测试通知', {
    body: '这是一条测试通知',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-96x96.svg'
  });
});
```

如果这个测试通知能显示，说明 Service Worker 工作正常。

## 调试技巧

### 启用详细日志

在浏览器控制台运行：

```javascript
localStorage.setItem('fcm_debug', 'true');
```

### 检查 FCM 连接

```javascript
// 在浏览器控制台运行
navigator.serviceWorker.getRegistration().then(reg => {
  if (reg) {
    reg.pushManager.getSubscription().then(sub => {
      console.log('Push Subscription:', sub);
      if (sub) {
        console.log('Endpoint:', sub.endpoint);
        console.log('Keys:', sub.getKey('p256dh'), sub.getKey('auth'));
      }
    });
  }
});
```

## 常见错误代码

| 错误代码 | 含义 | 解决方法 |
|---------|------|---------|
| `messaging/invalid-registration-token` | Token 无效 | 重新获取 token |
| `messaging/registration-token-not-registered` | Token 未注册 | 设备可能已卸载应用 |
| `messaging/invalid-argument` | 消息格式无效 | 检查消息格式 |
| `messaging/unavailable` | FCM 服务不可用 | 稍后重试 |
| `messaging/internal-error` | FCM 内部错误 | 检查 Firebase 配置 |

## 联系支持

如果以上方法都无法解决问题，请提供以下信息：

1. 浏览器类型和版本
2. 操作系统
3. Token（前 20 个字符）
4. 错误消息
5. 浏览器控制台日志
6. Netlify Function 日志

