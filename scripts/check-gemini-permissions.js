/**
 * Gemini API Key 权限详细检查工具
 * 提供逐步引导来检查 API Key 权限
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

console.log('='.repeat(60));
console.log('🔍 Gemini API Key 权限详细检查');
console.log('='.repeat(60));
console.log('');

// 步骤 1: 检查 .env 文件
console.log('📋 步骤 1: 检查 .env 文件配置');
console.log('-'.repeat(60));

const envPath = join(rootDir, '.env');
const envLocalPath = join(rootDir, '.env.local');

let envFile = null;
if (existsSync(envPath)) {
  envFile = envPath;
  console.log('✅ 找到 .env 文件:', envPath);
} else if (existsSync(envLocalPath)) {
  envFile = envLocalPath;
  console.log('✅ 找到 .env.local 文件:', envLocalPath);
} else {
  console.log('❌ 未找到 .env 或 .env.local 文件');
  console.log('');
  console.log('📝 请创建 .env 文件：');
  console.log('   1. 在项目根目录创建 .env 文件');
  console.log('   2. 添加以下内容：');
  console.log('      VITE_GEMINI_API_KEY=你的API密钥');
  console.log('');
  process.exit(1);
}

// 步骤 2: 读取 API Key
console.log('');
console.log('📋 步骤 2: 读取 API Key');
console.log('-'.repeat(60));

const envContent = readFileSync(envFile, 'utf-8');
const lines = envContent.split('\n');

let apiKey = null;
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_GEMINI_API_KEY=')) {
    apiKey = trimmed.split('=')[1]?.trim();
    break;
  }
}

if (!apiKey) {
  console.log('❌ 未找到 VITE_GEMINI_API_KEY 配置');
  console.log('');
  console.log('📝 请在 .env 文件中添加：');
  console.log('   VITE_GEMINI_API_KEY=你的API密钥');
  process.exit(1);
}

if (apiKey === 'your_gemini_api_key_here' || apiKey === '') {
  console.log('❌ VITE_GEMINI_API_KEY 未设置或使用占位符');
  console.log('');
  console.log('📝 请设置有效的 API Key');
  process.exit(1);
}

console.log('✅ 找到 VITE_GEMINI_API_KEY');
console.log(`   Key 前缀: ${apiKey.substring(0, 10)}...`);
console.log(`   Key 长度: ${apiKey.length} 字符`);

// 步骤 3: 验证 API Key 格式
console.log('');
console.log('📋 步骤 3: 验证 API Key 格式');
console.log('-'.repeat(60));

if (apiKey.startsWith('AIza')) {
  console.log('✅ API Key 格式正确（以 AIza 开头）');
} else {
  console.log('⚠️  API Key 格式可能不正确');
  console.log('   Gemini API Key 通常以 "AIza" 开头');
  console.log(`   当前 Key 前缀: ${apiKey.substring(0, 10)}...`);
}

// 步骤 4: 提供权限检查指南
console.log('');
console.log('📋 步骤 4: API Key 权限检查指南');
console.log('='.repeat(60));
console.log('');

console.log('🔐 检查 Google Cloud Console 中的 API Key 权限：');
console.log('');

console.log('1️⃣  访问 API 凭证页面');
console.log('   👉 https://console.cloud.google.com/apis/credentials');
console.log('   - 确保选择了正确的项目（右上角项目选择器）');
console.log('   - 在 "API 密钥" 列表中，找到你的 API Key');
console.log('');

console.log('2️⃣  检查 API 限制设置');
console.log('   - 点击你的 API Key 进入详情页面');
console.log('   - 查看 "API 限制" 部分');
console.log('   - 有两种设置：');
console.log('');
console.log('   📌 选项 A: "不限制密钥"');
console.log('      ✅ 如果选择此选项，API Key 可以访问所有已启用的 API');
console.log('      ✅ 需要确保 "Generative Language API" 已启用');
console.log('');
console.log('   📌 选项 B: "限制密钥"');
console.log('      ⚠️  如果选择此选项，需要确保 "Generative Language API" 在允许列表中');
console.log('      ✅ 点击 "限制密钥" 后，在 "选择 API" 列表中查找：');
console.log('         - "Generative Language API" 必须被选中');
console.log('');

console.log('3️⃣  检查已启用的 API');
console.log('   👉 https://console.cloud.google.com/apis/library');
console.log('   - 在搜索框中输入：Generative Language API');
console.log('   - 点击搜索结果中的 "Generative Language API"');
console.log('   - 检查页面顶部是否显示 "已启用" 或 "ENABLED"');
console.log('   - ❌ 如果未启用，点击 "启用" 或 "ENABLE" 按钮');
console.log('');

console.log('4️⃣  如果使用 Google AI Studio API Key');
console.log('   👉 https://aistudio.google.com/app/apikey');
console.log('   - Google AI Studio 的 API Key 通常开箱即用');
console.log('   - 无需在 Google Cloud Console 中配置');
console.log('   - 如果遇到问题，尝试重新生成 API Key');
console.log('');

// 步骤 5: 提供测试命令
console.log('📋 步骤 5: 测试 API Key');
console.log('-'.repeat(60));
console.log('');
console.log('运行以下命令测试 API Key 和查找可用模型：');
console.log('');
console.log('   npm run test-gemini');
console.log('');
console.log('这个命令会：');
console.log('   - 测试多个 Gemini 模型');
console.log('   - 显示哪个模型可用');
console.log('   - 提供详细的错误诊断');
console.log('');

// 步骤 6: 常见问题
console.log('📋 步骤 6: 常见问题排查');
console.log('='.repeat(60));
console.log('');

console.log('❓ 问题：所有模型都返回 404');
console.log('   🔍 可能原因：');
console.log('      - API Key 没有访问 Generative Language API 的权限');
console.log('      - API Key 来自 Google AI Studio，但项目配置不正确');
console.log('   ✅ 解决方法：');
console.log('      1. 如果使用 Google Cloud Console 的 API Key：');
console.log('         - 确保 "Generative Language API" 已启用');
console.log('         - 确保 API Key 的 "API 限制" 中包含 "Generative Language API"');
console.log('      2. 如果使用 Google AI Studio 的 API Key：');
console.log('         - 确保 API Key 格式正确（以 AIza 开头）');
console.log('         - 尝试重新生成 API Key');
console.log('');

console.log('❓ 问题：返回 403 权限错误');
console.log('   🔍 可能原因：');
console.log('      - API Key 被限制，但没有包含 Generative Language API');
console.log('      - API Key 已过期或被撤销');
console.log('   ✅ 解决方法：');
console.log('      1. 检查 API Key 的 "API 限制" 设置');
console.log('      2. 确保 "Generative Language API" 在允许列表中');
console.log('      3. 或者将限制改为 "不限制密钥"');
console.log('');

console.log('❓ 问题：返回 401 未授权错误');
console.log('   🔍 可能原因：');
console.log('      - API Key 无效或已过期');
console.log('      - API Key 格式不正确');
console.log('   ✅ 解决方法：');
console.log('      1. 访问 https://aistudio.google.com/app/apikey');
console.log('      2. 重新生成 API Key');
console.log('      3. 更新 .env 文件中的 VITE_GEMINI_API_KEY');
console.log('');

// 步骤 7: 快速链接
console.log('📋 步骤 7: 有用的链接');
console.log('-'.repeat(60));
console.log('');
console.log('🔗 Google AI Studio (推荐用于开发):');
console.log('   https://aistudio.google.com/app/apikey');
console.log('');
console.log('🔗 Google Cloud Console API 凭证:');
console.log('   https://console.cloud.google.com/apis/credentials');
console.log('');
console.log('🔗 API 库（启用 API）:');
console.log('   https://console.cloud.google.com/apis/library');
console.log('');
console.log('🔗 Generative Language API:');
console.log('   https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
console.log('');
console.log('🔗 Gemini API 文档:');
console.log('   https://ai.google.dev/docs');
console.log('');

console.log('='.repeat(60));
console.log('✅ 检查完成！请按照上述步骤检查 API Key 权限');
console.log('='.repeat(60));


