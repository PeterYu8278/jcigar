# 图片裁剪功能文档

## 功能概述

系统现在支持在上传图片后，根据系统要求设定图片裁剪范围。用户可以选择图片区域进行裁剪，确保图片符合特定的尺寸和比例要求。

## 技术实现

### 1. 核心组件

#### ImageCrop 组件
- **位置**: `src/components/common/ImageCrop.tsx`
- **功能**: 提供图片裁剪界面和功能
- **依赖**: `react-image-crop` 库

#### ImageUpload 组件增强
- **位置**: `src/components/common/ImageUpload.tsx`
- **新增功能**: 集成图片裁剪功能
- **配置选项**: 支持裁剪参数配置

### 2. 主要特性

#### 裁剪参数配置
```typescript
interface ImageUploadProps {
  enableCrop?: boolean // 是否启用裁剪功能
  cropAspectRatio?: number // 裁剪宽高比 (默认: 1)
  cropMinWidth?: number // 裁剪最小宽度 (默认: 100)
  cropMinHeight?: number // 裁剪最小高度 (默认: 100)
  cropMaxWidth?: number // 裁剪最大宽度 (默认: 800)
  cropMaxHeight?: number // 裁剪最大高度 (默认: 800)
}
```

#### 裁剪要求显示
- 显示宽高比要求
- 显示最小/最大尺寸限制
- 实时预览裁剪结果

#### 交互功能
- **拖拽调整**: 用户可以拖拽调整裁剪区域
- **重置功能**: 一键重置到默认裁剪区域
- **实时预览**: 显示裁剪后的效果预览
- **确认/取消**: 支持确认裁剪或取消操作

### 3. 使用示例

#### Profile页面头像上传
```typescript
<ImageUpload
  folder="users"
  showPreview={true}
  enableCrop={true}
  cropAspectRatio={1}        // 正方形头像
  cropMinWidth={200}         // 最小200px
  cropMinHeight={200}        // 最小200px
  cropMaxWidth={800}         // 最大800px
  cropMaxHeight={800}        // 最大800px
  width={120}                // 预览尺寸
  height={120}
/>
```

#### 品牌Logo上传
```typescript
<ImageUpload
  folder="brands"
  enableCrop={true}
  cropAspectRatio={1}        // 正方形Logo
  cropMinWidth={300}         // 最小300px
  cropMinHeight={300}        // 最小300px
  cropMaxWidth={1000}        // 最大1000px
  cropMaxHeight={1000}       // 最大1000px
/>
```

#### 产品图片上传
```typescript
<ImageUpload
  folder="products"
  enableCrop={true}
  cropAspectRatio={4/3}      // 4:3比例
  cropMinWidth={400}         // 最小400px
  cropMinHeight={300}        // 最小300px
  cropMaxWidth={1200}        // 最大1200px
  cropMaxHeight={900}        // 最大900px
/>
```

## 工作流程

### 1. 图片选择
1. 用户点击上传按钮选择图片
2. 系统验证图片格式和大小
3. 如果启用裁剪功能，显示裁剪界面

### 2. 图片裁剪
1. 系统显示裁剪要求说明
2. 用户拖拽调整裁剪区域
3. 实时显示裁剪预览
4. 用户可以重置或确认裁剪

### 3. 图片上传
1. 确认裁剪后，系统生成裁剪后的图片
2. 自动上传到Cloudinary
3. 返回最终图片URL
4. 清理临时文件

## 系统要求

### 裁剪规则
- **头像**: 正方形 (1:1)，最小200x200px，最大800x800px
- **品牌Logo**: 正方形 (1:1)，最小300x300px，最大1000x1000px
- **产品图片**: 4:3比例，最小400x300px，最大1200x900px
- **活动图片**: 16:9比例，最小800x450px，最大1920x1080px

### 技术限制
- 支持格式: JPEG, PNG, WebP
- 最大文件大小: 5MB
- 裁剪精度: 像素级精确裁剪
- 输出格式: JPEG (质量90%)

## 用户体验

### 视觉反馈
- 清晰的裁剪要求说明
- 实时预览裁剪效果
- 平滑的动画过渡
- 直观的操作界面

### 操作便捷性
- 一键重置裁剪区域
- 拖拽调整裁剪框
- 键盘快捷键支持
- 响应式设计

### 错误处理
- 文件格式验证
- 尺寸限制检查
- 网络错误处理
- 用户友好的错误提示

## 未来扩展

### 计划功能
- 多图片批量裁剪
- 预设裁剪模板
- 高级滤镜效果
- 图片压缩优化
- 批量上传功能

### 性能优化
- 图片懒加载
- 缓存机制
- 压缩算法优化
- 异步处理

## 维护说明

### 依赖管理
- `react-image-crop`: 图片裁剪核心库
- 定期更新依赖版本
- 监控安全漏洞

### 测试覆盖
- 单元测试: 组件功能测试
- 集成测试: 上传流程测试
- 端到端测试: 用户操作测试

### 监控指标
- 上传成功率
- 裁剪完成率
- 用户满意度
- 性能指标
