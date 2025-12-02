# AI Cigar Scanner - UI 架构图

## 组件结构概览

```
AICigarScanner (主容器)
│
├─ [状态1: 未拍摄] ──────────────────────────────────────────────
│  │
│  ├─ Card: 手动输入提示 (可选)
│  │  ├─ EditOutlined Icon
│  │  ├─ Text: "手动输入雪茄型号（可选，可提高识别准确性）"
│  │  └─ AutoComplete: 品牌/雪茄名称输入
│  │     └─ Text: 提示信息（如果已输入）
│  │
│  └─ Camera Container (相对定位)
│     │
│     ├─ [错误状态]
│     │  ├─ CameraOutlined Icon (红色)
│     │  ├─ Text: 错误信息
│     │  └─ Button: 重试
│     │
│     └─ [正常状态]
│        ├─ Webcam Component (视频流)
│        ├─ Focus Point Indicator (对焦指示器，可选)
│        │  └─ 金色边框 + 中心点
│        └─ Focus Status Text ("对焦中...", 可选)
│
│     └─ Camera Controls (绝对定位，底部)
│        ├─ Button: 切换摄像头 (圆形)
│        ├─ Button: 闪光灯 (圆形，条件显示)
│        ├─ Button: 拍照 (圆形，主按钮，金色渐变)
│        └─ Upload: 上传图片 (圆形)
│
│
├─ [状态2: 已拍摄，识别中] ─────────────────────────────────────
│  │
│  └─ Image Container
│     ├─ img: 拍摄的图片
│     └─ Loading Overlay (绝对定位)
│        ├─ Spin: 加载动画
│        └─ Text: "AI 正在识别雪茄..."
│
│
└─ [状态3: 识别完成] ───────────────────────────────────────────
   │
   ├─ Screenshot Container (ref: screenshotContainerRef) ⚠️ 截图区域
   │  │
   │  ├─ Image Display (如果存在)
   │  │  └─ img: 拍摄的图片
   │  │
   │  └─ Card: 识别结果
   │     │
   │     ├─ Header Section
   │     │  ├─ Title: 品牌名称 (金色)
   │     │  ├─ Text: 雪茄名称
   │     │  └─ Tag: 强度标签 (颜色根据强度变化)
   │     │
   │     ├─ Divider
   │     │
   │     ├─ Info Section
   │     │  ├─ Text: 产地
   │     │  └─ Text: 可信度百分比
   │     │
   │     ├─ Flavor Profile Section
   │     │  └─ Tags: 风味标签 (金色)
   │     │
   │     ├─ [可选] Construction Section (雪茄构造)
   │     │  ├─ Text: "雪茄构造" (标题)
   │     │  ├─ Text: 茄衣 (Wrapper)
   │     │  ├─ Text: 茄套 (Binder)
   │     │  └─ Text: 茄芯 (Filler)
   │     │
   │     ├─ [可选] Tasting Notes Section (品吸笔记)
   │     │  ├─ Foot Section (脚部 - 前1/3)
   │     │  │  └─ Tags: 脚部风味标签 (青色)
   │     │  ├─ Body Section (主体 - 中1/3)
   │     │  │  └─ Tags: 主体风味标签 (蓝色)
   │     │  └─ Head Section (头部 - 后1/3)
   │     │     └─ Tags: 头部风味标签 (紫色)
   │     │
   │     ├─ Description Section
   │     │  └─ Paragraph: 描述文本
   │     │
   │     └─ [可选] Cigar Images Section (匹配雪茄图片)
   │        ├─ Text: "雪茄图片 (N 张)"
   │        └─ Image.PreviewGroup
   │           └─ Grid: 图片网格 (最多5张)
   │              └─ Image: 可预览的图片
   │
   │
   └─ Action Buttons (截图容器外部) ⚠️ 不在截图中
      │
      ├─ [条件显示] Saving Status
      │  ├─ Spin: 加载动画
      │  └─ Text: "正在保存到数据库..."
      │
      ├─ [条件显示] Screenshot Status
      │  ├─ Spin: 加载动画
      │  └─ Text: "正在生成截图..."
      │
      ├─ Button Group (水平排列)
      │  ├─ Button: 保存截图 (DownloadOutlined)
      │  └─ Button: 分享截图 (ShareAltOutlined)
      │
      └─ Button: 重新拍摄 (ReloadOutlined, 全宽, 金色渐变)
```

## 状态流转图

```
┌─────────────┐
│  初始状态   │
│ (未拍摄)    │
└──────┬──────┘
       │
       │ [点击拍照/上传图片]
       ▼
┌─────────────┐
│  识别中     │
│ (analyzing) │
└──────┬──────┘
       │
       │ [识别完成]
       ▼
┌─────────────┐
│  识别完成   │
│ (result)    │
└──────┬──────┘
       │
       │ [点击重新拍摄]
       ▼
┌─────────────┐
│  初始状态   │
│ (未拍摄)    │
└─────────────┘
```

## 关键功能区域

### 1. 截图区域 (screenshotContainerRef)
- **包含内容**: 图片 + 识别结果卡片
- **不包含**: 所有操作按钮
- **用途**: 用于生成截图和分享

### 2. 操作按钮区域
- **位置**: 截图容器外部
- **按钮**:
  - 保存截图 (触发下载)
  - 分享截图 (使用 Web Share API)
  - 重新拍摄 (重置状态)

### 3. 摄像头控制区域
- **位置**: 摄像头视图底部（绝对定位）
- **按钮**:
  - 切换摄像头 (前置/后置)
  - 闪光灯 (条件显示，仅后置摄像头)
  - 拍照 (主操作)
  - 上传图片

## 样式特点

### 颜色方案
- **主色调**: 金色渐变 (#FDE08D → #C48D3A)
- **背景**: 深色半透明 (rgba(255,255,255,0.05))
- **边框**: 深灰色 (#333)
- **文本**: 白色/浅灰色

### 响应式设计
- 垂直布局 (flexDirection: 'column')
- 全宽组件 (width: '100%')
- 自适应高度

## 交互流程

1. **拍摄流程**:
   ```
   用户输入提示(可选) → 打开摄像头 → 调整对焦/闪光灯 → 
   点击拍照 → 显示图片 → AI识别 → 显示结果
   ```

2. **截图流程**:
   ```
   点击保存截图 → 生成截图 → 下载到设备 → 
   提示是否分享 → 选择分享方式
   ```

3. **分享流程**:
   ```
   点击分享截图 → 生成截图 → 检查Web Share API支持 → 
   调用系统分享 → 或回退到下载
   ```

## 技术实现要点

### 截图功能
- 使用 `html2canvas` 库
- 只截取 `screenshotContainerRef` 区域
- 2x 缩放提高清晰度
- 支持跨域图片 (useCORS: true)

### 分享功能
- 优先使用 Web Share API
- 支持文件分享 (移动端)
- 不支持时回退到下载

### 摄像头控制
- 支持前后摄像头切换
- 支持闪光灯控制 (后置摄像头)
- 支持点击对焦
- 错误处理和自动回退

