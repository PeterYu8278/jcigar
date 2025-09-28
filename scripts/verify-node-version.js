#!/usr/bin/env node

/**
 * Node.js版本验证脚本
 * 用于验证Node.js版本是否符合项目要求
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取package.json中的engines要求
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 读取.nvmrc文件
const nvmrcPath = path.join(__dirname, '..', '.nvmrc');
const nvmrcVersion = fs.existsSync(nvmrcPath) ? fs.readFileSync(nvmrcPath, 'utf8').trim() : null;

// 读取netlify.toml文件
const netlifyTomlPath = path.join(__dirname, '..', 'netlify.toml');
let netlifyVersion = null;
if (fs.existsSync(netlifyTomlPath)) {
  const netlifyToml = fs.readFileSync(netlifyTomlPath, 'utf8');
  const match = netlifyToml.match(/NODE_VERSION\s*=\s*["']?(\d+)["']?/);
  if (match) {
    netlifyVersion = match[1];
  }
}

// 当前Node.js版本
const currentVersion = process.version;
const currentMajor = parseInt(currentVersion.slice(1).split('.')[0]);

console.log('🔍 Node.js版本验证报告');
console.log('='.repeat(50));

console.log(`📦 当前Node.js版本: ${currentVersion}`);
console.log(`📋 当前主版本号: ${currentMajor}`);

if (packageJson.engines && packageJson.engines.node) {
  console.log(`📄 package.json要求: ${packageJson.engines.node}`);
}

if (nvmrcVersion) {
  console.log(`🔧 .nvmrc指定版本: ${nvmrcVersion}`);
}

if (netlifyVersion) {
  console.log(`🌐 netlify.toml指定版本: ${netlifyVersion}`);
}

console.log('\n✅ 验证结果:');

// 检查版本兼容性
const requiredVersion = packageJson.engines?.node;
if (requiredVersion) {
  const minVersion = parseInt(requiredVersion.replace('>=', ''));
  if (currentMajor >= minVersion) {
    console.log(`✅ Node.js版本 ${currentMajor} 满足要求 (>=${minVersion})`);
  } else {
    console.log(`❌ Node.js版本 ${currentMajor} 不满足要求 (>=${minVersion})`);
    process.exit(1);
  }
}

// 检查版本一致性
const versions = [nvmrcVersion, netlifyVersion].filter(Boolean);
if (versions.length > 0) {
  const allSame = versions.every(v => v === versions[0]);
  if (allSame) {
    console.log(`✅ 所有配置文件版本一致: ${versions[0]}`);
  } else {
    console.log(`⚠️  配置文件版本不一致: ${versions.join(', ')}`);
  }
}

// 检查npm版本
const npmVersion = process.env.npm_version || 'unknown';
console.log(`📦 npm版本: ${npmVersion}`);

console.log('\n🎉 版本验证完成！');

// 提供升级建议
if (currentMajor < 22) {
  console.log('\n💡 升级建议:');
  console.log('   建议升级到Node.js 22 LTS以获得更好的性能和安全性');
  console.log('   运行: nvm install 22 && nvm use 22');
}
