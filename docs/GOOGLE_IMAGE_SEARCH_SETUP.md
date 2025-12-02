# Google Image Search 配置指南

## 系统如何获取环境变量

系统通过 Vite 的 `import.meta.env` 来读取环境变量：

```typescript
// src/services/gemini/googleImageSearch.ts
const GOOGLE_SEARCH_API_KEY = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY || '';
const GOOGLE_SEARCH_ENGINE_ID = import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID || '';
```

### 工作原理

1. **Vite 环境变量规则**：
   - 只有以 `VITE_` 开头的环境变量才会被暴露到客户端代码
   - 在构建时，Vite 会将环境变量注入到 `import.meta.env` 中
   - 环境变量会被静态替换，不会出现在最终打包的代码中

2. **读取时机**：
   - 在模块加载时读取（文件顶部）
   - 如果环境变量未设置，使用空字符串作为默认值

3. **检查机制**：
   ```typescript
   if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
       console.warn('[GoogleImageSearch] ⚠️ Google Search API 未配置，跳过 Google 图片搜索');
       return [];
   }
   ```

## 配置步骤

### 1. 获取 Google Custom Search API Key

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建或选择一个项目
3. 启用 **Custom Search API**：
   - 导航到 "APIs & Services" > "Library"
   - 搜索 "Custom Search API"
   - 点击 "Enable"
4. 创建 API Key：
   - 导航到 "APIs & Services" > "Credentials"
   - 点击 "Create Credentials" > "API Key"
   - 复制生成的 API Key

### 2. 创建自定义搜索引擎并获取 Search Engine ID

1. 访问 [Google Programmable Search Engine](https://programmablesearchengine.google.com/controlpanel/create)
2. 创建新的搜索引擎：
   - **要搜索的网站**：选择 "Search the entire web"（搜索整个网络）
   - **搜索引擎名称**：例如 "Cigar Image Search"
   - 点击 "Create"
3. 获取 Search Engine ID：
   - 创建后，进入搜索引擎控制面板
   - 在 "Setup" > "Basics" 中可以看到 **Search engine ID**
   - 复制这个 ID（格式类似：`017576662512468239146:omuauf_lfve`）

#### ⚠️ 关于 Query Enhancement（查询增强）

**建议：不需要启用 Query Enhancement**

原因：
- 当前代码已经在查询中**手动添加**了优化关键词：`cigar band label product image`
- 如果同时启用 Query Enhancement，会导致关键词重复，可能影响搜索结果质量
- 代码中的手动添加更灵活，可以根据不同场景动态调整

**如果您想使用 Query Enhancement：**
1. 在 CSE 控制面板中：**Setup** > **Advanced** > **Query Enhancement**
2. 启用并添加关键词（如：`cigar band label product image`）
3. **同时需要修改代码**，移除手动添加的关键词：
   ```typescript
   // 修改前
   const searchQuery = `${query} cigar band label product image`;
   
   // 修改后（使用 Query Enhancement）
   const searchQuery = query;
   ```

**推荐方案**：保持当前实现（代码中手动添加关键词），不启用 Query Enhancement，这样可以：
- 更灵活地控制搜索查询
- 避免关键词重复
- 更容易调试和优化

### 3. 配置环境变量

#### 本地开发环境

在项目根目录创建 `.env` 文件（如果不存在）：

```env
# Google Custom Search API 配置
VITE_GOOGLE_SEARCH_API_KEY=your_api_key_here
VITE_GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

**重要提示**：
- `.env` 文件应该添加到 `.gitignore` 中，不要提交到 Git
- 使用 `.env.example` 作为模板（不包含真实密钥）

#### Netlify 生产环境

1. 登录 [Netlify Dashboard](https://app.netlify.com/)
2. 选择你的站点
3. 进入 "Site settings" > "Environment variables"
4. 添加以下环境变量：
   - **Key**: `VITE_GOOGLE_SEARCH_API_KEY`
   - **Value**: 你的 API Key
   - **Key**: `VITE_GOOGLE_SEARCH_ENGINE_ID`
   - **Value**: 你的 Search Engine ID
5. 点击 "Save"
6. **重新部署**站点以使环境变量生效

### 4. 验证配置

配置完成后，重启开发服务器：

```bash
npm run dev
```

在浏览器控制台中，当使用图片搜索功能时，应该看到：
- ✅ 如果配置正确：`[GoogleImageSearch] 🔍 搜索图片: "..."`
- ⚠️ 如果未配置：`[GoogleImageSearch] ⚠️ Google Search API 未配置，跳过 Google 图片搜索`

## 环境变量优先级

1. **本地开发**：`.env` 文件中的值
2. **Netlify 构建**：Netlify 环境变量中的值（构建时注入）
3. **默认值**：空字符串（功能将被禁用）

## 调试技巧

### 检查环境变量是否被正确读取

在浏览器控制台运行：

```javascript
console.log('API Key:', import.meta.env.VITE_GOOGLE_SEARCH_API_KEY);
console.log('Engine ID:', import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID);
```

**注意**：在生产环境中，未使用的环境变量可能被 Vite 优化掉，所以可能显示 `undefined`。这是正常的，只要功能正常工作即可。

### 检查网络请求

在浏览器开发者工具的 Network 标签中，搜索图片时会看到对 Google Custom Search API 的请求：
```
https://www.googleapis.com/customsearch/v1?key=...&cx=...&q=...
```

## 常见问题

### Q: 为什么环境变量读取不到？

A: 检查以下几点：
1. 环境变量名必须以 `VITE_` 开头
2. 修改 `.env` 文件后需要重启开发服务器
3. 在 Netlify 中，需要重新部署才能应用新的环境变量
4. 确保 `.env` 文件在项目根目录

### Q: 如何限制 API 使用量？

A: 在 Google Cloud Console 中：
1. 导航到 "APIs & Services" > "Quotas"
2. 找到 "Custom Search API"
3. 设置每日配额限制

### Q: Search Engine ID 在哪里找到？

A: 
1. 访问 [Programmable Search Engine 控制面板](https://programmablesearchengine.google.com/controlpanel/all)
2. 选择你的搜索引擎
3. 在 "Setup" > "Basics" 中查看 "Search engine ID"

### Q: 免费配额是多少？

A: Google Custom Search API 提供：
- 每天 100 次免费搜索请求
- 超出后需要付费

## 安全提示

⚠️ **重要**：
- 不要将 API Key 提交到 Git 仓库
- 在 Netlify 中，考虑设置 API Key 限制（只允许特定域名使用）
- 定期轮换 API Key
- 监控 API 使用情况，防止滥用

