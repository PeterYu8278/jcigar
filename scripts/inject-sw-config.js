// 构建脚本：注入 Service Worker 配置
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const swPath = resolve(rootDir, 'public/firebase-messaging-sw.js');
const envLocalPath = resolve(rootDir, '.env.local');

// 读取 .env.local 文件
function loadEnvFile(filePath) {
  const envVars = {};
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match) {
            envVars[match[1].trim()] = match[2].trim();
          }
        }
      });
    } catch (error) {
      console.warn(`⚠️  Warning: Could not read ${filePath}`);
    }
  }
  return envVars;
}

try {
  let swContent = readFileSync(swPath, 'utf-8');

  // 从环境变量和 .env.local 读取配置
  const envVars = loadEnvFile(envLocalPath);
  
  const config = {
    VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || envVars.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || envVars.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || envVars.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || envVars.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || envVars.VITE_FIREBASE_APP_ID
  };

  // 替换占位符
  let hasMissing = false;
  Object.entries(config).forEach(([key, value]) => {
    if (value && value !== 'your_vapid_key_here') {
      swContent = swContent.replace(
        new RegExp(`{{${key}}}`, 'g'),
        value
      );
    } else {
      console.warn(`⚠️  Warning: ${key} is not set`);
      hasMissing = true;
    }
  });

  // 写入更新后的文件
  writeFileSync(swPath, swContent);
  
  if (hasMissing) {
    console.warn('⚠️  Some configuration values are missing, but Service Worker file has been updated');
  } else {
    console.log('✅ Service Worker config injected successfully');
  }
} catch (error) {
  console.error('❌ Error injecting Service Worker config:', error);
  process.exit(1);
}

