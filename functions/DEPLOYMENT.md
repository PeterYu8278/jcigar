# Cloud Functions 部署指南

## ✅ 前置检查清单

在部署之前，请确保完成以下步骤：

- [x] Cloud Functions 代码已创建
- [x] 依赖已安装 (`npm install`)
- [x] TypeScript 代码已编译 (`npm run build`)
- [ ] Firebase CLI 已安装
- [ ] 已登录 Firebase
- [ ] 已选择正确的 Firebase 项目

---

## 🚀 部署步骤

### 步骤 1: 安装 Firebase CLI（如未安装）

```bash
npm install -g firebase-tools
```

### 步骤 2: 登录 Firebase

```bash
firebase login
```

浏览器会自动打开，请使用您的 Google 账号登录。

**如果登录失败**，请使用：
```bash
firebase login --reauth
```

### 步骤 3: 选择 Firebase 项目

```bash
firebase use jcigar-c0e54
```

**验证项目**：
```bash
firebase projects:list
```

应该能看到 `jcigar-c0e54` 项目。

### 步骤 4: 安装 Functions 依赖

```bash
cd functions
npm install
```

### 步骤 5: 构建代码

```bash
npm run build
```

应该会生成 `lib/` 目录。

### 步骤 6: 部署 Cloud Functions

**部署所有函数**：
```bash
# 在项目根目录执行
firebase deploy --only functions
```

**或者从 functions 目录执行**：
```bash
cd functions
npm run deploy
```

**部署特定函数**（可选）：
```bash
firebase deploy --only functions:sendNotification
firebase deploy --only functions:onReloadVerified
firebase deploy --only functions:sendEventReminders
```

---

## 📋 部署输出示例

部署成功后，您应该看到类似以下的输出：

```
✔  functions[sendNotification(us-central1)] Successful create operation.
✔  functions[onReloadVerified(us-central1)] Successful create operation.
✔  functions[sendEventReminders(us-central1)] Successful create operation.

Function URLs:
  sendNotification: https://us-central1-jcigar-c0e54.cloudfunctions.net/sendNotification
```

---

## ✅ 验证部署

### 方法 1: 检查 Firebase Console

1. 访问 [Firebase Console](https://console.firebase.google.com/project/jcigar-c0e54/functions)
2. 进入 **Functions** 标签
3. 应该能看到三个函数：
   - `sendNotification`
   - `onReloadVerified`
   - `sendEventReminders`

### 方法 2: 检查日志

```bash
firebase functions:log
```

应该能看到函数已部署的日志。

### 方法 3: 测试前端调用

1. 访问应用的个人中心
2. 进入通知设置
3. 点击"发送测试通知"
4. 应该能收到推送通知

---

## 🧪 测试部署的功能

### 测试 1: 充值验证通知

1. **创建充值记录**
   - 访问 `/reload` 页面
   - 创建一个充值记录

2. **验证充值记录**
   - 访问 `/admin/points-config` → 充值验证标签
   - 验证刚才创建的充值记录
   - 状态从 `pending` 变为 `completed`

3. **检查通知**
   - 应该自动收到推送通知："💰 充值成功"
   - 检查浏览器通知或系统通知

### 测试 2: 手动发送通知

1. **访问通知设置**
   - 访问 `/profile` → 通知设置
   - 点击"发送测试通知"按钮

2. **检查通知**
   - 应该立即收到测试通知

### 测试 3: 活动提醒（需等待）

活动提醒是定时任务，每天上午 9 点运行。

要立即测试，可以：
1. 创建一个明天开始的活动
2. 通过 Firebase Console 手动触发函数

---

## 🐛 常见问题

### Q1: 部署失败 - 认证错误

**错误信息：**
```
Error: Failed to get Firebase project jcigar-c0e54. Please make sure the project exists and your account has permission to access it.
```

**解决方案：**
```bash
firebase login --reauth
firebase use jcigar-c0e54
```

### Q2: 部署失败 - 权限不足

**错误信息：**
```
Error: HTTP Error: 403, Permission denied
```

**解决方案：**
- 确认您的账号是 Firebase 项目的管理员
- 检查 Firebase 项目的 IAM 设置

### Q3: 函数调用失败 - 未找到函数

**错误信息：**
```
functions/not-found
```

**解决方案：**
- 确认函数已成功部署
- 检查函数名称是否正确
- 等待几分钟后重试（函数可能需要时间激活）

### Q4: 通知发送失败 - 无效令牌

**错误信息：**
```
messaging/invalid-registration-token
```

**解决方案：**
- 这是正常的，无效的令牌会自动标记为失效
- 用户需要重新启用通知权限

### Q5: 定时任务不运行

**解决方案：**
- 确认函数已部署
- 检查时区设置（Asia/Kuala_Lumpur）
- 等待第二天上午 9 点
- 或通过 Firebase Console 手动触发

---

## 📊 监控和日志

### 查看实时日志

```bash
firebase functions:log
```

### 查看特定函数的日志

```bash
firebase functions:log --only sendNotification
```

### 在 Firebase Console 查看

1. 访问 [Firebase Console](https://console.firebase.google.com/project/jcigar-c0e54/functions/logs)
2. 选择函数
3. 查看日志和指标

---

## 🔄 更新函数

如果修改了函数代码：

```bash
# 1. 重新构建
cd functions
npm run build

# 2. 重新部署
npm run deploy
```

---

## 💰 成本考虑

Cloud Functions 的计费：
- **调用次数**：前 200 万次/月免费
- **计算时间**：前 40,000 GB-秒/月免费
- **网络出站**：前 5 GB/月免费

对于中小型应用，免费额度通常足够使用。

---

## 📚 相关文档

- [Firebase Cloud Functions 文档](https://firebase.google.com/docs/functions)
- [部署和监控指南](https://firebase.google.com/docs/functions/manage-functions)
- [Functions README](./README.md)

