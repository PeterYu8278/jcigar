# Cloudinary 无签名上传预设设置指南

## 🚨 重要：需要创建上传预设

为了使用 Cloudinary 的无签名上传功能，您需要在 Cloudinary Dashboard 中创建一个上传预设。

## 📋 创建步骤

### 1. 登录 Cloudinary Dashboard
访问 [https://cloudinary.com/console](https://cloudinary.com/console) 并登录您的账户。

### 2. 进入上传设置
1. 点击左侧菜单中的 **"Settings"**（设置）
2. 选择 **"Upload"**（上传）标签页

### 3. 添加上传预设
1. 滚动到 **"Upload presets"**（上传预设）部分
2. 点击 **"Add upload preset"**（添加上传预设）按钮

### 4. 配置上传预设
填写以下信息：

**基本设置：**
- **Preset name**: `ml_default`
- **Signing Mode**: 选择 **"Unsigned"**（无签名）
- **Folder**: `cigar-app`

**安全设置：**
- **Allowed file formats**: 选择 `jpg`, `jpeg`, `png`, `webp`
- **Max file size**: 设置为 `10MB` 或您需要的最大大小
- **Allowed transformations**: 可以设置为 `All` 或根据需要限制

**转换设置（可选）：**
- **Quality**: `auto`
- **Format**: `auto`
- **Width**: `1200`
- **Height**: `1200`
- **Crop**: `limit`

### 5. 保存预设
点击 **"Save"** 按钮保存预设。

## 🔧 代码中的使用

创建预设后，代码中的上传功能将正常工作：

```typescript
// 上传文件
const result = await uploadFile(file, {
  folder: 'brands' // 会创建在 cigar-app/brands 文件夹中
})
```

## 🚨 常见问题

### 1. 上传失败 - "Upload preset not found"
- 确保预设名称是 `ml_default`
- 确保预设设置为 "Unsigned"（无签名）

### 2. 文件格式不支持
- 检查预设中的 "Allowed file formats" 设置
- 确保包含您要上传的文件格式

### 3. 文件大小超限
- 检查预设中的 "Max file size" 设置
- 确保设置足够大以容纳您的文件

## 📁 文件夹结构

上传的文件将按以下结构组织：

```
cigar-app/
├── brands/          # 品牌logo
├── products/        # 产品图片
├── events/          # 活动图片
├── users/           # 用户头像
└── test/            # 测试文件
```

## 🔒 安全建议

1. **限制文件格式**：只允许图片格式
2. **设置文件大小限制**：防止上传过大的文件
3. **使用文件夹**：组织不同类型的文件
4. **定期清理**：删除不需要的测试文件

## 📞 需要帮助？

如果您在设置过程中遇到问题：

1. 检查 Cloudinary Dashboard 中的预设配置
2. 查看浏览器控制台的错误信息
3. 确保网络连接正常
4. 验证 Cloudinary 账户状态

创建预设后，您的图片上传功能就可以正常使用了！
