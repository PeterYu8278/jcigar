# Cloudinary 设置指南

## 📋 概述

Cloudinary 是一个强大的云图像和视频管理平台，为您的雪茄应用提供：
- 图片上传和存储
- 自动图片优化和转换
- CDN 加速
- 响应式图片生成

## 🚀 快速开始

### 1. 注册 Cloudinary 账户

1. 访问 [cloudinary.com](https://cloudinary.com)
2. 点击 "Sign Up" 注册免费账户
3. 免费账户包含：
   - 25GB 存储空间
   - 25GB 带宽/月
   - 25,000 次转换/月

### 2. 获取 API 凭据

登录 Cloudinary Dashboard 后，记录以下信息：

```
Cloud Name: your-cloud-name
API Key: 123456789012345
API Secret: your-secret-key
```

### 3. 配置环境变量

复制 `env.example` 文件为 `.env.local`：

```bash
cp env.example .env.local
```

编辑 `.env.local` 文件，填入您的 Cloudinary 凭据：

```env
# Cloudinary配置
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_API_KEY=123456789012345
VITE_CLOUDINARY_API_SECRET=your-secret-key
```

### 4. 重启开发服务器

```bash
npm run dev
```

## 🛠️ 使用方法

### 基础用法

```typescript
import { uploadFile, getOptimizedImageUrl } from '../services/cloudinary'

// 上传文件
const result = await uploadFile(file, {
  folder: 'brands',
  transformation: {
    width: 800,
    height: 600,
    crop: 'fill',
    quality: 'auto'
  }
})

// 获取优化后的图片URL
const optimizedUrl = getOptimizedImageUrl(result.public_id, {
  width: 200,
  height: 200,
  crop: 'fill'
})
```

### 使用 React Hook

```typescript
import { useCloudinary } from '../hooks/useCloudinary'

const MyComponent = () => {
  const { upload, uploading, error } = useCloudinary()

  const handleUpload = async (file: File) => {
    try {
      const result = await upload(file, { folder: 'products' })
      console.log('上传成功:', result.secure_url)
    } catch (err) {
      console.error('上传失败:', err)
    }
  }

  return (
    <div>
      {uploading && <div>上传中...</div>}
      {error && <div>错误: {error}</div>}
      {/* 您的上传界面 */}
    </div>
  )
}
```

### 使用图片上传组件

```typescript
import ImageUpload from '../components/common/ImageUpload'

const BrandForm = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  return (
    <Form.Item label="品牌Logo" name="logo">
      <ImageUpload
        value={logoUrl}
        onChange={setLogoUrl}
        folder="brands"
        maxSize={2 * 1024 * 1024} // 2MB
        width={120}
        height={120}
        showPreview={true}
      />
    </Form.Item>
  )
}
```

## 📁 文件夹结构

建议的 Cloudinary 文件夹结构：

```
cigar-app/
├── brands/          # 品牌logo
├── products/        # 产品图片
├── events/          # 活动图片
├── users/           # 用户头像
└── temp/            # 临时文件
```

## 🎨 图片转换选项

### 常用转换参数

```typescript
const transformation = {
  width: 800,           // 宽度
  height: 600,          // 高度
  crop: 'fill',         // 裁剪方式: fill, fit, limit, scale, crop
  quality: 'auto',      // 质量: auto, 80, best, eco
  format: 'auto',       // 格式: auto, jpg, png, webp
  gravity: 'center',    // 重力: center, face, auto
  radius: 10,           // 圆角
  effect: 'blur:300'    // 特效
}
```

### 预设转换

```typescript
// 缩略图
const thumbnail = getThumbnailUrl(publicId, 150)

// 品牌logo
const logo = getBrandLogoUrl(publicId, 200)

// 产品图片
const product = getOptimizedImageUrl(publicId, {
  width: 400,
  height: 400,
  crop: 'fill',
  quality: 'auto'
})
```

## 🔒 安全考虑

### 1. 文件类型限制

```typescript
const allowedFormats = ['jpg', 'jpeg', 'png', 'webp']
const maxSize = 5 * 1024 * 1024 // 5MB
```

### 2. 上传预设

在 Cloudinary Dashboard 中创建上传预设：

1. 进入 Settings > Upload
2. 创建新的 Upload Preset
3. 设置：
   - Signing Mode: Unsigned
   - Folder: cigar-app
   - Allowed Formats: jpg, jpeg, png, webp
   - Max File Size: 5MB

### 3. 环境变量安全

- 永远不要将 API Secret 提交到代码仓库
- 使用 `.env.local` 文件（已添加到 .gitignore）
- 在生产环境中使用环境变量

## 📊 最佳实践

### 1. 图片优化

```typescript
// 自动优化
const optimizedUrl = getOptimizedImageUrl(publicId, {
  quality: 'auto',
  format: 'auto',
  fetch_format: 'auto'
})
```

### 2. 响应式图片

```typescript
// 不同尺寸的图片
const sizes = [150, 300, 600, 1200]
const responsiveImages = sizes.map(size => 
  getOptimizedImageUrl(publicId, { width: size })
)
```

### 3. 懒加载

```typescript
// 使用 Cloudinary 的懒加载
const lazyUrl = getOptimizedImageUrl(publicId, {
  width: 300,
  height: 300,
  crop: 'fill',
  quality: 'auto',
  flags: 'progressive'
})
```

## 🐛 故障排除

### 常见问题

1. **上传失败**
   - 检查网络连接
   - 验证 API 凭据
   - 确认文件大小和格式

2. **图片不显示**
   - 检查 public_id 是否正确
   - 验证 Cloudinary URL 格式
   - 确认图片权限设置

3. **转换不生效**
   - 检查转换参数语法
   - 验证图片格式支持
   - 确认转换限制

### 调试技巧

```typescript
// 启用调试模式
cloudinary.config({
  cloud_name: 'your-cloud-name',
  api_key: 'your-api-key',
  api_secret: 'your-api-secret',
  secure: true,
  debug: true // 启用调试
})
```

## 📚 更多资源

- [Cloudinary 官方文档](https://cloudinary.com/documentation)
- [Cloudinary React SDK](https://cloudinary.com/documentation/react_integration)
- [图片优化指南](https://cloudinary.com/documentation/image_optimization)
- [转换参考](https://cloudinary.com/documentation/image_transformations)

## 💡 提示

1. **免费账户限制**：注意免费账户的月使用量限制
2. **图片格式**：优先使用 WebP 格式以获得更好的压缩
3. **缓存策略**：利用 Cloudinary 的 CDN 缓存提高加载速度
4. **监控使用量**：定期检查 Dashboard 中的使用统计
