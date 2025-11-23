# FCM 推送通知 - 快速开始指南

## 🚀 5 分钟快速配置

### 步骤 1: 获取 VAPID 密钥（2 分钟）

1. 访问：https://console.firebase.google.com/project/cigar-56871/settings/cloudmessaging
2. 滚动到 **Web 推送证书** 部分
3. 如果没有密钥对，点击 **生成密钥对**
4. 复制生成的公钥（VAPID Key）

### 步骤 2: 配置本地环境变量（1 分钟）

创建或编辑 `.env.local` 文件：

```env
VITE_FCM_VAPID_KEY=粘贴你的VAPID密钥
```

### 步骤 3: 运行配置检查（1 分钟）

```bash
npm run check-fcm
```

### 步骤 4: 测试推送通知（1 分钟）

```bash
npm run dev
```

1. 打开浏览器访问应用
2. 登录后进入 **个人中心** > **编辑资料**
3. 在 **偏好设置** 中点击 **立即开启** 推送通知
4. 允许浏览器通知权限

---

## ✅ 配置检查清单

运行 `npm run check-fcm` 后，确保所有项目都显示 ✅：

- [ ] VITE_FCM_VAPID_KEY 已配置
- [ ] Service Worker 文件存在
- [ ] Netlify Functions 文件存在
- [ ] @netlify/functions 依赖已安装

---

## 🔧 常见问题

### Q: VAPID 密钥在哪里？

**A:** Firebase Console > 项目设置 > Cloud Messaging > Web 推送证书

### Q: 如何测试推送通知？

**A:** 
1. 本地测试：使用 Firebase Console 的"发送测试消息"功能
2. 生产测试：部署后调用 Netlify Function `/api/send-notification`

### Q: Service Worker 配置未注入？

**A:** 运行 `npm run build` 会自动注入配置，或手动运行：
```bash
node scripts/inject-sw-config.js
```

---

## 📚 详细文档

完整配置指南请参考：`docs/FCM_SETUP_GUIDE.md`

