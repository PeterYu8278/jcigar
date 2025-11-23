# Netlify Functions 查看和管理指南

## 📋 如何查看 Netlify Functions

### 方法 1: 通过 Netlify Dashboard（图形界面）

#### 步骤 1: 访问 Netlify Dashboard

1. **打开浏览器，访问：**
   ```
   https://app.netlify.com
   ```

2. **登录您的账户**

3. **选择您的站点**
   - 从站点列表中选择您的站点
   - 点击站点名称进入站点管理页面

#### 步骤 2: 进入 Functions 页面

**路径：** 站点页面左侧菜单 > **Functions**

或者直接访问：
```
https://app.netlify.com/sites/[your-site-name]/functions
```

**替换 `[your-site-name]` 为您的实际站点名称**

#### 步骤 3: 查看 Functions 列表

在 Functions 页面，您应该看到：

| Function 名称 | 状态 | 说明 |
|--------------|------|------|
| `save-token` | ✅ Active | 保存 FCM Token |
| `send-notification` | ✅ Active | 发送推送通知 |
| `subscribe-topic` | ✅ Active | 主题订阅/取消订阅 |

---

### 方法 2: 查看 Functions 日志

#### 步骤 1: 进入 Functions 页面（同上）

#### 步骤 2: 点击 Function 名称

点击任何一个 Function 名称（如 `save-token`）进入详情页面。

#### 步骤 3: 查看日志

在 Function 详情页面，您会看到：

1. **Function 信息**
   - Function 名称
   - 文件路径：`netlify/functions/[function-name].ts`
   - 运行时间统计
   - 调用次数统计

2. **实时日志（Logs）**
   - 点击 **"Logs"** 标签
   - 查看最近的执行日志
   - 包括成功和失败的调用记录

3. **调用历史**
   - 最近调用的时间戳
   - 请求状态（成功/失败）
   - 响应时间

---

### 方法 3: 通过 Netlify CLI（命令行）

#### 步骤 1: 安装 Netlify CLI

```bash
npm install -g netlify-cli
```

#### 步骤 2: 登录 Netlify

```bash
netlify login
```

#### 步骤 3: 查看 Functions 列表

```bash
netlify functions:list
```

#### 步骤 4: 查看 Functions 日志

```bash
# 查看所有 Functions 的日志
netlify functions:log

# 查看特定 Function 的日志
netlify functions:log save-token
netlify functions:log send-notification
netlify functions:log subscribe-topic
```

#### 步骤 5: 本地测试 Functions

```bash
# 启动本地开发服务器（包括 Functions）
netlify dev

# Functions 将在以下地址可用：
# http://localhost:8888/.netlify/functions/save-token
# http://localhost:8888/.netlify/functions/send-notification
# http://localhost:8888/.netlify/functions/subscribe-topic
```

---

### 方法 4: 查看 Functions 源代码（本地）

#### 步骤 1: 查看 Functions 文件位置

Functions 源代码位于：
```
netlify/functions/
├── save-token.ts
├── send-notification.ts
└── subscribe-topic.ts
```

#### 步骤 2: 在代码编辑器中打开

直接在您的代码编辑器中打开这些文件：
- `netlify/functions/save-token.ts`
- `netlify/functions/send-notification.ts`
- `netlify/functions/subscribe-topic.ts`

---

## 🔍 Functions 详情说明

### save-token Function

**路径：** `/.netlify/functions/save-token`

**功能：** 保存用户的 FCM Token 到 Firestore

**请求方法：** POST

**请求体示例：**
```json
{
  "token": "fcm-token-string",
  "userId": "user-id-123",
  "deviceInfo": {
    "platform": "Windows",
    "userAgent": "Mozilla/5.0...",
    "language": "en"
  }
}
```

**响应示例：**
```json
{
  "success": true
}
```

---

### send-notification Function

**路径：** `/.netlify/functions/send-notification`

**功能：** 发送推送通知到指定用户或主题

**请求方法：** POST

**请求体示例：**
```json
{
  "title": "通知标题",
  "body": "通知内容",
  "type": "system",
  "targetUsers": ["userId1", "userId2"],
  "targetTopics": ["vip-users"],
  "data": {
    "customKey": "customValue"
  },
  "clickAction": "/events"
}
```

**响应示例：**
```json
{
  "success": true,
  "results": {
    "total": 100,
    "sent": 95,
    "failed": 5
  }
}
```

---

### subscribe-topic Function

**路径：** `/.netlify/functions/subscribe-topic`

**功能：** 订阅或取消订阅 FCM 主题

**请求方法：** POST

**请求体示例：**
```json
{
  "token": "fcm-token-string",
  "topic": "vip-users",
  "action": "subscribe"
}
```

**响应示例：**
```json
{
  "success": true,
  "action": "subscribe",
  "topic": "vip-users"
}
```

---

## 🧪 测试 Functions

### 方法 1: 使用 curl（命令行）

#### 测试 save-token

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

#### 测试 send-notification

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

#### 测试 subscribe-topic

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/subscribe-topic \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-token-123",
    "topic": "vip-users",
    "action": "subscribe"
  }'
```

---

### 方法 2: 使用浏览器开发者工具

1. **打开浏览器开发者工具**（F12）

2. **进入 Console 标签**

3. **运行以下代码测试：**

```javascript
// 测试 save-token
fetch('/.netlify/functions/save-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: 'test-token-123',
    userId: 'test-user-id',
    deviceInfo: {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language
    }
  })
})
.then(res => res.json())
.then(data => console.log('save-token response:', data))
.catch(err => console.error('Error:', err));
```

---

### 方法 3: 使用 Postman 或类似工具

1. **创建新请求**

2. **设置请求方法：** POST

3. **设置 URL：**
   ```
   https://your-site.netlify.app/.netlify/functions/save-token
   ```

4. **设置 Headers：**
   ```
   Content-Type: application/json
   ```

5. **设置 Body（raw JSON）：**
   ```json
   {
     "token": "test-token-123",
     "userId": "test-user-id",
     "deviceInfo": {
       "platform": "Windows",
       "userAgent": "test-agent",
       "language": "en"
     }
   }
   ```

6. **发送请求**

---

## 🔧 查看 Functions 日志

### 通过 Netlify Dashboard 查看日志

1. **访问 Functions 页面**（见方法 1）

2. **点击 Function 名称**（如 `save-token`）

3. **点击 "Logs" 标签**

4. **查看日志内容**：
   - 时间戳
   - 日志级别（info/warn/error）
   - 日志消息
   - 请求信息

### 日志类型

**成功日志示例：**
```
[info] save-token function invoked
[info] Token saved successfully for user: userId123
[info] Function completed in 234ms
```

**错误日志示例：**
```
[error] Failed to save token: Error message
[error] FIREBASE_SERVICE_ACCOUNT not configured
[error] Function failed after 123ms
```

---

## ⚠️ 常见问题排查

### 问题 1: Functions 未显示在列表中

**可能原因：**
1. Functions 文件未部署
2. 文件路径不正确
3. 构建失败

**解决方案：**
1. 检查 `netlify/functions/` 目录中的文件是否存在
2. 检查 Netlify 部署日志，确认构建成功
3. 确认文件扩展名为 `.ts`（TypeScript）或 `.js`（JavaScript）

### 问题 2: Functions 显示错误状态

**可能原因：**
1. 环境变量未配置
2. 依赖未安装
3. 代码错误

**解决方案：**
1. 检查 Netlify 环境变量是否已配置
2. 查看 Functions 日志了解具体错误
3. 检查 `package.json` 是否包含必要依赖

### 问题 3: Functions 日志为空

**可能原因：**
1. Function 未被调用
2. 日志级别过滤
3. 日志未启用

**解决方案：**
1. 尝试调用 Function 触发日志
2. 检查日志筛选器设置
3. 确认日志功能已启用

---

## 📊 Functions 监控和统计

### 在 Netlify Dashboard 中查看统计

1. **进入 Functions 页面**
2. **查看概览信息：**
   - 总调用次数
   - 平均响应时间
   - 错误率
   - 成功率

3. **查看单个 Function 的统计：**
   - 点击 Function 名称
   - 查看详细统计数据

---

## 🔗 快速链接

### Netlify Dashboard 链接格式

```
https://app.netlify.com/sites/[your-site-name]/functions
https://app.netlify.com/sites/[your-site-name]/functions/[function-name]
https://app.netlify.com/sites/[your-site-name]/functions/[function-name]/logs
```

**替换 `[your-site-name]` 和 `[function-name]` 为实际值**

---

## ✅ 检查清单

完成 Functions 检查后，请确认：

- [ ] ✅ Functions 列表显示所有 3 个 Functions
- [ ] ✅ 每个 Function 状态为 "Active"
- [ ] ✅ 可以查看 Functions 日志
- [ ] ✅ 环境变量已正确配置
- [ ] ✅ Functions 可以正常调用（测试后）

---

## 📚 相关文档

- **Netlify Functions 官方文档：** https://docs.netlify.com/functions/overview/
- **Netlify Functions 日志：** https://docs.netlify.com/functions/logs/
- **本地开发 Functions：** https://docs.netlify.com/functions/local-development/

