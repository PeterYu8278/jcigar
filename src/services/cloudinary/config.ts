// Cloudinary 配置
import { v2 as cloudinary } from 'cloudinary'

// 配置 Cloudinary
cloudinary.config({
  cloud_name: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dy2zb1n41',
  api_key: import.meta.env.VITE_CLOUDINARY_API_KEY || '867921412147783',
  api_secret: import.meta.env.VITE_CLOUDINARY_API_SECRET || '5bk_PKCezGP1CADvS2MHegxW4-E',
  secure: true // 使用 HTTPS
})

export default cloudinary
