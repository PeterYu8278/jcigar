# 推送通知测试 - 快速指南

## 🎯 如何获取 FCM 令牌

FCM 令牌只有在您**启用推送通知**后才会获取。请按照以下步骤操作：

---

## ✅ 步骤 1: 访问个人中心

1. **打开应用**
   ```
   http://localhost:3000/profile
   ```

2. **确保已登录**
   - 如果没有登录，请先登录

---

## ✅ 步骤 2: 启用推送通知

1. **找到"通知设置"卡片**
   - 在个人中心页面滚动找到
   - 应该能看到"推送通知"相关的设置

2. **启用推送通知**
   - 找到"启用推送通知"开关
   - 点击开关，将其设置为"开启"状态
   - **重要**：浏览器会弹出权限请求窗口

3. **授予权限**
   - 浏览器会显示："localhost:3000 想要显示通知"
   - 点击**"允许"**按钮
   - **不要**点击"阻止"

---

## ✅ 步骤 3: 查看 FCM 令牌

### 方法 A: 在浏览器控制台查看（推荐）

1. **打开开发者工具**
   - 按 `F12` 键
   - 或右键点击页面 → 选择"检查"/"Inspect"

2. **切换到 Console 标签**
   - 点击控制台顶部的 "Console" 标签

3. **查找日志**
   - 在控制台中查找包含 `[FCM]` 的日志
   - 应该能看到类似这样的日志：
     ```
     [FCM] Firebase Messaging initialized successfully
     [FCM] Notification permission granted
     [FCM] Service Worker ready: ServiceWorkerRegistration {...}
     [FCM] FCM token obtained: eX1a2b3c4d5e6f7g8h9i...
     ```

4. **复制完整令牌**
   - 日志中显示的是前 20 个字符 + "..."
   - 要获取完整令牌，请使用下面方法 B

### 方法 B: 从代码中获取完整令牌

1. **在控制台执行以下代码**
   ```javascript
   // 获取完整 FCM 令牌
   import { getMessaging, getToken } from 'firebase/messaging';
   import { app } from '/src/config/firebase';
   
   const messaging = getMessaging(app);
   const registration = await navigator.serviceWorker.ready;
   const token = await getToken(messaging, {
     vapidKey: 'YOUR_VAPID_KEY', // 需要从 .env.local 获取
     serviceWorkerRegistration: registration
   });
   console.log('完整 FCM 令牌:', token);
   ```

### 方法 C: 从 Firestore 获取（最可靠）

1. **访问 Firebase Console**
   ```
   https://console.firebase.google.com/project/cigar-56871/firestore
   ```

2. **查看 deviceTokens 集合**
   - 在左侧导航栏找到 `deviceTokens` 集合
   - 点击进入

3. **找到您的设备令牌**
   - 查找 `userId` 字段匹配您当前用户 ID 的文档
   - 复制 `token` 字段的值（这是完整的 FCM 令牌）

---

## 🔍 如果没有看到 FCM 令牌日志

### 可能的原因和解决方法：

#### 1. 权限未授予

**检查方法**：
- 查看浏览器地址栏右侧的锁图标或通知图标
- 点击图标，查看通知权限状态

**解决方法**：
- 在浏览器设置中允许通知权限
- Chrome: 设置 → 隐私和安全 → 网站设置 → 通知
- 然后重新刷新页面并启用推送通知

#### 2. Service Worker 未注册

**检查方法**：
- 在控制台输入：`navigator.serviceWorker.ready`
- 应该能看到 ServiceWorkerRegistration 对象

**解决方法**：
- 检查 `public/firebase-messaging-sw.js` 文件是否存在
- 确认 Service Worker 已注册

#### 3. VAPID 密钥未配置

**检查方法**：
- 查看控制台是否有错误：`VAPID key not configured`

**解决方法**：
- 检查 `.env.local` 文件是否存在
- 确认 `VITE_FIREBASE_VAPID_KEY` 已配置
- 重启开发服务器

#### 4. 应用未正确初始化

**检查方法**：
- 查看控制台是否有 `[FCM] Firebase Messaging initialized successfully` 日志

**解决方法**：
- 刷新页面
- 重新启用推送通知

---

## 📝 完整测试流程

### 快速测试（推荐）

1. ✅ 访问 `http://localhost:3000/profile`
2. ✅ 找到"启用推送通知"开关
3. ✅ 点击开关，允许浏览器权限
4. ✅ 打开控制台（F12）
5. ✅ 查找 `[FCM] FCM token obtained:` 日志
6. ✅ 在通知设置中点击"发送测试通知"
7. ✅ 应该收到推送通知

### 详细测试

1. ✅ 启用推送通知
2. ✅ 获取 FCM 令牌（从控制台或 Firestore）
3. ✅ 在 Firebase Console 发送测试消息
4. ✅ 创建充值记录并验证，测试自动通知
5. ✅ 检查通知历史记录（Firestore）

---

## 🔗 有用链接

- **Firebase Console**: https://console.firebase.google.com/project/cigar-56871
- **Firestore Database**: https://console.firebase.google.com/project/cigar-56871/firestore
- **Cloud Messaging**: https://console.firebase.google.com/project/cigar-56871/messaging

---

## 💡 提示

1. **确保开发服务器正在运行**
   ```bash
   npm run dev
   ```

2. **清除浏览器缓存**（如果遇到问题）
   - 按 `Ctrl + Shift + Delete`
   - 选择"缓存的图片和文件"
   - 清除缓存后刷新页面

3. **使用隐身模式测试**（排除扩展干扰）
   - 按 `Ctrl + Shift + N` 打开隐身窗口
   - 访问 `http://localhost:3000/profile`

4. **查看完整日志**
   - 在控制台筛选 `[FCM]` 日志
   - 或搜索 `FCM token`

---

如果仍然无法看到 FCM 令牌，请告诉我您在控制台看到的具体错误信息或日志。

