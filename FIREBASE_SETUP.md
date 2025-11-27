# Firebase 配置指南

## Google OAuth 域名授权问题解决

### 问题描述
遇到 `auth/unauthorized-domain` 错误时，表示当前域名未在Firebase项目的授权域名列表中。

### 解决步骤

#### 1. 创建环境变量文件
在项目根目录创建 `.env.local` 文件：

```bash
# Firebase配置
VITE_FIREBASE_API_KEY=AIzaSyAPqg8bUXs7KuN1_aofBE8yLNRHGL-WwHc
VITE_FIREBASE_AUTH_DOMAIN=cigar-56871.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cigar-56871
VITE_FIREBASE_STORAGE_BUCKET=cigar-56871.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=866808564072
VITE_FIREBASE_APP_ID=1:866808564072:web:54021622fc7fc9a8b22edd

# Cloudinary配置
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
VITE_CLOUDINARY_API_KEY=your_api_key_here
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_here

# 应用配置
VITE_APP_NAME=Cigar Club管理平台
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=development
```

#### 2. 配置Firebase授权域名

1. 访问 [Firebase控制台](https://console.firebase.google.com/project/cigar-56871/authentication/settings)
2. 点击 "Authentication" > "Settings" > "Authorized domains"
3. 添加以下域名：
   - `localhost` (开发环境)
   - `127.0.0.1` (开发环境)
   - `your-domain.com` (生产环境)
   - `your-netlify-app.netlify.app` (Netlify部署)

#### 3. 重启开发服务器
```bash
npm run dev
```

#### 4. 验证配置
检查控制台是否还有错误信息，如果仍有问题，请检查：
- 环境变量是否正确加载
- Firebase项目设置是否正确
- 网络连接是否正常

### 常见问题

#### Q: 如何检查当前域名？
A: 在浏览器控制台运行：
```javascript
console.log('当前域名:', window.location.origin);
```

#### Q: 生产环境域名如何配置？
A: 在Firebase控制台的授权域名列表中添加你的生产域名，例如：
- `your-app.netlify.app`
- `your-domain.com`
- `www.your-domain.com`

#### Q: 开发环境仍然无法使用？
A: 确保添加了以下域名：
- `localhost`
- `127.0.0.1`
- `localhost:5173` (Vite默认端口)
- `localhost:3000` (如果使用其他端口)

### 安全提示
- 不要将 `.env.local` 文件提交到版本控制系统
- 定期检查Firebase项目的授权域名列表
- 在生产环境中使用HTTPS
