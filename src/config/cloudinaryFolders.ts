// Cloudinary 文件夹配置
import { CLOUDINARY_FOLDERS, type CloudinaryFolderName } from '../types/cloudinary';

export const UPLOAD_CONFIG = {
  // 基础配置
  CLOUD_NAME: 'dy2zb1n41',
  UPLOAD_PRESET: 'jep-cigar',
  BASE_FOLDER: 'cigar-app',
  
  // 文件夹配置
  FOLDERS: CLOUDINARY_FOLDERS,
  
  // 默认上传选项
  DEFAULT_OPTIONS: {
    quality: 'auto',
    format: 'auto',
    transformation: {
      quality: 'auto',
      format: 'auto'
    }
  },
  
  // 各文件夹的特定配置
  FOLDER_CONFIGS: {
    brands: {
      folder: 'brands',
      maxSize: 2 * 1024 * 1024, // 2MB
      width: 120,
      height: 120,
      crop: 'fill',
      gravity: 'center'
    },
    products: {
      folder: 'products',
      maxSize: 5 * 1024 * 1024, // 5MB
      width: 400,
      height: 400,
      crop: 'fill',
      gravity: 'center'
    },
    events: {
      folder: 'events',
      maxSize: 5 * 1024 * 1024, // 5MB
      width: 800,
      height: 600,
      crop: 'fill',
      gravity: 'center'
    },
    users: {
      folder: 'users',
      maxSize: 2 * 1024 * 1024, // 2MB
      width: 200,
      height: 200,
      crop: 'fill',
      gravity: 'face'
    },
    temp: {
      folder: 'temp',
      maxSize: 10 * 1024 * 1024, // 10MB
      width: 1200,
      height: 1200,
      crop: 'limit'
    }
  }
} as const;

// 获取特定文件夹的上传配置
export function getUploadConfig(folderName: CloudinaryFolderName) {
  return (UPLOAD_CONFIG.FOLDER_CONFIGS as any)[folderName];
}

// 生成完整的文件夹路径
export function getFullFolderPath(folderName: CloudinaryFolderName): string {
  return `${UPLOAD_CONFIG.BASE_FOLDER}/${folderName}`;
}

// 验证文件夹名称
export function isValidFolderName(folderName: string): folderName is CloudinaryFolderName {
  return folderName in UPLOAD_CONFIG.FOLDERS;
}
