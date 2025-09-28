#!/usr/bin/env node

/**
 * Cloudinary 文件夹结构设置脚本
 * 这个脚本帮助您创建和管理 Cloudinary 中的文件夹结构
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cloudinary 配置
const CLOUDINARY_CONFIG = {
  cloud_name: 'dy2zb1n41',
  upload_preset: 'jep-cigar',
  base_folder: 'cigar-app'
};

// 文件夹结构定义
const FOLDER_STRUCTURE = {
  'brands': {
    description: '品牌Logo图片',
    max_size: '2MB',
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    dimensions: '120x120 (推荐)',
    usage: '品牌管理表单'
  },
  'products': {
    description: '产品图片',
    max_size: '5MB',
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    dimensions: '400x400 (推荐)',
    usage: '库存管理表单'
  },
  'events': {
    description: '活动封面图片',
    max_size: '5MB',
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    dimensions: '800x600 (推荐)',
    usage: '活动管理表单'
  },
  'users': {
    description: '用户头像',
    max_size: '2MB',
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    dimensions: '200x200 (推荐)',
    usage: '用户档案页面'
  },
  'temp': {
    description: '临时文件',
    max_size: '10MB',
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    dimensions: '任意',
    usage: '临时存储，需要定期清理'
  }
};

// 生成文件夹结构文档
function generateFolderDocumentation() {
  const docPath = path.join(__dirname, '..', 'docs', 'CLOUDINARY_FOLDER_STRUCTURE.md');
  
  let content = `# Cloudinary 文件夹结构文档

## 📁 文件夹结构

\`\`\`
${CLOUDINARY_CONFIG.base_folder}/
`;

  Object.entries(FOLDER_STRUCTURE).forEach(([folder, config]) => {
    content += `├── ${folder}/          # ${config.description}\n`;
  });

  content += `\`\`\`

## 📋 文件夹详情

`;

  Object.entries(FOLDER_STRUCTURE).forEach(([folder, config]) => {
    content += `### 📂 ${folder}/
- **描述**: ${config.description}
- **最大文件大小**: ${config.max_size}
- **支持格式**: ${config.formats.join(', ')}
- **推荐尺寸**: ${config.dimensions}
- **使用场景**: ${config.usage}

`;
  });

  content += `## 🔧 使用方法

### 在代码中使用

\`\`\`typescript
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
\`\`\`

### 使用 ImageUpload 组件

\`\`\`typescript
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
\`\`\`

## 🚨 重要提醒

1. **上传预设**: 确保在 Cloudinary Dashboard 中创建了 \`${CLOUDINARY_CONFIG.upload_preset}\` 预设
2. **文件夹权限**: 确保预设允许在 \`${CLOUDINARY_CONFIG.base_folder}\` 下创建子文件夹
3. **文件格式**: 只允许上传图片格式，确保安全
4. **文件大小**: 根据用途设置合适的文件大小限制
5. **定期清理**: 特别是 \`temp\` 文件夹，需要定期清理

## 📞 故障排除

### 常见问题

1. **上传失败**: 检查上传预设是否正确配置
2. **文件夹不存在**: 第一次上传时会自动创建文件夹
3. **文件格式不支持**: 检查预设中的允许格式设置
4. **文件大小超限**: 检查预设中的最大文件大小设置

### 测试上传

使用测试组件验证上传功能：

\`\`\`typescript
import CloudinaryTest from '../components/common/CloudinaryTest'

// 在开发环境中使用
<CloudinaryTest />
\`\`\`

---

*此文档由 setup-cloudinary-folders.js 脚本自动生成*
`;

  fs.writeFileSync(docPath, content, 'utf8');
  console.log(`✅ 文件夹结构文档已生成: ${docPath}`);
}

// 生成 TypeScript 类型定义
function generateTypeDefinitions() {
  const typesPath = path.join(__dirname, '..', 'src', 'types', 'cloudinary.ts');
  
  const content = `// Cloudinary 相关类型定义
export interface CloudinaryFolder {
  name: string;
  description: string;
  maxSize: number;
  formats: string[];
  dimensions: string;
  usage: string;
}

export const CLOUDINARY_FOLDERS: Record<string, CloudinaryFolder> = {
  brands: {
    name: 'brands',
    description: '品牌Logo图片',
    maxSize: 2 * 1024 * 1024, // 2MB
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    dimensions: '120x120',
    usage: '品牌管理表单'
  },
  products: {
    name: 'products',
    description: '产品图片',
    maxSize: 5 * 1024 * 1024, // 5MB
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    dimensions: '400x400',
    usage: '库存管理表单'
  },
  events: {
    name: 'events',
    description: '活动封面图片',
    maxSize: 5 * 1024 * 1024, // 5MB
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    dimensions: '800x600',
    usage: '活动管理表单'
  },
  users: {
    name: 'users',
    description: '用户头像',
    maxSize: 2 * 1024 * 1024, // 2MB
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    dimensions: '200x200',
    usage: '用户档案页面'
  },
  temp: {
    name: 'temp',
    description: '临时文件',
    maxSize: 10 * 1024 * 1024, // 10MB
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    dimensions: '任意',
    usage: '临时存储'
  }
} as const;

export type CloudinaryFolderName = keyof typeof CLOUDINARY_FOLDERS;

// 获取文件夹配置的辅助函数
export function getFolderConfig(folderName: CloudinaryFolderName): CloudinaryFolder {
  return CLOUDINARY_FOLDERS[folderName];
}

// 验证文件是否符合文件夹要求
export function validateFileForFolder(
  file: File, 
  folderName: CloudinaryFolderName
): { valid: boolean; error?: string } {
  const config = getFolderConfig(folderName);
  
  // 检查文件大小
  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: \`文件大小不能超过 \${config.maxSize / 1024 / 1024}MB\`
    };
  }
  
  // 检查文件格式
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!fileExtension || !config.formats.includes(fileExtension)) {
    return {
      valid: false,
      error: \`不支持的文件格式。支持的格式: \${config.formats.join(', ')}\`
    };
  }
  
  return { valid: true };
}
`;

  fs.writeFileSync(typesPath, content, 'utf8');
  console.log(`✅ Cloudinary 类型定义已生成: ${typesPath}`);
}

// 生成上传配置常量
function generateUploadConfig() {
  const configPath = path.join(__dirname, '..', 'src', 'config', 'cloudinaryFolders.ts');
  
  const content = `// Cloudinary 文件夹配置
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
  return UPLOAD_CONFIG.FOLDER_CONFIGS[folderName];
}

// 生成完整的文件夹路径
export function getFullFolderPath(folderName: CloudinaryFolderName): string {
  return \`\${UPLOAD_CONFIG.BASE_FOLDER}/\${folderName}\`;
}

// 验证文件夹名称
export function isValidFolderName(folderName: string): folderName is CloudinaryFolderName {
  return folderName in UPLOAD_CONFIG.FOLDERS;
}
`;

  fs.writeFileSync(configPath, content, 'utf8');
  console.log(`✅ 上传配置已生成: ${configPath}`);
}

// 主函数
function main() {
  console.log('🚀 开始设置 Cloudinary 文件夹结构...\n');
  
  try {
    // 生成文档
    generateFolderDocumentation();
    
    // 生成类型定义
    generateTypeDefinitions();
    
    // 生成配置
    generateUploadConfig();
    
    console.log('\n✅ Cloudinary 文件夹结构设置完成！');
    console.log('\n📋 下一步操作：');
    console.log('1. 在 Cloudinary Dashboard 中创建上传预设 "jep-cigar"');
    console.log('2. 确保预设设置为 "Unsigned"（无签名）');
    console.log('3. 设置基础文件夹为 "cigar-app"');
    console.log('4. 运行应用并测试上传功能');
    console.log('\n📖 查看生成的文档: docs/CLOUDINARY_FOLDER_STRUCTURE.md');
    
  } catch (error) {
    console.error('❌ 设置过程中出现错误:', error.message);
    process.exit(1);
  }
}

// 运行脚本
main();

export {
  generateFolderDocumentation,
  generateTypeDefinitions,
  generateUploadConfig,
  FOLDER_STRUCTURE
};
