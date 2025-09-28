# Cloudinary 文件夹结构文档

## 📁 文件夹结构

```
cigar-app/
├── brands/          # 品牌Logo图片
├── products/          # 产品图片
├── events/          # 活动封面图片
├── users/          # 用户头像
├── temp/          # 临时文件
```

## 📋 文件夹详情

### 📂 brands/
- **描述**: 品牌Logo图片
- **最大文件大小**: 2MB
- **支持格式**: jpg, jpeg, png, webp
- **推荐尺寸**: 120x120 (推荐)
- **使用场景**: 品牌管理表单

### 📂 products/
- **描述**: 产品图片
- **最大文件大小**: 5MB
- **支持格式**: jpg, jpeg, png, webp
- **推荐尺寸**: 400x400 (推荐)
- **使用场景**: 库存管理表单

### 📂 events/
- **描述**: 活动封面图片
- **最大文件大小**: 5MB
- **支持格式**: jpg, jpeg, png, webp
- **推荐尺寸**: 800x600 (推荐)
- **使用场景**: 活动管理表单

### 📂 users/
- **描述**: 用户头像
- **最大文件大小**: 2MB
- **支持格式**: jpg, jpeg, png, webp
- **推荐尺寸**: 200x200 (推荐)
- **使用场景**: 用户档案页面

### 📂 temp/
- **描述**: 临时文件
- **最大文件大小**: 10MB
- **支持格式**: jpg, jpeg, png, webp
- **推荐尺寸**: 任意
- **使用场景**: 临时存储，需要定期清理

## 🔧 使用方法

### 在代码中使用

```typescript
import { uploadFile } from '../services/cloudinary/simple-upload'

// 上传品牌Logo
const brandResult = await uploadFile(file, {
  folder: 'brands'
})

// 上传产品图片
const productResult = await uploadFile(file, {
  folder: 'products'
})

// 上传活动图片
const eventResult = await uploadFile(file, {
  folder: 'events'
})

// 上传用户头像
const userResult = await uploadFile(file, {
  folder: 'users'
})
```

### 使用 ImageUpload 组件

```typescript
import ImageUpload from '../components/common/ImageUpload'

// 品牌Logo上传
<ImageUpload
  folder="brands"
  maxSize={2 * 1024 * 1024} // 2MB
  width={120}
  height={120}
/>

// 产品图片上传
<ImageUpload
  folder="products"
  maxSize={5 * 1024 * 1024} // 5MB
  width={400}
  height={400}
/>

// 活动图片上传
<ImageUpload
  folder="events"
  maxSize={5 * 1024 * 1024} // 5MB
  width={800}
  height={600}
/>

// 用户头像上传
<ImageUpload
  folder="users"
  maxSize={2 * 1024 * 1024} // 2MB
  width={200}
  height={200}
/>
```

## 🚨 重要提醒

1. **上传预设**: 确保在 Cloudinary Dashboard 中创建了 `jep-cigar` 预设
2. **文件夹权限**: 确保预设允许在 `cigar-app` 下创建子文件夹
3. **文件格式**: 只允许上传图片格式，确保安全
4. **文件大小**: 根据用途设置合适的文件大小限制
5. **定期清理**: 特别是 `temp` 文件夹，需要定期清理

## 📞 故障排除

### 常见问题

1. **上传失败**: 检查上传预设是否正确配置
2. **文件夹不存在**: 第一次上传时会自动创建文件夹
3. **文件格式不支持**: 检查预设中的允许格式设置
4. **文件大小超限**: 检查预设中的最大文件大小设置

### 测试上传

使用测试组件验证上传功能：

```typescript
import CloudinaryTest from '../components/common/CloudinaryTest'

// 在开发环境中使用
<CloudinaryTest />
```

---

*此文档由 setup-cloudinary-folders.js 脚本自动生成*
