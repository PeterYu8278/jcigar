#!/usr/bin/env node

/**
 * 清理控制台日志脚本
 * 移除或注释掉项目中的console.log语句
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 需要清理的文件类型
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// 需要跳过的目录
const SKIP_DIRS = ['node_modules', 'dist', 'dev-dist', '.git'];

// 需要跳过的文件
const SKIP_FILES = ['setup-cloudinary-folders.js', 'generate-icons.js'];

// 清理模式
const CLEANUP_MODE = {
  REMOVE: 'remove',      // 完全删除
  COMMENT: 'comment',    // 注释掉
  KEEP_ERROR: 'keep-error' // 保留console.error，删除其他
};

// 当前使用的清理模式
const CURRENT_MODE = CLEANUP_MODE.KEEP_ERROR;

/**
 * 检查文件是否应该被跳过
 */
function shouldSkipFile(filePath) {
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  
  // 跳过特定文件
  if (SKIP_FILES.includes(fileName)) {
    return true;
  }
  
  // 跳过特定目录
  for (const skipDir of SKIP_DIRS) {
    if (dirName.includes(skipDir)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 清理单个文件中的console语句
 */
function cleanConsoleInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let cleanedContent = content;
    let changesCount = 0;
    
    // 根据清理模式处理console语句
    switch (CURRENT_MODE) {
      case CLEANUP_MODE.REMOVE:
        // 完全删除console语句
        cleanedContent = content.replace(/^\s*console\.(log|warn|info|debug)\([^)]*\);\s*$/gm, '');
        cleanedContent = cleanedContent.replace(/^\s*console\.(log|warn|info|debug)\([^)]*\)\s*$/gm, '');
        break;
        
      case CLEANUP_MODE.COMMENT:
        // 注释掉console语句
        cleanedContent = content.replace(/^(\s*)(console\.(log|warn|info|debug)\([^)]*\);?)$/gm, '$1// $2');
        break;
        
      case CLEANUP_MODE.KEEP_ERROR:
        // 保留console.error，删除其他
        cleanedContent = content.replace(/^\s*console\.(log|warn|info|debug)\([^)]*\);\s*$/gm, '');
        cleanedContent = cleanedContent.replace(/^\s*console\.(log|warn|info|debug)\([^)]*\)\s*$/gm, '');
        break;
    }
    
    // 计算变化数量
    const originalLines = content.split('\n');
    const cleanedLines = cleanedContent.split('\n');
    changesCount = originalLines.length - cleanedLines.length;
    
    // 如果有变化，写回文件
    if (cleanedContent !== content) {
      fs.writeFileSync(filePath, cleanedContent, 'utf8');
      return changesCount;
    }
    
    return 0;
  } catch (error) {
    console.error(`处理文件 ${filePath} 时出错:`, error.message);
    return 0;
  }
}

/**
 * 递归遍历目录
 */
function walkDirectory(dirPath, callback) {
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!shouldSkipFile(fullPath)) {
          walkDirectory(fullPath, callback);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (FILE_EXTENSIONS.includes(ext) && !shouldSkipFile(fullPath)) {
          callback(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`遍历目录 ${dirPath} 时出错:`, error.message);
  }
}

/**
 * 生成清理报告
 */
function generateCleanupReport(results) {
  const reportPath = path.join(__dirname, '..', 'docs', 'CONSOLE_CLEANUP_REPORT.md');
  
  let content = `# Console 日志清理报告

## 📊 清理统计

- **清理模式**: ${CURRENT_MODE}
- **处理文件数**: ${results.length}
- **总变化数**: ${results.reduce((sum, r) => sum + r.changes, 0)}

## 📁 文件详情

`;

  results.forEach(result => {
    if (result.changes > 0) {
      content += `### ${result.file}
- **变化数**: ${result.changes}
- **相对路径**: \`${result.relativePath}\`

`;
    }
  });

  content += `## 🔧 清理模式说明

- **remove**: 完全删除console.log, console.warn, console.info, console.debug
- **comment**: 注释掉所有console语句
- **keep-error**: 保留console.error，删除其他console语句

## 📝 注意事项

1. 此报告由 \`scripts/clear-console-logs.js\` 自动生成
2. 清理后的代码已保存到相应文件
3. 建议在清理后运行测试确保功能正常
4. 如有需要，可以从git历史中恢复被删除的console语句

---

*清理时间: ${new Date().toLocaleString()}*
`;

  fs.writeFileSync(reportPath, content, 'utf8');
  console.log(`✅ 清理报告已生成: ${reportPath}`);
}

/**
 * 主函数
 */
function main() {
  console.log('🧹 开始清理控制台日志...\n');
  
  const projectRoot = path.join(__dirname, '..');
  const results = [];
  
  // 遍历src目录
  const srcPath = path.join(projectRoot, 'src');
  if (fs.existsSync(srcPath)) {
    walkDirectory(srcPath, (filePath) => {
      const relativePath = path.relative(projectRoot, filePath);
      const changes = cleanConsoleInFile(filePath);
      
      results.push({
        file: path.basename(filePath),
        relativePath,
        changes
      });
      
      if (changes > 0) {
        console.log(`✅ 清理 ${relativePath}: ${changes} 处变化`);
      }
    });
  }
  
  // 生成报告
  generateCleanupReport(results);
  
  const totalChanges = results.reduce((sum, r) => sum + r.changes, 0);
  const filesWithChanges = results.filter(r => r.changes > 0).length;
  
  console.log('\n🎉 控制台日志清理完成！');
  console.log(`📊 统计信息:`);
  console.log(`   - 处理文件: ${results.length}`);
  console.log(`   - 有变化的文件: ${filesWithChanges}`);
  console.log(`   - 总变化数: ${totalChanges}`);
  console.log(`   - 清理模式: ${CURRENT_MODE}`);
  
  if (totalChanges > 0) {
    console.log('\n📋 建议下一步操作:');
    console.log('1. 运行测试确保功能正常');
    console.log('2. 检查清理报告: docs/CONSOLE_CLEANUP_REPORT.md');
    console.log('3. 提交代码变更');
  } else {
    console.log('\n✨ 没有发现需要清理的console语句');
  }
}

// 运行脚本
main();

export {
  cleanConsoleInFile,
  walkDirectory,
  CLEANUP_MODE
};
