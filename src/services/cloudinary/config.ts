// Cloudinary 配置
// 使用浏览器端的 Cloudinary
declare global {
  interface Window {
    cloudinary: any
  }
}

// Cloudinary 配置
const cloudinaryConfig = {
  cloud_name: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dy2zb1n41',
  api_key: import.meta.env.VITE_CLOUDINARY_API_KEY || '867921412147783',
  api_secret: import.meta.env.VITE_CLOUDINARY_API_SECRET || '5bk_PKCezGP1CADvS2MHegxW4-E',
  secure: true
}

// 动态加载 Cloudinary
const loadCloudinary = async () => {
  if (typeof window !== 'undefined' && !window.cloudinary) {
    const script = document.createElement('script')
    script.src = 'https://widget.cloudinary.com/v2.0/global/all.js'
    script.async = true
    document.head.appendChild(script)
    
    return new Promise((resolve) => {
      script.onload = () => {
        window.cloudinary.setCloudName(cloudinaryConfig.cloud_name)
        resolve(window.cloudinary)
      }
    })
  }
  return window.cloudinary
}

export { cloudinaryConfig, loadCloudinary }
