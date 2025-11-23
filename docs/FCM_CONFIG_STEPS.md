# FCM 推送通知配置步骤 - 详细指南

## 📋 当前状态

✅ **已完成：**
- 代码实现完成
- Netlify Functions 已创建
- Service Worker 已创建
- 依赖已安装（@netlify/functions）

❌ **待配置：**
- 环境变量（本地和 Netlify）
- Firebase Service Account（用于 Netlify Functions）
- VAPID 密钥

---

## 🎯 配置步骤（按顺序执行）

### 步骤 1: 获取 FCM VAPID 密钥 ⏱️ 2 分钟

#### 1.1 访问 Firebase Console

打开浏览器，访问：
```
https://console.firebase.google.com/project/cigar-56871/settings/cloudmessaging
```

#### 1.2 生成或查看 VAPID 密钥

1. 滚动到 **"Web 推送证书"**（Web Push certificates）部分
2. 如果已有密钥对：
   - 直接复制 **"密钥对"**（Key pair）中的公钥
3. 如果没有密钥对：
   - 点击 **"生成密钥对"**（Generate key pair）按钮
   - 复制生成的公钥（Public key）
   - 格式类似：`BEl62iUYgUivxIkv69yViEuiBIa40HI...`（很长的一串字符）

#### 1.3 保存密钥

将复制的 VAPID 密钥保存到剪贴板，稍后需要添加到环境变量。

---

### 步骤 2: 配置本地环境变量 ⏱️ 1 分钟

#### 方法 A: 使用配置助手（推荐）

运行交互式配置脚本：

```bash
npm run setup-fcm
```

按照提示输入 VAPID 密钥即可。

#### 方法 B: 手动配置

1. 在项目根目录找到 `.env.local` 文件（如果不存在，创建它）

2. 添加以下内容：

```env
# FCM 配置
VITE_FCM_VAPID_KEY=你的VAPID密钥（从步骤1.2复制）
```

**示例：**
```env
VITE_FCM_VAPID_KEY=BEl62iUYgUivxIkv69yViEuiBIa40HIabcdefghijklmnopqrstuvwxyz1234567890
```

3. 确保 `.env.local` 文件已包含其他 Firebase 配置（如果还没有，从 `env.example` 复制）

---

### 步骤 3: 验证本地配置 ⏱️ 30 秒

运行配置检查脚本：

```bash
npm run check-fcm
```

**预期输出：**
- ✅ VITE_FCM_VAPID_KEY: 已配置
- ✅ Service Worker 文件存在
- ✅ Netlify Functions 文件存在
- ✅ @netlify/functions 已安装

如果所有项目都显示 ✅，说明本地配置完成！

---

### 步骤 4: 配置 Netlify 环境变量 ⏱️ 3 分钟

#### 4.1 登录 Netlify Dashboard

1. 访问：https://app.netlify.com
2. 选择您的站点

#### 4.2 添加环境变量

进入 **Site settings** > **Environment variables** > **Add a variable**

添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_FCM_VAPID_KEY` | 你的VAPID密钥 | 从步骤1.2复制（与本地相同） |

**⚠️ 重要：** 确保变量名以 `VITE_` 开头，这样 Vite 才会在构建时注入到前端代码中。

---

### 步骤 5: 配置 Firebase Service Account（用于 Netlify Functions）⏱️ 5 分钟

#### 5.1 创建 Service Account

1. 在 Firebase Console 中，进入：
   ```
   项目设置 > 服务账号（Service accounts）
   ```

2. 点击 **"生成新的私钥"**（Generate new private key）

3. 确认对话框，点击 **"生成密钥"**（Generate key）

4. 浏览器会自动下载一个 JSON 文件（例如：`cigar-56871-firebase-adminsdk-xxxxx.json`）

#### 5.2 配置到 Netlify

1. 打开下载的 JSON 文件

2. 复制整个 JSON 内容（包括所有大括号和引号）

3. 在 Netlify Dashboard 中，添加环境变量：

   | 变量名 | 值 | 说明 |
   |--------|-----|------|
   | `FIREBASE_SERVICE_ACCOUNT` | 粘贴整个JSON内容 | Service Account JSON（单行字符串） |

   **⚠️ 重要提示：**
   - JSON 内容需要作为**单行字符串**粘贴
   - 如果 JSON 有换行，需要删除换行或使用 `\n` 转义
   - 这是敏感信息，不要提交到 Git

#### 5.3 验证 Service Account 权限

确保 Service Account 具有以下权限：
- ✅ Cloud Messaging Admin
- ✅ Firestore Database User

---

### 步骤 6: 测试本地推送通知 ⏱️ 2 分钟

#### 6.1 启动开发服务器

```bash
npm run dev
```

#### 6.2 测试推送通知功能

1. 打开浏览器，访问应用（确保使用 HTTPS 或 localhost）

2. 登录用户账户

3. 进入 **个人中心** > 点击 **编辑资料**

4. 滚动到 **偏好设置** 卡片

5. 找到 **推送通知设置** 部分

6. 点击 **立即开启** 按钮

7. 浏览器会弹出权限请求，点击 **允许**

8. 验证：
   - ✅ 通知权限状态变为 "已授予"
   - ✅ 推送通知开关可以正常切换
   - ✅ 通知类型选项可以正常选择

#### 6.3 验证 Token 保存

1. 打开浏览器开发者工具（F12）
2. 进入 **Application** > **Service Workers**，确认 Service Worker 已注册
3. 进入 **Console**，查看是否有 FCM Token 相关的日志
4. 在 Firestore Console 中，检查 `users/{userId}/fcmTokens` 集合是否有新文档

---

### 步骤 7: 部署到 Netlify 并测试 ⏱️ 5 分钟

#### 7.1 提交代码

```bash
git add .
git commit -m "feat: 添加 FCM 推送通知功能"
git push origin main
```

#### 7.2 等待 Netlify 自动部署

Netlify 会自动检测到代码推送并开始构建。

#### 7.3 验证部署

1. 等待构建完成（查看 Netlify Dashboard）

2. 访问部署后的站点

3. 重复步骤 6.2 的测试流程

4. 验证 Netlify Functions 是否正常工作：
   - 检查浏览器 Network 标签
   - 查看是否有对 `/.netlify/functions/save-token` 的请求
   - 确认请求返回 200 状态码

---

## 🧪 测试推送通知发送

### 方法 1: 使用 Firebase Console（最简单）

1. 访问：https://console.firebase.google.com/project/cigar-56871/notification
2. 点击 **"发送测试消息"**（Send test message）
3. 输入 FCM Token（从 Firestore 获取：`users/{userId}/fcmTokens/{tokenId}`）
4. 输入标题和内容
5. 点击 **"测试"**

### 方法 2: 使用 Netlify Function（需要管理员界面）

调用 `/api/send-notification` 端点：

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试通知",
    "body": "这是一条测试推送通知",
    "type": "system",
    "targetUsers": ["userId1"]
  }'
```

---

## ✅ 配置完成检查清单

完成所有步骤后，请确认：

- [ ] ✅ VAPID 密钥已获取并配置到 `.env.local`
- [ ] ✅ `npm run check-fcm` 显示所有配置正确
- [ ] ✅ Netlify 环境变量 `VITE_FCM_VAPID_KEY` 已配置
- [ ] ✅ Netlify 环境变量 `FIREBASE_SERVICE_ACCOUNT` 已配置
- [ ] ✅ 本地测试：通知权限可以正常请求
- [ ] ✅ 本地测试：FCM Token 已保存到 Firestore
- [ ] ✅ 生产环境：部署成功，推送通知功能正常

---

## 🔧 故障排查

### 问题 1: "Messaging not available or VAPID key missing"

**解决方案：**
1. 检查 `.env.local` 文件是否存在 `VITE_FCM_VAPID_KEY`
2. 确保值正确（没有多余空格）
3. 重启开发服务器：`npm run dev`

### 问题 2: "Notification permission not granted"

**解决方案：**
1. 在浏览器设置中手动开启通知权限
2. Chrome: 设置 > 隐私和安全 > 网站设置 > 通知
3. 刷新页面后重试

### 问题 3: Netlify Functions 返回 500 错误

**解决方案：**
1. 检查 Netlify 环境变量 `FIREBASE_SERVICE_ACCOUNT` 是否正确
2. 确保 JSON 格式正确（单行字符串）
3. 查看 Netlify Functions 日志：Netlify Dashboard > Functions > Logs

### 问题 4: Service Worker 未注册

**解决方案：**
1. 检查 `public/firebase-messaging-sw.js` 是否存在
2. 确保构建时配置已注入（运行 `npm run build`）
3. 检查浏览器控制台错误信息

---

## 📚 相关文档

- **快速开始：** `docs/FCM_QUICK_START.md`
- **完整指南：** `docs/FCM_SETUP_GUIDE.md`
- **Firebase 文档：** https://firebase.google.com/docs/cloud-messaging
- **Netlify Functions：** https://docs.netlify.com/functions/overview/

---

## 🎉 完成！

配置完成后，您的应用已支持推送通知功能！

**下一步建议：**
1. 实现管理员推送界面（用于发送推送通知）
2. 添加推送历史记录功能
3. 实现主题订阅功能
4. 优化推送策略（根据用户偏好和勿扰时段）

