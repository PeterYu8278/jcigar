// 从字符串格式化 Service Account JSON（直接粘贴 JSON 内容）
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// 从命令行参数读取 JSON 字符串
const jsonString = process.argv[2];

if (!jsonString) {
  console.log('❌ 请提供 JSON 字符串作为参数\n');
  console.log('📝 使用方法：');
  console.log('   node scripts/format-service-account-from-string.js \'{"type":"service_account",...}\'');
  process.exit(1);
}

console.log('📝 格式化 Service Account JSON...\n');

try {
  // 尝试解析 JSON 字符串（可能包含换行符）
  let jsonObj;
  
  // 如果字符串包含换行符，先清理
  const cleanedString = jsonString
    .replace(/\\n/g, '')  // 移除转义的换行符
    .replace(/\n/g, '')   // 移除实际换行符
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim();
  
  jsonObj = JSON.parse(cleanedString);
  
  // 转换为单行字符串
  const singleLine = JSON.stringify(jsonObj);
  
  console.log('✅ JSON 格式验证通过\n');
  console.log('📋 单行 JSON 字符串（复制此内容到 Netlify）：\n');
  console.log('='.repeat(80));
  console.log(singleLine);
  console.log('='.repeat(80));
  console.log('\n📝 说明：');
  console.log('   1. 复制上面的单行 JSON 字符串');
  console.log('   2. 在 Netlify Dashboard 中：');
  console.log('      - Key: FIREBASE_SERVICE_ACCOUNT');
  console.log('      - Value: 粘贴上面的单行 JSON');
  console.log('   3. 点击 Save 保存\n');
  
  // 保存到文件
  const outputPath = resolve(rootDir, 'service-account-formatted.txt');
  writeFileSync(outputPath, singleLine);
  console.log(`✅ 已保存到: ${outputPath}\n`);
  
} catch (error) {
  console.error('❌ 错误:', error.message);
  console.log('\n⚠️  请确保提供的 JSON 字符串格式正确');
  process.exit(1);
}

