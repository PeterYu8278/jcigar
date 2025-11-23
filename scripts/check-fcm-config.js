// 检查 FCM 配置脚本
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

console.log('🔍 检查 FCM 配置...\n');

// 检查环境变量（从 .env.local 文件读取）
const envLocalPath = resolve(rootDir, '.env.local');
let envVars = {};

// 读取 .env.local 文件
if (existsSync(envLocalPath)) {
  try {
    const envContent = readFileSync(envLocalPath, 'utf-8');
    // 解析环境变量（简单解析，不支持多行值）
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          envVars[match[1].trim()] = match[2].trim();
        }
      }
    });
  } catch (error) {
    console.log('  ⚠️  无法读取 .env.local 文件');
  }
}

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FCM_VAPID_KEY'
];

let allConfigured = true;

console.log('📋 环境变量检查（从 .env.local 读取）:');
requiredEnvVars.forEach(varName => {
  // 先检查环境变量，再检查 .env.local 文件
  const value = process.env[varName] || envVars[varName];
  if (value && value !== 'your_vapid_key_here') {
    const displayValue = varName.includes('KEY') || varName.includes('SECRET')
      ? `${value.substring(0, 15)}...` 
      : value;
    console.log(`  ✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`  ❌ ${varName}: 未配置或使用默认值`);
    allConfigured = false;
  }
});

// 检查 Service Worker 文件
console.log('\n📄 Service Worker 文件检查:');
const swPath = resolve(rootDir, 'public/firebase-messaging-sw.js');
try {
  const swContent = readFileSync(swPath, 'utf-8');
  const hasPlaceholders = swContent.includes('{{VITE_');
  
  if (hasPlaceholders) {
    console.log('  ⚠️  Service Worker 仍包含占位符，需要在构建时注入配置');
  } else {
    console.log('  ✅ Service Worker 配置已注入');
  }
} catch (error) {
  console.log(`  ❌ Service Worker 文件不存在: ${swPath}`);
  allConfigured = false;
}

// 检查 Netlify Functions
console.log('\n⚡ Netlify Functions 检查:');
const functionsDir = resolve(rootDir, 'netlify/functions');
const functionFiles = ['save-token.ts', 'send-notification.ts', 'subscribe-topic.ts'];

functionFiles.forEach(file => {
  const filePath = resolve(functionsDir, file);
  try {
    readFileSync(filePath, 'utf-8');
    console.log(`  ✅ ${file}`);
  } catch (error) {
    console.log(`  ❌ ${file}: 文件不存在`);
    allConfigured = false;
  }
});

// 检查依赖
console.log('\n📦 依赖检查:');
try {
  const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8'));
  const hasNetlifyFunctions = packageJson.devDependencies?.['@netlify/functions'];
  
  if (hasNetlifyFunctions) {
    console.log('  ✅ @netlify/functions 已安装');
  } else {
    console.log('  ❌ @netlify/functions 未安装');
    allConfigured = false;
  }
} catch (error) {
  console.log('  ⚠️  无法读取 package.json');
}

// 总结
console.log('\n' + '='.repeat(50));
if (allConfigured) {
  console.log('✅ 所有配置检查通过！');
  console.log('\n📝 下一步:');
  console.log('  1. 确保 Netlify 环境变量已配置');
  console.log('  2. 运行 npm run dev 测试本地推送通知');
  console.log('  3. 部署到 Netlify 测试生产环境');
} else {
  console.log('❌ 部分配置缺失，请参考 docs/FCM_SETUP_GUIDE.md 完成配置');
}
console.log('='.repeat(50));

