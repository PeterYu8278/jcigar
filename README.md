# Gentleman Club管理平台

一个基于 React + TypeScript + Firebase + Ant Design 的现代化Gentleman Club社区管理平台。

## 🚀 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI组件库**: Ant Design
- **状态管理**: Zustand
- **路由管理**: React Router v6
- **后端服务**: Firebase (Firestore, Authentication, Storage)
- **图片存储**: Cloudinary
- **部署平台**: Netlify
- **版本控制**: GitHub

## 📋 功能特性

### 用户端功能
- 🔐 用户注册/登录/认证
- 👤 个人档案管理
- 🎯 雪茄聚会活动参与
- 🛒 雪茄产品购买
- 📊 个人统计数据

### 管理后台功能
- 👥 用户管理
- 📦 库存管理
- 🎪 活动管理
- 💰 财务管理
- 📈 数据统计仪表板

### 核心特性
- 🎨 响应式设计，支持移动端
- 🔒 基于角色的权限控制
- 🔄 实时数据同步
- 🚀 一键切换前端/管理后台
- 📱 PWA支持

## 🛠️ 开发环境设置

### 前置要求
- Node.js 18+
- npm 或 yarn
- Git

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/PeterYu8278/jcigar.git
   cd jcigar
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **环境配置**
   ```bash
   cp env.example .env.local
   ```
   
   编辑 `.env.local` 文件，填入您的 Firebase 和 Cloudinary 配置信息。

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **构建生产版本**
   ```bash
   npm run build
   ```

## 🔧 项目结构

```
src/
├── components/          # 可复用组件
│   ├── common/         # 通用组件
│   ├── forms/          # 表单组件
│   ├── tables/         # 表格组件
│   └── layout/         # 布局组件
├── views/              # 页面组件
│   ├── frontend/       # 前端用户界面
│   ├── admin/          # 管理后台
│   └── auth/           # 认证页面
├── services/           # 服务层
│   ├── firebase/       # Firebase服务
│   ├── cloudinary/     # 图片服务
│   └── api/            # API服务
├── store/              # 状态管理
├── router/             # 路由配置
├── utils/              # 工具函数
├── types/              # TypeScript类型
└── config/             # 配置文件
```

## 🔥 Firebase 配置

### Firestore 集合结构
- `users` - 用户信息
- `cigars` - 雪茄产品
- `events` - 聚会活动
- `orders` - 订单记录
- `transactions` - 财务交易
- `inventory_logs` - 库存变动记录

### 安全规则
确保在 Firebase Console 中配置适当的 Firestore 安全规则。

## 🚀 部署

### Netlify 部署

1. **连接 GitHub 仓库**
   - 在 Netlify 中连接您的 GitHub 仓库
   - 设置构建命令: `npm run build`
   - 设置发布目录: `dist`

2. **环境变量**
   在 Netlify 控制台中设置以下环境变量:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   ```

3. **自动部署**
   - 推送到 `main` 分支将自动触发部署
   - GitHub Actions 工作流将处理构建和部署

## 📱 移动端支持

项目采用响应式设计，支持移动端访问。主要特性：
- 响应式布局适配各种屏幕尺寸
- 触摸友好的交互设计
- 移动端优化的表单和表格

## 🔒 权限系统

### 用户角色
- **Guest** - 游客用户，可查看活动
- **Member** - 注册会员，可参与活动和购买
- **Admin** - 管理员，可访问管理后台

### 权限控制
- 基于角色的路由保护
- 组件级权限控制
- API 接口权限验证

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系我们

- 项目链接: [https://github.com/PeterYu8278/jcigar](https://github.com/PeterYu8278/jcigar)
- 问题反馈: [Issues](https://github.com/PeterYu8278/jcigar/issues)

## 🙏 致谢

感谢以下开源项目的支持：
- [React](https://reactjs.org/)
- [Ant Design](https://ant.design/)
- [Firebase](https://firebase.google.com/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
