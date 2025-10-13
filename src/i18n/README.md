# 国际化 (i18n) 使用指南

## 概述

本项目已集成完整的国际化支持，支持中文（zh-CN）和英文（en-US）两种语言。

## 功能特性

- ✅ 支持中英文切换
- ✅ 语言偏好持久化存储（localStorage）
- ✅ Ant Design 组件自动本地化
- ✅ Day.js 日期格式自动本地化
- ✅ TypeScript 类型安全的翻译键
- ✅ 预定义翻译常量
- ✅ 通用翻译Hooks

## 使用方法

### 1. 基础用法：使用 useTranslation

```tsx
import { useTranslation } from 'react-i18next'

const MyComponent = () => {
  const { t } = useTranslation()
  
  return (
    <div>
      <h1>{t('common.loading')}</h1>
      <p>{t('auth.loginSuccess')}</p>
    </div>
  )
}
```

### 2. 推荐用法：使用翻译常量

```tsx
import { useTranslation } from 'react-i18next'
import { COMMON_ACTIONS, COMMON_STATUS } from '@/i18n/constants'

const MyComponent = () => {
  const { t } = useTranslation()
  
  return (
    <div>
      <button>{t(COMMON_ACTIONS.SAVE)}</button>
      <span>{t(COMMON_STATUS.LOADING)}</span>
    </div>
  )
}
```

### 3. 高级用法：使用通用翻译Hook

```tsx
import { useCommonTranslation } from '@/hooks/useCommonTranslation'

const MyComponent = () => {
  const { actions, status, labels } = useCommonTranslation()
  
  return (
    <div>
      <button>{actions.save}</button>
      <span>{status.loading}</span>
      <label>{labels.name}</label>
    </div>
  )
}
```

### 4. 语言切换

```tsx
import { useLanguage } from '@/hooks/useCommonTranslation'

const MyComponent = () => {
  const { language, changeLanguage, isZhCN } = useLanguage()
  
  return (
    <button onClick={() => changeLanguage('en-US')}>
      Switch to English
    </button>
  )
}
```

## 文件结构

```
src/i18n/
├── index.ts                 # i18n 配置入口
├── constants.ts             # 翻译键常量定义
├── types.ts                 # TypeScript 类型定义
├── locales/
│   ├── zh-CN.json          # 中文翻译
│   └── en-US.json          # 英文翻译
└── README.md               # 使用说明

src/hooks/
└── useCommonTranslation.ts  # 通用翻译Hooks
```

## 技术实现

- **i18next**: 核心国际化库
- **react-i18next**: React 集成
- **Ant Design**: UI 组件本地化
- **Day.js**: 日期格式本地化
- **TypeScript**: 类型安全的翻译键

## 添加新的翻译

### 1. 在语言文件中添加翻译

**zh-CN.json:**
```json
{
  "newSection": {
    "newKey": "新的翻译文本"
  }
}
```

**en-US.json:**
```json
{
  "newSection": {
    "newKey": "New translation text"
  }
}
```

### 2. （可选）在常量文件中添加引用

**src/i18n/constants.ts:**
```typescript
export const NEW_SECTION = {
  NEW_KEY: 'newSection.newKey',
} as const
```

## 最佳实践

1. ✅ **使用翻译常量**而不是硬编码字符串
   - 好: `t(COMMON_ACTIONS.SAVE)`
   - 差: `t('common.save')`

2. ✅ **使用通用Hooks**减少重复代码
   - 好: `const { actions } = useCommonTranslation()`
   - 差: 在每个组件中重复调用 `t()`

3. ✅ **保持中英文翻译文件同步**
   - TypeScript 类型系统会检测不一致

4. ✅ **使用语义化的翻译键名**
   - 好: `common.save`, `auth.loginSuccess`
   - 差: `btn1`, `msg2`

5. ✅ **利用命名空间组织翻译**
   - 按功能模块分组（common, auth, profile等）

## 注意事项

1. 所有用户界面文本都应该使用翻译函数 `t()`
2. 翻译键名使用点号分隔的命名空间结构
3. 新增翻译时，需要同时更新两种语言文件
4. 语言切换会自动保存到 localStorage (`i18nextLng`)
5. 应用重启后会自动恢复用户的语言偏好

## 示例

查看以下文件了解具体实现：

- `src/components/layout/AppHeader.tsx` - 头部组件国际化
- `src/views/auth/Login.tsx` - 登录页面国际化
- `src/components/common/LanguageSwitcher.tsx` - 语言切换组件
- `src/i18n/constants.ts` - 翻译常量示例
- `src/hooks/useCommonTranslation.ts` - 自定义Hook示例
