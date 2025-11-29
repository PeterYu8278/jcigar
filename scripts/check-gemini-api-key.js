/**
 * Gemini API Key 检查工具
 * 用于验证 Gemini API Key 是否正确配置
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

console.log('🔍 检查 Gemini API Key 配置...\n');

// 检查 .env 文件
const envPath = join(rootDir, '.env');
const envLocalPath = join(rootDir, '.env.local');

let envFile = null;
if (existsSync(envPath)) {
  envFile = envPath;
  console.log('✅ 找到 .env 文件');
} else if (existsSync(envLocalPath)) {
  envFile = envLocalPath;
  console.log('✅ 找到 .env.local 文件');
} else {
  console.log('❌ 未找到 .env 或 .env.local 文件');
  console.log('\n📝 请创建 .env 文件并添加以下配置：');
  console.log('   VITE_GEMINI_API_KEY=your_api_key_here');
  console.log('\n💡 获取 API Key 的步骤：');
  console.log('   1. 访问 https://makersuite.google.com/app/apikey');
  console.log('   2. 或访问 https://aistudio.google.com/app/apikey');
  console.log('   3. 创建新的 API Key');
  console.log('   4. 将 API Key 添加到 .env 文件中');
  process.exit(1);
}

// 读取环境变量
const envContent = readFileSync(envFile, 'utf-8');
const lines = envContent.split('\n');

let apiKeyFound = false;
let apiKeyValue = null;

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_GEMINI_API_KEY=')) {
    apiKeyFound = true;
    apiKeyValue = trimmed.split('=')[1]?.trim();
    break;
  }
}

if (!apiKeyFound) {
  console.log('❌ 未找到 VITE_GEMINI_API_KEY 配置');
  console.log('\n📝 请在 .env 文件中添加：');
  console.log('   VITE_GEMINI_API_KEY=your_api_key_here');
  process.exit(1);
}

if (!apiKeyValue || apiKeyValue === 'your_api_key_here' || apiKeyValue === '') {
  console.log('❌ VITE_GEMINI_API_KEY 未设置或使用占位符');
  console.log('\n📝 请设置有效的 API Key');
  process.exit(1);
}

// 验证 API Key 格式（Gemini API Key 通常以 AIza 开头）
if (apiKeyValue.startsWith('AIza')) {
  console.log('✅ 找到 VITE_GEMINI_API_KEY');
  console.log(`   Key 前缀: ${apiKeyValue.substring(0, 10)}...`);
  console.log(`   Key 长度: ${apiKeyValue.length} 字符`);
  console.log('\n✅ API Key 格式看起来正确');
  console.log('\n💡 如果仍然遇到 404 错误，可能的原因：');
  console.log('   1. API Key 未启用 Generative AI API');
  console.log('   2. API Key 没有访问所需模型的权限');
  console.log('   3. 需要启用 Google AI Studio API');
  console.log('\n🔧 检查步骤：');
  console.log('   1. 访问 https://console.cloud.google.com/apis/library');
  console.log('   2. 搜索 "Generative Language API"');
  console.log('   3. 确保已启用该 API');
  console.log('   4. 检查 API Key 的权限设置');
} else {
  console.log('⚠️  API Key 格式可能不正确');
  console.log('   Gemini API Key 通常以 "AIza" 开头');
  console.log(`   当前 Key 前缀: ${apiKeyValue.substring(0, 10)}...`);
}

console.log('\n📚 相关文档：');
console.log('   - https://ai.google.dev/docs');
console.log('   - https://ai.google.dev/gemini-api/docs');

