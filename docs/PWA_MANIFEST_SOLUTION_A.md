# PWA 动态 Manifest 实现 - 方案A

## 📋 概述

方案A使用 **Service Worker 拦截 manifest 请求**的方式实现动态 manifest。当浏览器请求 `/manifest.json` 时，Service Worker 会拦截该请求，从 IndexedDB 读取 `appConfig`，动态生成 manifest 并返回。

## 🏗️ 架构设计

### 工作流程

```
浏览器请求 /manifest.json
        ↓
Service Worker 拦截请求
        ↓
从 IndexedDB 读取 appConfig
        ↓
动态生成 manifest JSON
        ↓
返回给浏览器
```

### 核心组件

1. **Service Worker** (`src/sw.ts`)
   - 拦截 `/manifest.json` 请求
   - 从 IndexedDB 读取 `appConfig`
   - 动态生成 manifest
   - 返回 JSON 响应

2. **IndexedDB 工具** (`src/utils/indexedDB.ts`)
   - 存储 `appConfig` 到 IndexedDB
   - 从 IndexedDB 读取 `appConfig`
   - 在主线程和 Service Worker 之间共享数据

3. **App.tsx**
   - 当 `appConfig` 更新时，存储到 IndexedDB
   - 更新页面标题、meta 标签和图标

4. **Vite 配置** (`vite.config.ts`)
   - 使用 `injectManifest` 策略
   - 编译 TypeScript Service Worker
   - 注入预缓存清单

## 📁 文件结构

```
src/
├── sw.ts                    # Service Worker（拦截 manifest 请求）
├── utils/
│   ├── indexedDB.ts        # IndexedDB 工具函数
│   └── dynamicManifest.ts  # Manifest 生成逻辑（已更新）
├── App.tsx                 # 存储 appConfig 到 IndexedDB
└── ...

vite.config.ts              # 使用 injectManifest 策略
index.html                  # manifest link 指向 /manifest.json
```

## 🔧 实现细节

### 1. Service Worker (`src/sw.ts`)

```typescript
// 拦截 manifest.json 请求
registerRoute(
  ({ url }) => url.pathname === '/manifest.json',
  async () => {
    const appConfig = await getAppConfigFromIndexedDB()
    const manifest = generateDynamicManifest(appConfig)
    return new Response(JSON.stringify(manifest), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
)
```

### 2. IndexedDB 存储 (`src/utils/indexedDB.ts`)

- 数据库名称：`CigarAppDB`
- 对象存储：`appConfig`
- 键：`current`
- 值：`{ id: 'current', config: appConfig, updatedAt: timestamp }`

### 3. App.tsx 更新

```typescript
// 当 appConfig 更新时，存储到 IndexedDB
if (config) {
  await saveAppConfigToIndexedDB(config)
}
```

### 4. Vite 配置

```typescript
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
  injectManifest: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
    maximumFileSizeToCacheInBytes: 3000000,
  },
})
```

## ✅ 优点

1. **Manifest URL 稳定**：始终是 `/manifest.json`，符合 PWA 规范
2. **完全动态**：可以实时更新 manifest 内容（名称、图标等）
3. **时机正确**：浏览器请求时动态生成，不依赖页面加载
4. **符合规范**：使用标准 HTTPS URL，不依赖 blob URL

## ⚠️ 注意事项

1. **Service Worker 缓存**：需要处理 Service Worker 缓存失效
2. **IndexedDB 同步**：确保主线程和 Service Worker 都能访问 IndexedDB
3. **降级方案**：如果 IndexedDB 读取失败，返回默认 manifest
4. **调试**：Service Worker 调试相对复杂，需要使用 Chrome DevTools

## 🚀 部署说明

1. **构建**：运行 `npm run build`，VitePWA 会自动编译 Service Worker
2. **验证**：检查 `dist/sw.js` 是否包含 manifest 拦截逻辑
3. **测试**：在浏览器中打开应用，检查 Network 标签中的 `/manifest.json` 请求

## 🔍 调试技巧

1. **Chrome DevTools**：
   - Application → Service Workers：查看 Service Worker 状态
   - Application → Storage → IndexedDB：查看存储的 `appConfig`
   - Network → 过滤 `manifest.json`：查看请求和响应

2. **Console 日志**：
   - Service Worker 中的 `console.log` 会显示在 Service Worker 控制台
   - 主线程中的日志显示在主控制台

3. **常见问题**：
   - Service Worker 未注册：检查 `src/utils/pwa.ts` 中的注册逻辑
   - IndexedDB 读取失败：检查数据库和对象存储是否正确创建
   - Manifest 未更新：清除 Service Worker 缓存并重新注册

## 📝 相关文件

- `src/sw.ts` - Service Worker 实现
- `src/utils/indexedDB.ts` - IndexedDB 工具函数
- `src/App.tsx` - 主应用组件（存储 appConfig）
- `src/utils/dynamicManifest.ts` - Manifest 生成逻辑
- `vite.config.ts` - Vite 配置（injectManifest 策略）

