# FCM 推送通知测试指南

## 📋 测试前准备

✅ **已完成：**
- 本地环境变量已配置
- Service Worker 配置已注入
- 所有必需文件已创建

---

## 🧪 步骤 1: 本地测试（开发环境）

### 1.1 启动开发服务器

```bash
npm run dev
```

开发服务器将在 `http://localhost:3000` 启动。

### 1.2 测试推送通知权限请求

1. **打开浏览器**
   - 推荐使用 **Chrome** 或 **Edge**（Firefox 和 Safari 支持有限）
   - 确保访问地址是 `localhost` 或 `127.0.0.1`（HTTPS 或 localhost 都可以）

2. **登录用户账户**
   - 使用现有账户登录，或注册新账户

3. **进入个人中心**
   - 点击底部导航的 **个人中心** 图标
   - 或访问：`http://localhost:3000/profile`

4. **打开编辑资料弹窗**
   - 点击 **编辑资料** 按钮
   - 弹窗会自动打开

5. **找到推送通知设置**
   - 滚动到 **偏好设置** 卡片
   - 找到 **推送通知设置** 部分

6. **启用推送通知**
   - 如果权限未授予，会显示 **"立即开启"** 按钮
   - 点击 **"立即开启"** 按钮
   - 浏览器会弹出通知权限请求对话框
   - 点击 **"允许"**

### 1.3 验证配置保存

1. **检查浏览器控制台**
   - 打开开发者工具（F12）
   - 查看 **Console** 标签
   - 应该看到类似日志：
     ```
     [FCM] Getting token...
     [FCM] Token received: ...
     [FCM] Token saved successfully
     ```

2. **检查 Firestore 数据库**
   - 访问：https://console.firebase.google.com/project/cigar-56871/firestore
   - 导航到：`users/{userId}/fcmTokens`
   - 应该看到新创建的 Token 文档，包含：
     - `token`: FCM Token 字符串
     - `deviceInfo`: 设备信息对象
     - `createdAt`: 创建时间
     - `active`: true

3. **验证 UI 状态**
   - 推送通知开关应该可以正常切换
   - 通知类型选项应该可以选择/取消选择
   - 勿扰时段设置应该可以正常配置

### 1.4 测试前台推送（应用打开时）

**使用 Firebase Console 发送测试消息：**

1. **访问 Firebase Console**
   - 打开：https://console.firebase.google.com/project/cigar-56871/notification
   - 点击 **"发送测试消息"**（Send test message）

2. **获取 FCM Token**
   - 从 Firestore 中复制用户的 FCM Token
   - 路径：`users/{userId}/fcmTokens/{tokenId}` > `token` 字段

3. **发送测试消息**
   - 在 **FCM registration token** 字段粘贴 Token
   - 输入标题：`测试通知`
   - 输入内容：`这是一条测试推送通知`
   - 点击 **"测试"**（Test）

4. **验证接收**
   - 如果应用正在前台打开，应该看到 Toast 通知
   - 检查浏览器控制台是否有推送日志

### 1.5 测试后台推送（应用关闭或最小化）

1. **最小化浏览器窗口** 或 **关闭标签页**

2. **发送测试消息**（重复步骤 1.4）

3. **验证接收**
   - 系统通知栏应该显示推送通知
   - 通知标题：`测试通知`
   - 通知内容：`这是一条测试推送通知`

4. **测试点击通知**
   - 点击系统通知
   - 应该打开应用（或聚焦到应用标签页）

---

## 🚀 步骤 2: 生产环境测试（Netlify 部署后）

### 2.1 部署到 Netlify

**如果已配置自动部署：**
1. 提交代码：
   ```bash
   git add .
   git commit -m "feat: 添加 FCM 推送通知功能"
   git push origin main
   ```
2. 等待 Netlify 自动部署完成

**如果手动部署：**
1. 运行构建：
   ```bash
   npm run build
   ```
2. 在 Netlify Dashboard 中手动触发部署

### 2.2 验证 Netlify Functions

1. **查看 Functions 列表**
   - 访问 Netlify Dashboard > **Functions**
   - 应该看到：
     - ✅ `save-token`
     - ✅ `send-notification`
     - ✅ `subscribe-topic`

2. **测试 save-token 端点**
   ```bash
   curl -X POST https://your-site.netlify.app/.netlify/functions/save-token \
     -H "Content-Type: application/json" \
     -d '{
       "token": "test-token-123",
       "userId": "test-user-id",
       "deviceInfo": {
         "platform": "Windows",
         "userAgent": "test-agent",
         "language": "en"
       }
     }'
   ```
   
   **预期响应：**
   ```json
   {"success": true}
   ```

### 2.3 在生产环境测试推送通知

1. **访问部署后的站点**
   - 使用 HTTPS URL（例如：`https://your-site.netlify.app`）
   - 登录用户账户

2. **重复步骤 1.2 - 1.5**（启用推送通知并测试）

3. **验证 Service Worker**
   - 打开开发者工具 > **Application** > **Service Workers**
   - 应该看到 `firebase-messaging-sw.js` 已注册
   - 状态应该是 **activated and running**

---

## 🔧 故障排查

### 问题 1: "Notification permission not granted"

**症状：** 点击"立即开启"后，权限请求没有弹出

**可能原因：**
1. 浏览器已拒绝过通知权限
2. 浏览器不支持通知 API

**解决方案：**
1. 在浏览器设置中手动开启：
   - Chrome: 地址栏左侧的锁图标 > 网站设置 > 通知 > 允许
   - Edge: 地址栏左侧的锁图标 > 站点权限 > 通知 > 允许
2. 刷新页面后重试

### 问题 2: "Messaging not available or VAPID key missing"

**症状：** 浏览器控制台显示此错误

**可能原因：**
1. VAPID 密钥未正确配置
2. 环境变量未加载

**解决方案：**
1. 检查 `.env.local` 文件是否存在 `VITE_FCM_VAPID_KEY`
2. 确认值正确（不是 `your_vapid_key_here`）
3. 重启开发服务器：`npm run dev`

### 问题 3: "Service Worker registration failed"

**症状：** Service Worker 未注册

**可能原因：**
1. Service Worker 文件路径错误
2. 浏览器不支持 Service Worker
3. HTTPS 未启用（生产环境）

**解决方案：**
1. 检查 `public/firebase-messaging-sw.js` 是否存在
2. 检查浏览器控制台错误信息
3. 确保使用 HTTPS（生产环境）或 localhost（开发环境）

### 问题 4: "Token save failed"

**症状：** FCM Token 未保存到 Firestore

**可能原因：**
1. Firestore 权限规则阻止写入
2. Netlify Function 未正确配置

**解决方案：**
1. 检查 Firestore 规则：
   ```javascript
   match /users/{userId}/fcmTokens/{tokenId} {
     allow read, write: if request.auth != null && request.auth.uid == userId;
   }
   ```
2. 检查 Netlify Functions 日志
3. 验证 `FIREBASE_SERVICE_ACCOUNT` 环境变量是否正确

### 问题 5: 推送通知未到达

**症状：** 发送测试消息后，没有收到通知

**可能原因：**
1. Token 无效或已过期
2. 用户已禁用推送通知
3. Service Worker 未正确监听推送事件

**解决方案：**
1. 检查 Firestore 中的 Token 是否有效
2. 验证用户偏好设置中推送通知是否启用
3. 检查 Service Worker 是否正确注册和激活
4. 查看浏览器控制台和 Netlify Functions 日志

---

## ✅ 测试检查清单

完成测试后，请确认：

- [ ] ✅ 本地开发：通知权限可以正常请求
- [ ] ✅ 本地开发：FCM Token 已保存到 Firestore
- [ ] ✅ 本地开发：前台推送通知正常显示
- [ ] ✅ 本地开发：后台推送通知正常显示
- [ ] ✅ 本地开发：点击通知可以打开应用
- [ ] ✅ 生产环境：Netlify Functions 正常部署
- [ ] ✅ 生产环境：推送通知功能正常工作
- [ ] ✅ 生产环境：Service Worker 正常注册

---

## 📝 测试记录模板

**测试日期：** _______________

**测试环境：**
- [ ] 本地开发环境
- [ ] 生产环境（Netlify）

**测试结果：**

| 功能 | 状态 | 备注 |
|------|------|------|
| 权限请求 | ✅ / ❌ | |
| Token 保存 | ✅ / ❌ | |
| 前台推送 | ✅ / ❌ | |
| 后台推送 | ✅ / ❌ | |
| 点击通知 | ✅ / ❌ | |
| Netlify Functions | ✅ / ❌ | |

**发现的问题：**
1. _______________________
2. _______________________

---

## 🎉 测试完成

完成所有测试后，推送通知功能已成功配置并可以使用！

**下一步建议：**
1. 实现管理员推送界面（用于发送推送通知）
2. 添加推送历史记录功能
3. 实现主题订阅功能
4. 优化推送策略（根据用户偏好和勿扰时段）

