#!/usr/bin/env node

/**
 * 清理开发环境缓存脚本
 * 清理Service Worker缓存和PWA相关文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 需要清理的文件和目录
const CLEANUP_TARGETS = [
  'dev-dist',
  'dist',
  'node_modules/.vite',
  'public/sw.js',
  'public/workbox-*.js',
  'public/workbox-*.js.map'
];

/**
 * 删除文件或目录
 */
function removeFileOrDir(targetPath) {
  try {
    const fullPath = path.join(__dirname, '..', targetPath);
    
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✅ 删除目录: ${targetPath}`);
      } else {
        fs.unlinkSync(fullPath);
        console.log(`✅ 删除文件: ${targetPath}`);
      }
    } else {
      console.log(`ℹ️  文件不存在: ${targetPath}`);
    }
  } catch (error) {
    console.error(`❌ 删除失败 ${targetPath}:`, error.message);
  }
}

/**
 * 清理匹配模式的文件
 */
function cleanupPattern(pattern) {
  try {
    const projectRoot = path.join(__dirname, '..');
    const publicDir = path.join(projectRoot, 'public');
    
    if (fs.existsSync(publicDir)) {
      const files = fs.readdirSync(publicDir);
      const regex = new RegExp(pattern.replace('*', '.*'));
      
      files.forEach(file => {
        if (regex.test(file)) {
          const filePath = path.join(publicDir, file);
          fs.unlinkSync(filePath);
          console.log(`✅ 删除文件: public/${file}`);
        }
      });
    }
  } catch (error) {
    console.error(`❌ 清理模式失败 ${pattern}:`, error.message);
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🧹 开始清理开发环境缓存...\n');
  
  // 清理目录和文件
  CLEANUP_TARGETS.forEach(target => {
    if (target.includes('*')) {
      cleanupPattern(target);
    } else {
      removeFileOrDir(target);
    }
  });
  
  console.log('\n🎉 开发环境缓存清理完成！');
  console.log('\n📋 建议下一步操作:');
  console.log('1. 重启开发服务器: npm run dev');
  console.log('2. 清除浏览器缓存');
  console.log('3. 检查控制台是否还有错误');
}

// 运行脚本
main();

export { removeFileOrDir, cleanupPattern };
