/**
 * Gemini API 测试工具
 * 用于测试 API Key 和检查可用的模型
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

console.log('🔍 测试 Gemini API 配置...\n');

// 读取环境变量
let apiKey = null;
const envPath = join(rootDir, '.env');
const envLocalPath = join(rootDir, '.env.local');

let envFile = null;
if (existsSync(envPath)) {
  envFile = envPath;
} else if (existsSync(envLocalPath)) {
  envFile = envLocalPath;
} else {
  console.log('❌ 未找到 .env 或 .env.local 文件');
  process.exit(1);
}

const envContent = readFileSync(envFile, 'utf-8');
const lines = envContent.split('\n');

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_GEMINI_API_KEY=')) {
    apiKey = trimmed.split('=')[1]?.trim();
    break;
  }
}

if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === '') {
  console.log('❌ VITE_GEMINI_API_KEY 未设置或使用占位符');
  process.exit(1);
}

console.log(`✅ 找到 API Key: ${apiKey.substring(0, 10)}...`);
console.log(`   Key 长度: ${apiKey.length} 字符\n`);

// 初始化 Gemini
const genAI = new GoogleGenerativeAI(apiKey);

// 测试不同的模型
const modelsToTest = [
  "gemini-pro",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-1.5-pro-latest",
  "gemini-1.5-flash-latest"
];

console.log('🧪 测试可用模型...\n');

let workingModel = null;

// 使用 async 函数包装测试逻辑
async function testModels() {
  for (const modelName of modelsToTest) {
    try {
      console.log(`测试模型: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // 尝试一个简单的文本生成请求
      const result = await model.generateContent("Say 'Hello' in one word");
      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ ${modelName} 可用！响应: ${text.trim()}\n`);
      workingModel = modelName;
      break;
    } catch (error) {
      const errorMsg = error?.message || error?.toString() || '';
      if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        console.log(`❌ ${modelName} 不可用 (404)\n`);
      } else if (errorMsg.includes('403') || errorMsg.includes('permission')) {
        console.log(`⚠️  ${modelName} 权限不足 (403)\n`);
      } else if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
        console.log(`❌ ${modelName} API Key 无效 (401)\n`);
        console.log('请检查 API Key 是否正确\n');
        process.exit(1);
      } else {
        console.log(`⚠️  ${modelName} 错误: ${errorMsg.substring(0, 100)}...\n`);
      }
    }
  }
  
  if (workingModel) {
    console.log(`\n✅ 找到可用模型: ${workingModel}`);
    console.log(`\n💡 建议在代码中使用此模型名称`);
  } else {
    console.log('\n❌ 所有模型都不可用');
    console.log('\n可能的原因：');
    console.log('1. API Key 没有访问这些模型的权限');
    console.log('2. 需要启用 Generative Language API');
    console.log('3. API Key 可能已过期或被撤销');
    console.log('\n🔧 解决步骤：');
    console.log('1. 访问 https://aistudio.google.com/app/apikey');
    console.log('2. 验证 API Key 是否有效');
    console.log('3. 访问 https://console.cloud.google.com/apis/library');
    console.log('4. 搜索 "Generative Language API" 并确保已启用');
    process.exit(1);
  }
}

// 执行测试
testModels().catch(error => {
  console.error('测试过程中发生错误:', error);
  process.exit(1);
});

