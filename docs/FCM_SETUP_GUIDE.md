# Firebase Cloud Messaging (FCM) 推送通知配置指南

## 📋 配置步骤概览

1. ✅ 安装依赖（已完成）
2. 🔄 获取 FCM VAPID 密钥
3. 🔄 配置环境变量
4. 🔄 配置 Firebase Service Account（用于 Netlify Functions）
5. 🔄 配置 Service Worker
6. 🔄 测试推送通知

---

## 步骤 2: 获取 FCM VAPID 密钥

### 2.1 访问 Firebase Console

1. 打开浏览器，访问：https://console.firebase.google.com
2. 选择您的项目：`cigar-56871`

### 2.2 进入 Cloud Messaging 设置

1. 点击左侧菜单的 **⚙️ 项目设置**（Project Settings）
2. 选择 **Cloud Messaging** 标签页
3. 滚动到 **Web 推送证书**（Web Push certificates）部分

### 2.3 生成或查看 VAPID 密钥

**如果已有密钥对：**
- 直接复制 **密钥对**（Key pair）中的公钥

**如果没有密钥对：**
1. 点击 **生成密钥对**（Generate key pair）按钮
2. 复制生成的公钥（Public key）
3. 格式类似：`BEl62iUYgUivxIkv69yViEuiBIa40HI...`（很长的一串字符）

### 2.4 保存 VAPID 密钥

将复制的 VAPID 密钥保存到剪贴板，稍后需要添加到环境变量中。

---

## 步骤 3: 配置环境变量

### 3.1 配置本地开发环境变量

1. 在项目根目录找到 `.env.local` 文件（如果不存在，创建它）
2. 添加以下内容：

```env
# FCM 配置
VITE_FCM_VAPID_KEY=你的VAPID密钥（从步骤2.3复制）
```

**示例：**
```env
VITE_FCM_VAPID_KEY=BEl62iUYgUivxIkv69yViEuiBIa40HIabcdefghijklmnopqrstuvwxyz1234567890
```

### 3.2 配置 Netlify 环境变量

1. 登录 Netlify Dashboard：https://app.netlify.com
2. 选择您的站点
3. 进入 **Site settings** > **Environment variables**
4. 点击 **Add a variable**
5. 添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_FCM_VAPID_KEY` | 你的VAPID密钥 | 从步骤2.3复制 |

---

## 步骤 4: 配置 Firebase Service Account（用于 Netlify Functions）

### 4.1 创建 Service Account

1. 在 Firebase Console 中，进入 **项目设置** > **服务账号**（Service accounts）
2. 点击 **生成新的私钥**（Generate new private key）
3. 确认对话框，点击 **生成密钥**（Generate key）
4. 浏览器会自动下载一个 JSON 文件（例如：`cigar-56871-firebase-adminsdk-xxxxx.json`）

### 4.2 配置 Netlify 环境变量（Service Account）

1. 打开下载的 JSON 文件
2. 复制整个 JSON 内容
3. 在 Netlify Dashboard 中，添加环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `FIREBASE_SERVICE_ACCOUNT` | 粘贴整个JSON内容 | Service Account JSON（用于 Netlify Functions） |

**⚠️ 重要提示：**
- JSON 内容需要作为**单行字符串**粘贴
- 确保 JSON 格式正确（没有换行符，或使用 `\n` 转义）
- 这是敏感信息，不要提交到 Git

### 4.3 验证 Service Account 权限

确保 Service Account 具有以下权限：
- ✅ Cloud Messaging Admin
- ✅ Firestore Database User

---

## 步骤 5: 配置 Service Worker

### 5.1 检查 Service Worker 文件

Service Worker 文件已创建在：`public/firebase-messaging-sw.js`

### 5.2 更新 Service Worker 配置

由于 Service Worker 在浏览器中运行，无法直接访问环境变量，我们需要在构建时注入配置。

**选项 A：使用构建脚本注入（推荐）**

创建一个构建脚本来替换 Service Worker 中的占位符：

```javascript
// scripts/inject-sw-config.js
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const swPath = resolve(process.cwd(), 'public/firebase-messaging-sw.js');
const swContent = readFileSync(swPath, 'utf-8');

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

let updatedContent = swContent;
Object.entries(config).forEach(([key, value]) => {
  updatedContent = updatedContent.replace(
    new RegExp(`{{${key}}}`, 'g'),
    value || ''
  );
});

writeFileSync(swPath, updatedContent);
console.log('✅ Service Worker config injected');
```

**选项 B：手动替换（临时方案）**

直接编辑 `public/firebase-messaging-sw.js`，将占位符替换为实际值：

```javascript
const firebaseConfig = {
  apiKey: 'AIzaSyAPqg8bUXs7KuN1_aofBE8yLNRHGL-WwHc',
  authDomain: 'cigar-56871.firebaseapp.com',
  projectId: 'cigar-56871',
  storageBucket: 'cigar-56871.firebasestorage.app',
  messagingSenderId: '866808564072',
  appId: '1:866808564072:web:54021622fc7fc9a8b22edd'
};
```

---

## 步骤 6: 测试推送通知

### 6.1 本地测试

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 打开浏览器，访问应用（确保使用 HTTPS 或 localhost）

3. 登录用户账户

4. 进入 **个人中心** > 点击 **编辑资料**

5. 滚动到 **偏好设置** 卡片

6. 找到 **推送通知设置** 部分

7. 点击 **立即开启** 按钮

8. 浏览器会弹出权限请求，点击 **允许**

9. 验证：
   - ✅ 通知权限状态变为 "已授予"
   - ✅ FCM Token 已保存到 Firestore
   - ✅ 推送通知开关可以正常切换

### 6.2 测试发送推送（管理员端）

**方法 1：使用 Firebase Console**

1. 进入 Firebase Console > **Cloud Messaging**
2. 点击 **发送测试消息**（Send test message）
3. 输入 FCM Token（从 Firestore 获取）
4. 输入标题和内容
5. 点击 **测试**

**方法 2：使用 Netlify Function（需要先实现管理员界面）**

调用 `/api/send-notification` 端点：

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试通知",
    "body": "这是一条测试推送通知",
    "type": "system",
    "targetUsers": ["userId1", "userId2"]
  }'
```

### 6.3 验证推送接收

1. **前台测试**（应用打开时）：
   - 应用应该显示 Toast 通知

2. **后台测试**（应用关闭或最小化）：
   - 系统通知栏应该显示推送通知
   - 点击通知应该打开应用

---

## 🔧 故障排查

### 问题 1: "Messaging not available or VAPID key missing"

**原因：** VAPID 密钥未配置或配置错误

**解决方案：**
1. 检查 `.env.local` 文件是否存在 `VITE_FCM_VAPID_KEY`
2. 确保值正确（没有多余空格）
3. 重启开发服务器

### 问题 2: "Notification permission not granted"

**原因：** 用户拒绝了通知权限

**解决方案：**
1. 在浏览器设置中手动开启通知权限
2. Chrome: 设置 > 隐私和安全 > 网站设置 > 通知
3. 刷新页面后重试

### 问题 3: "Failed to initialize Firebase Admin"

**原因：** Netlify Functions 中 Service Account 配置错误

**解决方案：**
1. 检查 Netlify 环境变量 `FIREBASE_SERVICE_ACCOUNT` 是否正确
2. 确保 JSON 格式正确（单行字符串）
3. 重新部署 Netlify Functions

### 问题 4: Service Worker 未注册

**原因：** Service Worker 文件路径错误或配置问题

**解决方案：**
1. 检查 `public/firebase-messaging-sw.js` 是否存在
2. 确保 Firebase 配置已正确注入
3. 检查浏览器控制台错误信息

---

## 📝 检查清单

完成配置后，请确认以下项目：

- [ ] ✅ `@netlify/functions` 已安装
- [ ] ✅ VAPID 密钥已获取并配置到环境变量
- [ ] ✅ `.env.local` 文件包含 `VITE_FCM_VAPID_KEY`
- [ ] ✅ Netlify 环境变量包含 `VITE_FCM_VAPID_KEY`
- [ ] ✅ Firebase Service Account JSON 已配置到 Netlify
- [ ] ✅ Service Worker 配置已更新（Firebase 配置已注入）
- [ ] ✅ 本地测试：通知权限可以正常请求
- [ ] ✅ 本地测试：FCM Token 已保存到 Firestore
- [ ] ✅ 推送通知可以正常接收（前台和后台）

---

## 🚀 下一步

配置完成后，您可以：

1. **实现管理员推送界面**：创建管理员后台页面，用于发送推送通知
2. **添加推送历史记录**：记录所有发送的推送通知
3. **实现主题订阅**：支持用户订阅特定主题（如 VIP 用户、活动通知等）
4. **优化推送策略**：根据用户偏好和勿扰时段智能发送推送

---

## 📚 参考资源

- [Firebase Cloud Messaging 文档](https://firebase.google.com/docs/cloud-messaging)
- [Netlify Functions 文档](https://docs.netlify.com/functions/overview/)
- [Web Push API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

