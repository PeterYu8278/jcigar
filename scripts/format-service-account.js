// 格式化 Service Account JSON 为单行字符串（用于 Netlify 环境变量）
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 从命令行参数读取 JSON 文件路径，或使用默认路径
const jsonPath = process.argv[2] || 'service-account.json';

console.log('📝 格式化 Service Account JSON...\n');

try {
  // 读取 JSON 文件
  const jsonContent = readFileSync(jsonPath, 'utf-8');
  
  // 解析 JSON 验证格式
  const jsonObj = JSON.parse(jsonContent);
  
  // 转换为单行字符串（移除所有换行和多余空格）
  const singleLine = JSON.stringify(jsonObj);
  
  console.log('✅ JSON 格式验证通过\n');
  console.log('📋 单行 JSON 字符串（复制此内容到 Netlify）：\n');
  console.log('='.repeat(80));
  console.log(singleLine);
  console.log('='.repeat(80));
  console.log('\n📝 说明：');
  console.log('   1. 复制上面的单行 JSON 字符串');
  console.log('   2. 在 Netlify Dashboard 中，创建环境变量：');
  console.log('      Key: FIREBASE_SERVICE_ACCOUNT');
  console.log('      Value: 粘贴上面的单行 JSON');
  console.log('   3. 点击 Save 保存\n');
  
  // 保存到文件（可选）
  const outputPath = 'service-account-formatted.txt';
  writeFileSync(outputPath, singleLine);
  console.log(`✅ 已保存到: ${outputPath}\n`);
  
} catch (error) {
  console.error('❌ 错误:', error.message);
  console.log('\n📝 使用方法：');
  console.log('   node scripts/format-service-account.js [json文件路径]');
  console.log('\n   如果没有提供路径，将尝试读取当前目录的 service-account.json');
  process.exit(1);
}

