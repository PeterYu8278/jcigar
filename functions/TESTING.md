# 推送通知测试指南

本文档说明如何测试推送通知功能，包括前端测试、Firebase Console 测试和实际业务场景测试。

---

## 📋 测试前准备

### 1. 检查部署状态

确保 Cloud Functions 已成功部署：

```bash
firebase functions:list
```

应该能看到三个函数：
- `sendNotification`
- `onReloadVerified`
- `sendEventReminders`

### 2. 检查前端配置

确保以下配置正确：
- ✅ VAPID 密钥已配置（`.env.local` 中的 `VITE_FIREBASE_VAPID_KEY`）
- ✅ 开发服务器正在运行
- ✅ Firebase 项目连接正常

---

## 🧪 测试方法

### 方法 1: 前端手动测试（最简单）

#### 步骤 1: 启用推送通知权限

1. **打开应用**
   - 访问：`http://localhost:3000/profile`

2. **进入通知设置**
   - 在个人中心页面找到"通知设置"卡片

3. **启用推送通知**
   - 点击"启用推送通知"开关
   - 浏览器会弹出权限请求
   - 点击"允许"

4. **验证权限已启用**
   - 应该看到"通知权限已启用"
   - 控制台应该显示：`[FCM] FCM token obtained: ...`

#### 步骤 2: 发送测试通知

1. **在通知设置页面**
   - 找到"发送测试通知"按钮
   - 点击按钮

2. **检查通知**
   - 应该立即收到推送通知
   - 通知标题："测试通知"
   - 通知内容："这是一条测试推送消息"

3. **查看控制台**
   - 打开浏览器开发者工具（F12）
   - 查看 Console 标签
   - 应该看到：`[Notifications] Notification sent successfully`

---

### 方法 2: 测试充值验证通知（实际业务场景）

#### 步骤 1: 创建充值记录

1. **访问充值页面**
   - 打开：`http://localhost:3000/reload`

2. **创建充值记录**
   - 填写充值金额（例如：100 RM）
   - 上传支付凭证（可选）
   - 点击"提交充值申请"
   - 记录充值记录 ID（从 URL 或控制台获取）

#### 步骤 2: 验证充值记录

1. **访问管理后台**
   - 打开：`http://localhost:3000/admin/points-config`
   - 切换到"充值验证"标签

2. **验证充值**
   - 找到刚才创建的充值记录
   - 点击"验证"按钮
   - 填写验证信息（如果需要）
   - 点击"确认验证"

3. **检查通知**
   - 应该自动收到推送通知
   - 通知标题："💰 充值成功"
   - 通知内容："您的充值 100 RM (xxx 积分) 已到账"

4. **验证历史记录**
   - 在 Firebase Console 查看 `notificationHistory` 集合
   - 应该能看到刚发送的通知记录

---

### 方法 3: 使用 Firebase Console 测试（最可靠）

#### 步骤 1: 获取 FCM 令牌

1. **在浏览器中**
   - 访问：`http://localhost:3000/profile`
   - 打开开发者工具（F12）
   - 进入 Console 标签

2. **查看 FCM 令牌**
   - 应该能看到类似日志：`[FCM] FCM token obtained: eX1a2b3c...`
   - **复制完整的令牌**（很长的一串字符）

3. **或者从 Firestore 获取**
   - 访问 Firebase Console
   - 进入 Firestore Database
   - 查看 `deviceTokens` 集合
   - 找到您的设备令牌（`token` 字段）

#### 步骤 2: 在 Firebase Console 发送测试消息

1. **访问 Cloud Messaging**
   - 打开：https://console.firebase.google.com/project/cigar-56871/messaging
   - 或：https://console.firebase.google.com/project/jcigar-c0e54/messaging

2. **发送测试消息**
   - 点击右上角"发送您的第一条消息"
   - 或点击"Send test message"按钮

3. **填写通知内容**
   - **Title（标题）**：测试通知
   - **Text（文本）**：这是一条从 Firebase Console 发送的测试消息

4. **输入 FCM 令牌**
   - 在"FCM registration token"输入框中
   - 粘贴刚才复制的 FCM 令牌

5. **发送**
   - 点击"Test"按钮
   - 应该立即收到推送通知

---

### 方法 4: 使用 cURL 测试（开发者）

#### 步骤 1: 获取 Server Key

1. **访问 Firebase Console**
   - 打开：https://console.firebase.google.com/project/cigar-56871/settings/cloudmessaging
   - 或项目设置 → Cloud Messaging 标签

2. **复制 Server Key**
   - 找到"Cloud Messaging API (Legacy)"部分
   - 复制"Server key"

#### 步骤 2: 使用 cURL 发送

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "YOUR_FCM_TOKEN",
    "notification": {
      "title": "测试通知",
      "body": "这是一条通过 cURL 发送的测试消息"
    },
    "data": {
      "type": "system",
      "url": "/"
    }
  }'
```

**替换**：
- `YOUR_SERVER_KEY` → 您的 Server Key
- `YOUR_FCM_TOKEN` → 您的 FCM 令牌

---

## ✅ 验证清单

### 前端测试验证

- [ ] 浏览器权限请求正常显示
- [ ] 点击"允许"后权限状态变为"granted"
- [ ] FCM 令牌成功获取并在控制台显示
- [ ] 设备令牌已保存到 Firestore `deviceTokens` 集合
- [ ] "发送测试通知"按钮可以点击
- [ ] 点击后能收到推送通知
- [ ] 通知显示在浏览器右上角（前台）
- [ ] 应用最小化后收到系统通知（后台）

### 业务场景测试验证

- [ ] 充值记录创建成功
- [ ] 充值验证后自动触发通知
- [ ] 通知历史记录保存到 Firestore
- [ ] 通知内容正确（金额、积分）
- [ ] 通知点击后能正确跳转

### Firebase Console 验证

- [ ] FCM 令牌能正确识别
- [ ] 测试消息发送成功
- [ ] 通知能正常显示
- [ ] 数据字段正确传递

---

## 🐛 常见问题排查

### 问题 1: 收不到通知

**可能原因**：
1. 权限未授予
   - **解决**：在浏览器设置中允许通知权限

2. Service Worker 未注册
   - **解决**：检查 `public/firebase-messaging-sw.js` 是否存在

3. FCM 令牌无效
   - **解决**：重新启用推送通知，获取新令牌

4. Cloud Functions 未部署
   - **解决**：检查函数是否已部署：`firebase functions:list`

### 问题 2: 控制台报错

**错误**：`[FCM] VAPID key not configured`

**解决**：
- 检查 `.env.local` 文件是否存在
- 确认 `VITE_FIREBASE_VAPID_KEY` 已配置
- 重启开发服务器

**错误**：`functions/not-found`

**解决**：
- 确认 Cloud Functions 已部署
- 检查函数名称是否正确
- 等待几分钟后重试（函数可能需要时间激活）

### 问题 3: 通知内容不正确

**检查**：
- 查看 Firebase Console → Cloud Messaging → 消息历史
- 检查通知历史记录（`notificationHistory` 集合）
- 查看 Cloud Functions 日志

---

## 📊 查看日志

### Cloud Functions 日志

```bash
# 查看所有函数日志
firebase functions:log

# 查看特定函数日志
firebase functions:log --only sendNotification
firebase functions:log --only onReloadVerified

# 实时查看日志
firebase functions:log --follow
```

### 前端日志

在浏览器控制台（F12）查看：
- `[FCM]` 开头的日志（Firebase Messaging）
- `[Notifications]` 开头的日志（通知服务）
- `[DeviceTokens]` 开头的日志（设备令牌管理）

### Firestore 数据验证

访问 Firebase Console → Firestore Database：

1. **检查设备令牌**
   - 集合：`deviceTokens`
   - 应该能看到您的设备信息
   - `isActive` 字段应该是 `true`

2. **检查通知历史**
   - 集合：`notificationHistory`
   - 应该能看到所有发送的通知
   - 检查 `deliveryStatus` 字段

3. **检查用户配置**
   - 集合：`users`
   - 查看 `notifications.pushEnabled` 是否为 `true`
   - 查看 `notifications.preferences` 配置

---

## 🎯 测试场景总结

### 场景 1: 前台通知（应用打开时）

**测试步骤**：
1. 打开应用（保持窗口打开）
2. 发送测试通知
3. 通知应该显示在浏览器右上角（Ant Design 通知组件）

**预期结果**：
- ✅ 右上角显示通知卡片
- ✅ 通知内容正确
- ✅ 5 秒后自动消失
- ✅ 可以点击通知

### 场景 2: 后台通知（应用最小化时）

**测试步骤**：
1. 打开应用并启用推送通知
2. 最小化浏览器窗口（或切换到其他标签）
3. 发送测试通知
4. 查看系统通知

**预期结果**：
- ✅ 系统托盘显示通知
- ✅ 通知图标正确
- ✅ 点击通知能打开应用并跳转

### 场景 3: 移动设备测试（PWA）

**测试步骤**：
1. 将应用添加到主屏幕（PWA）
2. 打开添加到主屏幕的应用
3. 启用推送通知
4. 发送测试通知

**预期结果**：
- ✅ 移动设备上显示原生通知
- ✅ 通知样式符合移动端规范
- ✅ 点击通知能打开应用

---

## 📝 测试记录模板

```
测试日期：___________
测试人员：___________

[ ] 前端手动测试
  - [ ] 权限请求正常
  - [ ] FCM 令牌获取成功
  - [ ] 测试通知发送成功
  - [ ] 通知显示正确

[ ] 充值验证通知测试
  - [ ] 充值记录创建成功
  - [ ] 验证后自动发送通知
  - [ ] 通知内容正确
  - [ ] 通知历史已保存

[ ] Firebase Console 测试
  - [ ] FCM 令牌识别成功
  - [ ] 测试消息发送成功
  - [ ] 通知正常显示

[ ] 错误处理测试
  - [ ] 无效令牌正确处理
  - [ ] 权限拒绝时正确处理
  - [ ] 网络错误时正确处理

备注：
_________________________________
_________________________________
```

---

## 🔗 有用链接

- **Firebase Console**: https://console.firebase.google.com/project/cigar-56871
- **Cloud Messaging**: https://console.firebase.google.com/project/cigar-56871/messaging
- **Firestore Database**: https://console.firebase.google.com/project/cigar-56871/firestore
- **Cloud Functions**: https://console.firebase.google.com/project/cigar-56871/functions
- **Cloud Functions 日志**: https://console.firebase.google.com/project/cigar-56871/functions/logs

---

## 💡 测试技巧

1. **使用多个设备测试**
   - 在同一用户的不同设备上测试
   - 验证通知能发送到所有设备

2. **测试不同的通知类型**
   - 充值验证通知
   - 活动提醒通知
   - 系统通知

3. **测试边界情况**
   - 没有设备令牌时
   - 用户禁用通知时
   - 网络断开时

4. **监控性能**
   - 查看 Cloud Functions 执行时间
   - 检查内存使用情况
   - 监控调用次数

---

所有测试方法都已列出，您可以根据需要选择合适的方法进行测试。如果遇到问题，请查看日志或告诉我具体的错误信息。

