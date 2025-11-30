# Netlify Gemini API Key 配置指南

## 📋 概述

本指南说明如何在 Netlify 中配置 Gemini API Key，以便在生产环境使用 AI 识茄功能。

## 🚀 配置步骤

### 1. 获取 Gemini API Key

1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 登录您的 Google 账户
3. 点击 "Create API Key" 创建新的 API Key
4. 复制生成的 API Key（格式类似: `AIzaSy...`）

⚠️ **重要**: 如果之前的 API Key 已泄露或过期，请创建新 Key 并删除旧 Key。

### 2. 在 Netlify 中配置环境变量

#### 方法 1: 通过 Netlify 控制台（推荐）

1. 登录 [Netlify Dashboard](https://app.netlify.com)
2. 选择您的站点
3. 进入 **Site settings** > **Environment variables**
4. 点击 **Add a variable** 按钮
5. 添加以下变量：
   - **Key**: `VITE_GEMINI_API_KEY`
   - **Value**: 您的 Gemini API Key（例如: `AIzaSy...`）
   - **Scopes**: 选择适用的环境
     - ✅ **All scopes** (推荐) - 所有环境都使用
     - 或分别设置 Production、Deploy previews、Branch deploys

6. 点击 **Save**

#### 方法 2: 通过 netlify.toml（不推荐用于敏感信息）

如果要在代码中管理环境变量（不推荐用于 API Key），可以在 `netlify.toml` 中添加：

```toml
[build.environment]
  VITE_GEMINI_API_KEY = "your-api-key-here"
```

⚠️ **注意**: 这种方式会将 API Key 暴露在代码仓库中，不推荐用于生产环境。

### 3. 重新部署应用

配置环境变量后，需要重新部署应用以使环境变量生效：

1. **自动部署**: 如果启用了自动部署，推送到关联的分支会自动触发部署
2. **手动部署**: 
   - 进入 Netlify 控制台的 **Deploys** 页面
   - 点击 **Trigger deploy** > **Deploy site**

### 4. 验证配置

部署完成后，验证 API Key 是否生效：

1. 访问您的 Netlify 站点
2. 打开 AI 识茄功能
3. 尝试识别一张雪茄图片
4. 如果功能正常，说明配置成功

如果遇到错误，检查浏览器控制台的错误信息。

## 🔍 故障排除

### 问题 1: API Key 未生效

**症状**: 错误提示 "Gemini API Key 未配置"

**解决方案**:
1. 确认环境变量名正确: `VITE_GEMINI_API_KEY`（注意 `VITE_` 前缀）
2. 确认已经重新部署应用
3. 检查环境变量的 Scopes 设置是否正确

### 问题 2: API Key 过期或无效

**症状**: 错误提示 "API key expired" 或 "400 Bad Request"

**解决方案**:
1. 在 Google AI Studio 检查 API Key 状态
2. 如果 Key 已过期或泄露，创建新 Key
3. 在 Netlify 中更新环境变量
4. 重新部署应用

### 问题 3: 环境变量在构建时未注入

**症状**: 构建后的应用仍然无法获取 API Key

**解决方案**:
1. 确认变量名以 `VITE_` 开头（Vite 只暴露以 `VITE_` 开头的环境变量）
2. 检查 Netlify 构建日志，确认环境变量已加载
3. 在构建命令中添加调试输出（仅用于调试）:
   ```bash
   npm run build && echo "API Key configured: ${VITE_GEMINI_API_KEY:0:10}..."
   ```

## 📝 环境变量命名规则

- **必须使用 `VITE_` 前缀**: Vite 构建工具只会将 `VITE_` 开头的环境变量暴露给客户端代码
- **变量名区分大小写**: `VITE_GEMINI_API_KEY` 与 `vite_gemini_api_key` 是不同的变量
- **不要在代码中硬编码**: API Key 应该始终通过环境变量提供

## 🔒 安全建议

1. **不要提交 API Key 到代码仓库**
   - 使用 `.gitignore` 排除 `.env` 文件
   - 不要在代码中硬编码 API Key

2. **定期轮换 API Key**
   - 定期更换 API Key 以提高安全性
   - 如果 Key 泄露，立即删除并创建新 Key

3. **限制 API Key 权限**
   - 在 Google Cloud Console 中配置 API Key 限制
   - 只允许访问 Generative Language API

4. **监控使用情况**
   - 定期检查 API 使用量和费用
   - 设置使用限额和告警

## 📚 相关文档

- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Google AI Studio API Keys](https://aistudio.google.com/app/apikey)

