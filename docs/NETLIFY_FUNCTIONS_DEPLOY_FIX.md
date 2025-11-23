# Netlify Functions 部署问题修复指南

## ❌ 问题：Deploy Summary 显示 "No functions deployed"

### 可能原因

1. **netlify.toml 配置格式错误**
2. **Functions 目录路径不正确**
3. **TypeScript 文件未被识别**

---

## ✅ 解决方案

### 步骤 1: 修复 netlify.toml 配置

**错误的配置：**
```toml
[build]
  functions = "netlify/functions"  # ❌ 错误格式
```

**正确的配置：**
```toml
[functions]
  directory = "netlify/functions"  # ✅ 正确格式
```

### 步骤 2: 验证 Functions 文件结构

确保 Functions 文件位于：
```
netlify/functions/
├── save-token.ts
├── send-notification.ts
└── subscribe-topic.ts
```

### 步骤 3: 验证 Functions 导出格式

每个 Function 文件必须正确导出 `handler`：

```typescript
import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Function 逻辑
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
```

---

## 🔍 验证配置

### 方法 1: 检查 netlify.toml

确认 `netlify.toml` 包含：

```toml
[functions]
  directory = "netlify/functions"
```

### 方法 2: 本地测试 Functions

使用 Netlify CLI 本地测试：

```bash
# 安装 Netlify CLI（如果未安装）
npm install -g netlify-cli

# 登录 Netlify
netlify login

# 启动本地开发服务器（包括 Functions）
netlify dev
```

Functions 将在以下地址可用：
- `http://localhost:8888/.netlify/functions/save-token`
- `http://localhost:8888/.netlify/functions/send-notification`
- `http://localhost:8888/.netlify/functions/subscribe-topic`

### 方法 3: 检查部署日志

在 Netlify Dashboard 中：
1. 进入 **Deploys** 标签
2. 点击最近的部署
3. 查看构建日志，搜索 "Functions" 相关消息

**成功部署的日志应该显示：**
```
Functions directory set to netlify/functions
Deploying functions
  - save-token
  - send-notification
  - subscribe-topic
```

---

## 🔧 故障排查

### 问题 1: 仍然显示 "No functions deployed"

**检查清单：**
- [ ] ✅ `netlify.toml` 中 `[functions]` 配置正确
- [ ] ✅ Functions 文件在 `netlify/functions/` 目录
- [ ] ✅ 每个文件正确导出 `handler`
- [ ] ✅ `@netlify/functions` 已安装
- [ ] ✅ 文件扩展名为 `.ts` 或 `.js`

**如果仍然不行，尝试：**

1. **清除 Netlify 构建缓存**
   - 在 Netlify Dashboard 中
   - 进入 **Deploys** > **Trigger deploy** > **Clear cache and deploy site**

2. **检查文件是否被 .gitignore 排除**
   - 确保 `netlify/functions/` 目录已提交到 Git

3. **验证文件权限**
   - 确保文件可读

### 问题 2: TypeScript Functions 未编译

Netlify 支持 TypeScript Functions，但可能需要：

1. **确保 TypeScript 已安装**
   ```bash
   npm install --save-dev typescript @types/node
   ```

2. **创建 tsconfig.json for Functions**（如果需要）
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "lib": ["ES2020"],
       "esModuleInterop": true,
       "skipLibCheck": true
     }
   }
   ```

### 问题 3: Functions 部署但无法调用

**检查：**
1. 环境变量是否已配置
2. 查看 Functions 日志中的错误信息
3. 验证 Firebase Service Account 配置

---

## 📋 完整的 netlify.toml 示例

```toml
[build]
  publish = "dist"
  command = "npm run build:fast"

[build.environment]
  NODE_VERSION = "22"

# Functions 配置
[functions]
  directory = "netlify/functions"

# 重定向规则
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# 安全头设置
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    # ... 其他安全头
```

---

## ✅ 修复后验证

修复配置后：

1. **提交更改**
   ```bash
   git add netlify.toml
   git commit -m "fix: 修复 Netlify Functions 配置"
   git push origin main
   ```

2. **等待 Netlify 自动部署**

3. **检查 Deploy Summary**
   - 应该显示：`3 functions deployed`
   - 或显示具体的 Functions 列表

4. **验证 Functions 可用**
   - 访问 Netlify Dashboard > Functions
   - 应该看到 3 个 Functions

---

## 🎯 快速修复步骤

1. ✅ 更新 `netlify.toml`（已修复）
2. ⏳ 提交并推送更改
3. ⏳ 等待 Netlify 重新部署
4. ⏳ 验证 Functions 已部署

---

## 📚 参考资源

- [Netlify Functions 文档](https://docs.netlify.com/functions/overview/)
- [Netlify Functions 配置](https://docs.netlify.com/functions/configuration/)
- [TypeScript Functions](https://docs.netlify.com/functions/typescript/)

