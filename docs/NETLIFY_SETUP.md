# Netlify 环境变量配置指南

## 📋 当前本地配置状态

✅ **已配置（本地）：**
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FCM_VAPID_KEY: `BEXwGXQG62AeyuF...`

---

## 🚀 配置 Netlify 环境变量（3 步）

### 步骤 1: 访问 Netlify Dashboard

1. 打开浏览器，访问：https://app.netlify.com
2. 登录您的账户
3. 选择您的站点（例如：`your-site.netlify.app`）

### 步骤 2: 添加环境变量

1. 点击左侧菜单的 **Site settings**
2. 滚动到 **Build & deploy** 部分
3. 点击 **Environment variables**
4. 点击右上角的 **Add a variable** 按钮

### 步骤 3: 添加以下环境变量

按顺序添加以下变量（从 `.env.local` 复制值）：

#### 变量 1: VITE_FCM_VAPID_KEY

| 字段 | 值 |
|------|-----|
| **Key** | `VITE_FCM_VAPID_KEY` |
| **Value** | `BEXwGXQG62AeyuF6c-C60vsMp27dYYByg7PGxzdISldmXloqLbWn49ydI3yd_35L4AQ6kA0TPGoJ7q9evZUpFrM` |
| **Scopes** | 选择 "All scopes"（或根据需要选择） |

#### 变量 2: FIREBASE_SERVICE_ACCOUNT（用于 Netlify Functions）

需要先获取 Firebase Service Account JSON：

**2.1 获取 Service Account JSON：**
1. 访问：https://console.firebase.google.com/project/cigar-56871/settings/serviceaccounts/adminsdk
2. 点击 **"生成新的私钥"**（Generate new private key）
3. 确认对话框，点击 **"生成密钥"**（Generate key）
4. 浏览器会自动下载一个 JSON 文件

**2.2 配置到 Netlify：**
1. 打开下载的 JSON 文件
2. 复制**整个 JSON 内容**（包括所有大括号）
3. 在 Netlify 中添加环境变量：

| 字段 | 值 |
|------|-----|
| **Key** | `FIREBASE_SERVICE_ACCOUNT` |
| **Value** | 粘贴整个 JSON 内容（作为单行字符串） |
| **Scopes** | 选择 "All scopes" |

**⚠️ 重要提示：**
- JSON 内容需要作为**单行字符串**粘贴
- 确保 JSON 格式正确（删除换行符，或使用 `\n` 转义）
- 这是敏感信息，不要提交到 Git

**JSON 示例格式：**
```json
{"type":"service_account","project_id":"cigar-56871","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

---

## ✅ 配置完成检查

添加完所有环境变量后：

1. **刷新 Netlify Dashboard**
2. **确认变量列表**：
   - ✅ `VITE_FCM_VAPID_KEY` 
   - ✅ `FIREBASE_SERVICE_ACCOUNT`

3. **触发重新部署**（可选）：
   - 进入 **Deploys** 标签
   - 点击 **Trigger deploy** > **Clear cache and deploy site**
   - 等待部署完成

---

## 🔍 验证 Netlify Functions

部署完成后，验证 Netlify Functions 是否正常工作：

### 方法 1: 查看 Functions 日志

1. 在 Netlify Dashboard 中，点击左侧菜单的 **Functions**
2. 查看是否有以下函数：
   - ✅ `save-token`
   - ✅ `send-notification`
   - ✅ `subscribe-topic`

### 方法 2: 测试 API 端点（部署后）

```bash
# 测试 save-token 端点
curl -X POST https://your-site.netlify.app/.netlify/functions/save-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-token",
    "userId": "test-user-id",
    "deviceInfo": {
      "platform": "Windows",
      "userAgent": "test",
      "language": "en"
    }
  }'
```

**预期响应：**
```json
{"success": true}
```

---

## 🎯 下一步

配置完 Netlify 环境变量后：

1. ✅ 等待部署完成
2. ✅ 测试推送通知功能（参考测试指南）
3. ✅ 验证 Netlify Functions 工作正常

---

## 🔧 故障排查

### 问题：Netlify Functions 返回 500 错误

**可能原因：**
1. `FIREBASE_SERVICE_ACCOUNT` 格式不正确
2. JSON 内容有换行符或格式错误
3. Service Account 权限不足

**解决方案：**
1. 检查 JSON 是否为单行字符串
2. 验证 Service Account 权限（需要 Cloud Messaging Admin 和 Firestore Database User）
3. 查看 Netlify Functions 日志：**Functions** > **Logs**

### 问题：环境变量未生效

**解决方案：**
1. 清除缓存并重新部署
2. 确认变量名正确（区分大小写）
3. 确认变量作用域正确（选择 "All scopes"）

---

## 📝 快速参考

**必需的环境变量：**
- `VITE_FCM_VAPID_KEY` - FCM VAPID 密钥
- `FIREBASE_SERVICE_ACCOUNT` - Firebase Service Account JSON（用于 Netlify Functions）

**参考文档：**
- 完整配置指南：`docs/FCM_CONFIG_STEPS.md`
- 快速开始：`docs/FCM_QUICK_START.md`

