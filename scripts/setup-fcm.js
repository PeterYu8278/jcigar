// FCM 配置助手脚本
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

console.log('🚀 FCM 推送通知配置助手\n');
console.log('此脚本将帮助您完成 Firebase Cloud Messaging 的配置。\n');

async function setup() {
  // 步骤 1: 检查现有配置
  const envLocalPath = resolve(rootDir, '.env.local');
  let envContent = '';
  
  if (existsSync(envLocalPath)) {
    envContent = readFileSync(envLocalPath, 'utf-8');
    console.log('📄 找到现有的 .env.local 文件\n');
  } else {
    console.log('📄 将创建新的 .env.local 文件\n');
  }

  // 步骤 2: 获取 VAPID 密钥
  console.log('步骤 1: 配置 VAPID 密钥');
  console.log('─────────────────────────────────────────');
  console.log('请按照以下步骤获取 VAPID 密钥：');
  console.log('1. 访问: https://console.firebase.google.com/project/cigar-56871/settings/cloudmessaging');
  console.log('2. 滚动到 "Web 推送证书" 部分');
  console.log('3. 如果没有密钥对，点击 "生成密钥对"');
  console.log('4. 复制生成的公钥（VAPID Key）\n');
  
  const vapidKey = await question('请输入 VAPID 密钥: ');
  
  if (!vapidKey || vapidKey.trim().length < 20) {
    console.log('❌ VAPID 密钥无效，请确保输入正确的密钥');
    rl.close();
    return;
  }

  // 步骤 3: 更新 .env.local
  console.log('\n步骤 2: 更新环境变量文件');
  console.log('─────────────────────────────────────────');
  
  // 检查是否已有 VAPID 密钥配置
  if (envContent.includes('VITE_FCM_VAPID_KEY')) {
    const update = await question('检测到已有 VITE_FCM_VAPID_KEY，是否更新？(y/n): ');
    if (update.toLowerCase() === 'y') {
      envContent = envContent.replace(
        /VITE_FCM_VAPID_KEY=.*/,
        `VITE_FCM_VAPID_KEY=${vapidKey.trim()}`
      );
    } else {
      console.log('跳过更新 VAPID 密钥');
    }
  } else {
    // 添加新的 VAPID 密钥配置
    envContent += `\n# FCM 配置\nVITE_FCM_VAPID_KEY=${vapidKey.trim()}\n`;
  }

  // 写入文件
  writeFileSync(envLocalPath, envContent);
  console.log('✅ .env.local 文件已更新\n');

  // 步骤 4: 检查其他必需的环境变量
  console.log('步骤 3: 检查其他配置');
  console.log('─────────────────────────────────────────');
  
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID'
  ];

  let missingVars = [];
  requiredVars.forEach(varName => {
    if (!envContent.includes(varName)) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.log('⚠️  检测到以下环境变量缺失:');
    missingVars.forEach(v => console.log(`   - ${v}`));
    console.log('\n请确保这些变量已在 .env.local 中配置。');
  } else {
    console.log('✅ 所有必需的环境变量已配置\n');
  }

  // 步骤 5: 总结
  console.log('步骤 4: 配置完成');
  console.log('─────────────────────────────────────────');
  console.log('✅ 本地环境变量配置完成！\n');
  console.log('📝 下一步操作：');
  console.log('   1. 运行 npm run check-fcm 检查配置');
  console.log('   2. 配置 Netlify 环境变量（生产环境）');
  console.log('   3. 运行 npm run dev 测试推送通知\n');
  console.log('📚 详细文档: docs/FCM_SETUP_GUIDE.md\n');

  rl.close();
}

setup().catch(error => {
  console.error('❌ 配置过程中出错:', error);
  rl.close();
  process.exit(1);
});

