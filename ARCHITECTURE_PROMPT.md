# Cigar Club管理平台 - 架构与功能提示词

## 🏗️ 项目架构概览

### 技术栈
- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5.4.20
- **UI组件库**: Ant Design 5.27.4
- **状态管理**: Zustand 5.0.8
- **路由管理**: React Router v7.9.1
- **后端服务**: Firebase (Firestore, Authentication, Storage)
- **图片存储**: Cloudinary 2.7.0
- **日期处理**: Dayjs 1.11.18
- **HTTP客户端**: Axios 1.12.2
- **部署平台**: Netlify
- **版本控制**: GitHub

### 项目结构
```
src/
├── components/          # 可复用组件
│   ├── common/         # 通用组件 (ProtectedRoute等)
│   ├── forms/          # 表单组件
│   ├── tables/         # 表格组件
│   └── layout/         # 布局组件 (Header, Sider, Footer, MobileNav)
├── views/              # 页面组件
│   ├── frontend/       # 前端用户界面 (Home, Events, Shop, Profile)
│   ├── admin/          # 管理后台 (Dashboard, Users, Inventory, Events, Orders, Finance)
│   └── auth/           # 认证页面 (Login, Register)
├── services/           # 服务层
│   ├── firebase/       # Firebase服务 (auth.ts, firestore.ts)
│   ├── cloudinary/     # 图片服务
│   └── api/            # API服务
├── store/              # 状态管理 (Zustand)
│   └── modules/        # 模块化状态 (auth.ts, kart.ts)
├── utils/              # 工具函数
├── types/              # TypeScript类型定义
└── config/             # 配置文件 (firebase.ts, theme.ts, permissions.ts)
```

## 🔥 Firebase 数据架构

### Firestore 集合结构
- **users** - 用户信息
  - `email`, `displayName`, `role` (guest/member/admin)
  - `profile.phone`, `profile.preferences`
  - `membership.level`, `membership.joinDate`, `membership.lastActive`
  - `createdAt`, `updatedAt`

- **cigars** - 雪茄产品
  - `name`, `brand`, `origin`, `strength`, `size`
  - `price`, `description`, `imageUrl`
  - `stock`, `status` (active/inactive)
  - `createdAt`, `updatedAt`

- **events** - 聚会活动
  - `title`, `description`, `organizerId`
  - `location.name`, `location.address`, `location.coordinates`
  - `schedule.startDate`, `schedule.endDate`, `schedule.registrationDeadline`
  - `participants.registered[]`, `participants.maxParticipants`, `participants.fee`
  - `cigars.featured[]`, `cigars.tasting[]`
  - `status` (draft/published/ongoing/completed/cancelled)

- **orders** - 订单记录
  - `userId`, `items[]`, `total`, `status`, `payment`, `shipping`
  - `createdAt`, `updatedAt`

- **transactions** - 财务交易
  - `type` (sale/purchase/event_fee/expense)
  - `amount`, `description`, `referenceId`
  - `createdAt`

- **inbound_orders** - 入库订单（新架构）
  - `referenceNo`, `type`, `reason`, `items[]`, `totalQuantity`, `totalValue`
  - `status` (pending/completed/cancelled), `operatorId`, `createdAt`

- **outbound_orders** - 出库订单（新架构）
  - `referenceNo`, `type`, `reason`, `items[]`, `totalQuantity`, `totalValue`
  - `status` (pending/completed/cancelled), `operatorId`, `createdAt`

- **inventory_movements** - 库存变动索引（新架构）
  - `cigarId`, `type` (in/out), `quantity`, `referenceNo`
  - `inboundOrderId` / `outboundOrderId`, `createdAt`

- **inventory_logs** - 库存变动记录（旧架构，仅向后兼容）
  - `cigarId`, `type` (in/out/adjustment), `quantity`, `reason`
  - `referenceId`, `createdAt`

### 数据清洗机制
- `sanitizeForFirestore()` 函数自动处理：
  - 移除 `undefined` 值
  - 转换 Firebase Timestamp 为 Date
  - 验证日期有效性
  - 深拷贝数组和对象

## 🔐 认证与权限系统

### 用户角色
- **Guest** - 游客用户，可查看活动
- **Member** - 注册会员，可参与活动和购买
- **Admin** - 管理员，可访问管理后台

### 认证方式
1. **邮箱/密码登录** - 传统方式
2. **手机号/密码登录** - 通过手机号查找绑定的邮箱账户
3. **Google OAuth** - 一键登录，自动创建用户文档

### 权限控制
- **路由级保护**: `ProtectedRoute` 组件
- **组件级权限**: `hasPermission()` 函数
- **状态管理**: Zustand store 管理用户状态和权限

## 🎨 前端功能模块

### 用户端功能
- **首页** (`/`) - 欢迎页面，快速导航
- **活动页面** (`/events`) - 查看和参与雪茄聚会
- **商店页面** (`/shop`) - 浏览和购买雪茄产品
- **个人资料** (`/profile`) - 查看和编辑用户信息

### 管理后台功能
- **仪表板** (`/admin`) - 数据概览和快速操作
- **用户管理** (`/admin/users`) - 用户列表、角色管理
- **库存管理** (`/admin/inventory`) - 雪茄产品CRUD、库存调整
- **活动管理** (`/admin/events`) - 活动创建、编辑、参与者管理
- **订单管理** (`/admin/orders`) - 订单查看、状态更新、直接销售
- **财务管理** (`/admin/finance`) - 交易记录、收支统计

## 🎯 核心业务逻辑

### 活动管理流程
1. 管理员创建活动（草稿状态）
2. 设置活动详情（时间、地点、费用、雪茄）
3. 发布活动（published状态）
4. 用户注册参与
5. 活动进行中（ongoing状态）
6. 活动结束（completed状态）

### 库存管理流程
1. 添加雪茄产品
2. 设置初始库存
3. 订单出库自动扣减
4. 手动调整库存
5. 库存变动记录追踪

### 订单处理流程
1. 用户下单（pending状态）
2. 管理员确认（confirmed状态）
3. 处理支付（paid状态）
4. 发货（shipped状态）
5. 完成（completed状态）

## 🚀 部署与配置

### 环境变量
```bash
# Firebase 配置
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Cloudinary 配置
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_API_KEY=your_api_key
VITE_CLOUDINARY_API_SECRET=your_api_secret
```

### Netlify 配置
- **构建命令**: `npm run build`
- **发布目录**: `dist`
- **CSP策略**: 已配置支持 Firebase 和 Google Analytics
- **自动部署**: 推送到 main 分支触发

## 🎨 UI/UX 设计

### 主题风格
- **主色调**: 黑金配色方案
- **背景**: 深色渐变 + 金色装饰
- **卡片**: 半透明毛玻璃效果
- **按钮**: 金色渐变 + 阴影效果

### 响应式设计
- **桌面端**: 侧边栏导航
- **移动端**: 底部导航栏
- **自适应**: 支持各种屏幕尺寸

## 🔧 开发规范

### 代码规范
- **TypeScript**: 严格类型检查
- **组件命名**: PascalCase
- **文件命名**: kebab-case
- **状态管理**: Zustand hooks
- **错误处理**: 统一错误处理机制

### 性能优化
- **代码分割**: Vite 自动分割
- **懒加载**: 路由级懒加载
- **缓存策略**: Firebase 缓存
- **图片优化**: Cloudinary 自动优化

## 📱 移动端支持

### PWA 特性
- 响应式布局适配
- 触摸友好的交互
- 离线缓存支持
- 移动端优化的表单

### 导航设计
- 桌面端：侧边栏 + 顶部导航
- 移动端：底部导航栏
- 自适应切换

## 🔒 安全措施

### 数据安全
- Firebase 安全规则
- 输入验证和清理
- XSS 防护
- CSRF 保护

### 权限安全
- 基于角色的访问控制
- 路由级权限验证
- API 接口权限检查
- 敏感操作日志记录

---

## 💡 开发提示

### 新增功能时
1. 先定义 TypeScript 类型
2. 创建 Firestore 集合结构
3. 实现服务层函数
4. 添加状态管理
5. 创建 UI 组件
6. 配置路由和权限

### 调试技巧
1. 使用 Firebase Console 查看数据
2. 利用 React DevTools 调试状态
3. 检查网络请求和响应
4. 查看浏览器控制台错误

### 性能优化
1. 使用 React.memo 优化渲染
2. 实现虚拟滚动处理大量数据
3. 图片懒加载和压缩
4. 合理使用缓存策略

这个架构提示词涵盖了项目的完整技术栈、数据模型、业务逻辑和开发规范，可以作为新开发者快速了解项目的指南。
