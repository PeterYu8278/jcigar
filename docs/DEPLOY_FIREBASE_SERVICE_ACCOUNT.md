# 如何部署 FIREBASE_SERVICE_ACCOUNT 到 Netlify

## 📋 概述

`FIREBASE_SERVICE_ACCOUNT` 是用于 Netlify Functions 访问 Firebase 服务的凭证。配置后，可以：
- ✅ 部署 Firestore 索引
- ✅ 重置用户密码
- ✅ 发送 FCM 推送通知
- ✅ 执行其他需要 Firebase Admin SDK 的操作

---

## 🚀 完整部署步骤

### 步骤 1: 获取 Firebase Service Account JSON

1. **访问 Firebase Console**
   - 打开：https://console.firebase.google.com/
   - 选择您的项目（例如：`cigar-56871`）

2. **进入服务账号设置**
   - 点击左上角 **⚙️ 设置图标** > **项目设置**
   - 点击顶部 **"服务账号"** (Service accounts) 标签
   - 确保选择了 **"Node.js"** 标签

3. **生成新的私钥**
   - 滚动到页面底部
   - 点击 **"生成新的私钥"** (Generate new private key) 按钮
   - 在确认对话框中点击 **"生成密钥"** (Generate key)
   - 浏览器会自动下载一个 JSON 文件（例如：`cigar-56871-firebase-adminsdk-xxxxx.json`）

---

### 步骤 2: 格式化 JSON 为单行

Netlify 环境变量输入框**不支持多行 JSON**，需要转换为单行格式。

#### 方法 A: 使用在线工具（推荐）

1. 打开在线 JSON Minifier：
   - https://jsonformatter.org/json-minify
   - 或 https://www.jsonformatter.io/minify

2. 复制下载的 JSON 文件内容
3. 粘贴到工具中，点击 "Minify"
4. 复制输出的单行 JSON

#### 方法 B: 使用命令行（如果已安装 Node.js）

```bash
# 在项目根目录执行
node -e "console.log(JSON.stringify(require('./path/to/service-account.json')))"
```

#### 方法 C: 手动格式化

1. 打开 JSON 文件
2. 使用文本编辑器的"查找替换"功能：
   - 查找：所有换行符（`\n` 或 `\r\n`）
   - 替换：空格或空字符串
3. **重要**：确保 `private_key` 字段中的 `\n` 被保留（在 JSON 字符串内部）

**示例格式：**
```json
{"type":"service_account","project_id":"cigar-56871","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@cigar-56871.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

---

### 步骤 3: 配置 Service Account 权限

**重要**：为了部署 Firestore 索引，Service Account 需要以下权限：

#### 3.1 访问 Google Cloud Console

1. **打开 Google Cloud Console**
   - 访问：https://console.cloud.google.com/
   - **重要**：确保选择了正确的项目
   - 项目 ID 应该与 Firebase Project ID 相同

2. **导航到 IAM 页面**
   - 左侧菜单 → **IAM & Admin** → **IAM**
   - 或直接访问：https://console.cloud.google.com/iam-admin/iam

#### 3.2 找到 Service Account

1. **在 IAM 列表中查找**
   - 搜索框输入 Service Account 邮箱（从 Netlify 环境变量中的 `client_email` 获取）
   - 或查找以 `firebase-adminsdk-` 开头的邮箱
   - 格式：`firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com`

2. **确认找到的 Service Account**
   - 类型：**Service Account**
   - 邮箱：与 Netlify 环境变量中的 `client_email` 一致

#### 3.3 添加所需权限

1. **编辑 Service Account**
   - 在 IAM 列表中，找到您的 Service Account
   - 点击右侧的 **"编辑"** (Edit) 图标（铅笔图标）

2. **添加 "Cloud Datastore Index Admin" 角色（必需）**
   - 点击 **"添加另一个角色"** (Add another role)
   - 在角色搜索框中输入：`Cloud Datastore Index Admin`
   - 从下拉列表中选择：**Cloud Datastore Index Admin**
   - 点击 **"保存"** (Save)
   - **这是部署索引的必需权限**

3. **添加其他推荐权限（可选但推荐）**
   - 重复步骤 2，依次添加以下角色：
     - ✅ **Firebase Admin SDK Administrator Service Agent**（用于其他 Firebase 管理操作）
     - ✅ **Cloud Datastore User**（用于读取和写入 Firestore 数据）

#### 3.4 等待权限生效

- **权限传播时间**：通常需要 1-5 分钟，最多可能需要 10 分钟
- **验证方法**：在 IAM 页面刷新，确认角色已添加到 Service Account

#### 3.5 验证权限配置

1. **在 IAM 页面确认**
   - 找到您的 Service Account
   - 查看角色列表
   - 确认包含：✅ **Cloud Datastore Index Admin**

2. **检查 API 是否启用**
   - 访问：https://console.cloud.google.com/apis/library
   - 搜索 "Cloud Firestore API"
   - 确认状态为 **"已启用"** (Enabled)
   - 如果未启用，点击 **"启用"** (Enable)

---

### 步骤 4: 在 Netlify 中配置环境变量

1. **访问 Netlify Dashboard**
   - 打开：https://app.netlify.com
   - 登录您的账户
   - 选择您的站点

2. **进入环境变量设置**
   - 点击左侧菜单的 **Site settings**
   - 滚动到 **Build & deploy** 部分
   - 点击 **Environment variables**

3. **添加环境变量**
   - 点击右上角的 **Add a variable** 按钮
   - 填写以下信息：

| 字段 | 值 |
|------|-----|
| **Key** | `FIREBASE_SERVICE_ACCOUNT` |
| **Value** | 粘贴格式化后的单行 JSON（从步骤 2） |
| **Scopes** | 选择 **"All scopes"**（或根据需要选择） |

4. **保存**
   - 点击 **Save** 按钮
   - 确认变量已添加到列表中

---

### 步骤 5: 验证配置

#### 验证 1: 检查环境变量

1. 在 Netlify Dashboard 的 Environment variables 页面
2. 确认 `FIREBASE_SERVICE_ACCOUNT` 已存在
3. 点击变量查看值（应该显示为单行 JSON）

#### 验证 2: 触发重新部署

1. 进入 **Deploys** 标签
2. 点击 **Trigger deploy** > **Clear cache and deploy site**
3. 等待部署完成

#### 验证 3: 测试索引部署功能

1. 访问应用的功能管理页面
2. 进入 **环境配置** 标签
3. 填写 Firebase Project ID
4. 点击 **"部署 Firestore 索引"** 按钮
5. 如果配置正确，应该看到部署成功的消息

#### 验证 4: 查看 Functions 日志

1. 在 Netlify Dashboard 中，点击 **Functions** 标签
2. 查看 `deploy-firestore-indexes` 函数的日志
3. 应该没有 "FIREBASE_SERVICE_ACCOUNT not configured" 错误

---

## 🔧 故障排查

### 问题 1: "FIREBASE_SERVICE_ACCOUNT not configured"

**原因：**
- 环境变量未添加
- 变量名拼写错误（区分大小写）
- 变量作用域不正确

**解决方案：**
1. 确认变量名是 `FIREBASE_SERVICE_ACCOUNT`（全大写）
2. 确认变量作用域选择了 "All scopes"
3. 清除缓存并重新部署

### 问题 2: "Invalid FIREBASE_SERVICE_ACCOUNT format"

**原因：**
- JSON 格式不正确
- 包含换行符
- JSON 字符串未正确转义

**解决方案：**
1. 使用 JSON Minifier 工具重新格式化
2. 确保是单行 JSON 字符串
3. 验证 JSON 格式（使用在线 JSON 验证工具）

### 问题 3: "Permission denied" 或 403 错误

**原因：**
- Service Account 权限不足
- 缺少 "Cloud Datastore Index Admin" 角色

**解决方案：**
1. 在 Google Cloud Console 中检查 Service Account 权限
2. 添加 "Cloud Datastore Index Admin" 角色
3. 等待几分钟让权限生效
4. 重新尝试部署

### 问题 4: "Authentication failed" 或 401 错误

**原因：**
- Service Account JSON 内容错误
- 私钥已过期或被删除

**解决方案：**
1. 重新生成 Service Account 密钥
2. 更新 Netlify 环境变量
3. 重新部署

---

## 📝 配置检查清单

完成配置后，请确认：

- [ ] ✅ 已从 Firebase Console 下载 Service Account JSON
- [ ] ✅ JSON 已格式化为单行字符串
- [ ] ✅ Service Account 已添加 "Cloud Datastore Index Admin" 权限
- [ ] ✅ `FIREBASE_SERVICE_ACCOUNT` 环境变量已添加到 Netlify
- [ ] ✅ 变量值格式正确（单行 JSON）
- [ ] ✅ 变量作用域设置为 "All scopes"
- [ ] ✅ 已触发重新部署
- [ ] ✅ Netlify Functions 日志无错误
- [ ] ✅ 索引部署功能测试通过

---

## 🎯 快速参考

**Firebase Console 链接：**
- 服务账号设置：https://console.firebase.google.com/project/YOUR_PROJECT_ID/settings/serviceaccounts/adminsdk

**Google Cloud Console 链接：**
- IAM 权限管理：https://console.cloud.google.com/iam-admin/iam?project=YOUR_PROJECT_ID

**Netlify Dashboard 链接：**
- 环境变量设置：https://app.netlify.com/sites/YOUR_SITE/settings/deploys#environment-variables

**JSON 格式化工具：**
- https://jsonformatter.org/json-minify
- https://www.jsonformatter.io/minify

---

## ⚠️ 安全提示

1. **永远不要**将 Service Account JSON 提交到 Git
2. **永远不要**在公开渠道分享 Service Account 密钥
3. 如果密钥泄露，立即在 Firebase Console 中删除并重新生成
4. 定期轮换 Service Account 密钥（建议每 90 天）
5. 使用最小权限原则，只授予必要的权限

---

## ✅ 配置完成后

配置完成后，您可以：

1. ✅ 在功能管理页面一键部署 Firestore 索引
2. ✅ 使用 Netlify Functions 执行需要 Firebase Admin SDK 的操作
3. ✅ 自动管理 Firestore 索引，无需手动操作

---

## 📚 相关文档

- [Netlify 环境变量配置指南](./NETLIFY_SETUP.md)
- [Netlify Service Account 配置指南](./NETLIFY_SERVICE_ACCOUNT_SETUP.md)
- [Firebase 设置指南](../FIREBASE_SETUP.md)

