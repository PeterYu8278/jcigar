# Gemini API Key 权限检查指南

## 📋 检查清单

### 步骤 1: 验证 API Key 是否存在

1. **检查项目中的 .env 文件**
   - 打开项目根目录的 `.env` 文件
   - 查找 `VITE_GEMINI_API_KEY=`
   - 确保值不是 `your_gemini_api_key_here` 或空值

2. **运行检查命令**
   ```bash
   npm run check-gemini
   ```

---

### 步骤 2: 确认 API Key 来源

Gemini API Key 可以从两个地方获取：

#### 选项 A: Google AI Studio (推荐，更简单)
- 网址：https://aistudio.google.com/app/apikey
- 特点：开箱即用，无需额外配置
- 适合：快速开发和测试

#### 选项 B: Google Cloud Console
- 网址：https://console.cloud.google.com/
- 特点：需要启用 API 和配置权限
- 适合：生产环境和企业使用

---

### 步骤 3: 检查 Google Cloud Console 中的 API Key 权限

如果你使用的是 Google Cloud Console 的 API Key，请按以下步骤检查：

#### 3.1 访问 API 凭证页面

1. 打开浏览器，访问：https://console.cloud.google.com/apis/credentials
2. 确保选择了正确的项目（右上角项目选择器）
3. 在 "API 密钥" 列表中，找到你的 API Key

#### 3.2 检查 API 限制

1. **点击你的 API Key** 进入详情页面

2. **查看 "API 限制" 部分**，有两种设置：

   **选项 1: "不限制密钥"**
   - ✅ 如果选择此选项，API Key 可以访问所有已启用的 API
   - 需要确保 "Generative Language API" 已启用

   **选项 2: "限制密钥"**
   - ⚠️ 如果选择此选项，需要确保 "Generative Language API" 在允许列表中
   - 点击 "限制密钥" 后，在 "选择 API" 列表中查找：
     - ✅ "Generative Language API" 必须被选中
     - ✅ 或者选择 "不限制密钥"

#### 3.3 检查已启用的 API

1. 访问：https://console.cloud.google.com/apis/library
2. 在搜索框中输入：**Generative Language API**
3. 点击搜索结果中的 "Generative Language API"
4. 检查页面顶部是否显示 **"已启用"** 或 **"ENABLED"**
   - ✅ 如果已启用，继续下一步
   - ❌ 如果未启用，点击 **"启用"** 或 **"ENABLE"** 按钮

---

### 步骤 4: 验证 API Key 是否有效

运行测试命令：

```bash
npm run test-gemini
```

这个命令会：
- 检查 API Key 配置
- 测试多个模型
- 显示哪个模型可用
- 提供详细的错误信息

---

### 步骤 5: 常见问题排查

#### 问题 1: 所有模型都返回 404

**可能原因：**
- API Key 没有访问 Generative Language API 的权限
- API Key 来自 Google AI Studio，但项目配置不正确

**解决方法：**
1. 如果使用 Google Cloud Console 的 API Key：
   - 确保 "Generative Language API" 已启用
   - 确保 API Key 的 "API 限制" 中包含 "Generative Language API"

2. 如果使用 Google AI Studio 的 API Key：
   - 确保 API Key 格式正确（以 `AIza` 开头）
   - 尝试重新生成 API Key

#### 问题 2: 返回 403 权限错误

**可能原因：**
- API Key 被限制，但没有包含 Generative Language API
- API Key 已过期或被撤销

**解决方法：**
1. 检查 API Key 的 "API 限制" 设置
2. 确保 "Generative Language API" 在允许列表中
3. 或者将限制改为 "不限制密钥"

#### 问题 3: 返回 401 未授权错误

**可能原因：**
- API Key 无效或已过期
- API Key 格式不正确

**解决方法：**
1. 访问 https://aistudio.google.com/app/apikey
2. 重新生成 API Key
3. 更新 .env 文件中的 `VITE_GEMINI_API_KEY`

---

### 步骤 6: 推荐的 API Key 配置

#### 对于开发环境（推荐）

1. **使用 Google AI Studio API Key**
   - 访问：https://aistudio.google.com/app/apikey
   - 创建新的 API Key
   - 直接使用，无需额外配置

2. **配置 .env 文件**
   ```env
   VITE_GEMINI_API_KEY=AIzaSy...你的API密钥
   ```

#### 对于生产环境

1. **使用 Google Cloud Console API Key**
   - 访问：https://console.cloud.google.com/apis/credentials
   - 创建新的 API Key
   - 设置 "API 限制" 为 "限制密钥"
   - 只选择 "Generative Language API"

2. **设置应用限制（可选但推荐）**
   - 在 API Key 详情页面
   - 设置 "应用限制"
   - 选择 "HTTP 引荐来源网址"
   - 添加你的域名（如：`https://yourdomain.com/*`）

---

### 步骤 7: 验证配置

运行以下命令验证配置：

```bash
# 检查 API Key 配置
npm run check-gemini

# 测试 API Key 和可用模型
npm run test-gemini
```

---

## 🔗 有用的链接

- **Google AI Studio**: https://aistudio.google.com/app/apikey
- **Google Cloud Console API 凭证**: https://console.cloud.google.com/apis/credentials
- **API 库（启用 API）**: https://console.cloud.google.com/apis/library
- **Generative Language API**: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
- **Gemini API 文档**: https://ai.google.dev/docs

---

## 📝 快速检查清单

- [ ] `.env` 文件中配置了 `VITE_GEMINI_API_KEY`
- [ ] API Key 不是占位符或空值
- [ ] API Key 格式正确（以 `AIza` 开头）
- [ ] Generative Language API 已启用
- [ ] API Key 有访问 Generative Language API 的权限
- [ ] 运行 `npm run test-gemini` 测试成功

---

## 🆘 仍然遇到问题？

如果按照以上步骤操作后仍然遇到问题，请检查：

1. **浏览器控制台错误信息**
   - 打开浏览器开发者工具（F12）
   - 查看 Console 标签页
   - 查找详细的错误信息

2. **网络请求详情**
   - 在 Network 标签页中查找失败的请求
   - 查看请求的 URL 和响应状态码
   - 检查响应体中的错误信息

3. **API Key 状态**
   - 访问 Google Cloud Console
   - 检查 API Key 是否被禁用
   - 检查是否有配额限制


