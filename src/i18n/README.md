# 国际化 (i18n) 使用指南

## 概述

本项目已集成完整的国际化支持，支持中文（zh-CN）和英文（en-US）两种语言。

## 功能特性

- ✅ 支持中英文切换
- ✅ 语言偏好持久化存储
- ✅ Ant Design 组件自动本地化
- ✅ Day.js 日期格式自动本地化
- ✅ 浏览器语言自动检测
- ✅ TypeScript 类型安全

## 使用方法

### 1. 在组件中使用翻译

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

### 2. 语言切换

语言切换器已集成到应用头部，用户可以通过下拉菜单切换语言：

- 🇨🇳 中文
- 🇺🇸 English

### 3. 添加新的翻译

在 `src/i18n/locales/` 目录下的语言文件中添加新的翻译键值对：

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

### 4. 使用嵌套的翻译键

```tsx
// 访问嵌套的翻译
t('usersAdmin.title') // "用户管理" / "User Management"
t('profile.editProfile') // "编辑资料" / "Edit Profile"
```

## 文件结构

```
src/i18n/
├── index.ts                 # i18n 配置入口
├── locales/
│   ├── zh-CN.json          # 中文翻译
│   └── en-US.json          # 英文翻译
└── README.md               # 使用说明
```

## 技术实现

- **i18next**: 核心国际化库
- **react-i18next**: React 集成
- **i18next-browser-languagedetector**: 浏览器语言检测
- **zustand**: 语言状态管理
- **Ant Design**: UI 组件本地化

## 注意事项

1. 所有用户界面文本都应该使用翻译函数 `t()`
2. 翻译键名使用点号分隔的命名空间结构
3. 新增翻译时，需要同时更新两种语言文件
4. 语言切换会自动保存到 localStorage
5. 应用重启后会记住用户的语言偏好

## 示例

查看以下文件了解具体实现：

- `src/components/layout/AppHeader.tsx` - 头部组件国际化
- `src/views/auth/Login.tsx` - 登录页面国际化
- `src/components/common/LanguageSwitcher.tsx` - 语言切换组件
