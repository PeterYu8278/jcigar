/**
 * Gemini 模型测试运行器
 * 在浏览器控制台中使用，用于测试所有 Gemini 模型
 */

import { runComprehensiveModelTest } from '../services/gemini/modelTester';

// 将测试函数暴露到全局window对象，方便在控制台调用
declare global {
    interface Window {
        testGeminiModels: (imageBase64: string) => Promise<void>;
        testGeminiModelsWithSampleImage: () => Promise<void>;
    }
}

/**
 * 在控制台运行测试
 * 使用方法：在控制台输入 window.testGeminiModels(imageBase64)
 */
window.testGeminiModels = async (imageBase64: string) => {
    console.log('🚀 开始 Gemini 模型全面测试...');
    console.log('⚠️ 警告: 此测试将消耗大量 API 配额（预计 170 次调用）');
    console.log('⏱️ 预计耗时: 6-10 分钟');
    console.log('请耐心等待...\n');

    try {
        const session = await runComprehensiveModelTest(imageBase64);
        
        console.log('\n✅ 测试完成！');
        console.log('📊 测试结果已保存到变量 window.lastTestSession');
        
        // 保存到全局变量供后续分析
        (window as any).lastTestSession = session;
        
        // 提供一些快捷分析函数
        (window as any).getTopModels = (count: number = 10) => {
            return Array.from(session.modelResults.entries())
                .sort((a, b) => b[1].successRate - a[1].successRate)
                .slice(0, count)
                .map(([name, result]) => ({
                    model: name,
                    successRate: result.successRate.toFixed(1) + '%',
                    avgResponseTime: result.avgResponseTime.toFixed(0) + 'ms',
                    avgConfidence: result.dataQuality.avgConfidence.toFixed(2)
                }));
        };
        
        (window as any).getFailedModels = () => {
            return Array.from(session.modelResults.entries())
                .filter(([_, result]) => result.successCount === 0)
                .map(([name, result]) => ({
                    model: name,
                    errors: result.errors
                }));
        };
        
        (window as any).getFieldStatistics = () => {
            const stats: any = {};
            session.fieldStatistics.forEach((stat, fieldName) => {
                stats[fieldName] = {
                    displayName: stat.displayName,
                    presenceRate: stat.presenceRate.toFixed(1) + '%',
                    validRate: ((stat.validCount / stat.totalTests) * 100).toFixed(1) + '%'
                };
            });
            return stats;
        };
        
        console.log('\n💡 可用的分析函数:');
        console.log('  - window.getTopModels(10) // 获取成功率最高的 10 个模型');
        console.log('  - window.getFailedModels() // 获取完全失败的模型');
        console.log('  - window.getFieldStatistics() // 获取字段统计');
        console.log('  - window.lastTestSession // 完整的测试会话数据');
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        throw error;
    }
};

/**
 * 使用示例图片测试（需要先在 AI 识茄页面捕获或上传图片）
 * 使用方法：
 * 1. 在 AI 识茄页面捕获或上传雪茄图片
 * 2. 在控制台运行: window.testGeminiModelsWithSampleImage()
 */
window.testGeminiModelsWithSampleImage = async () => {
    // 尝试从页面上获取已捕获的图片
    const imgElement = document.querySelector('img[alt="Captured"]') as HTMLImageElement;
    
    if (!imgElement || !imgElement.src) {
        console.error('❌ 未找到已捕获的图片！');
        console.log('💡 请先在 AI 识茄页面捕获或上传一张雪茄图片');
        return;
    }
    
    try {
        // 将图片转换为 base64
        const canvas = document.createElement('canvas');
        canvas.width = imgElement.naturalWidth || imgElement.width;
        canvas.height = imgElement.naturalHeight || imgElement.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            throw new Error('无法获取 canvas context');
        }
        
        ctx.drawImage(imgElement, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
        
        console.log('✅ 已获取图片，开始测试...');
        await window.testGeminiModels(base64);
        
    } catch (error) {
        console.error('❌ 获取图片失败:', error);
        console.log('💡 请手动提供 base64 编码的图片数据');
        console.log('使用方法: window.testGeminiModels(imageBase64)');
    }
};

// 初始化提示
console.log(`
╔════════════════════════════════════════════════════════════════
║ 🧪 Gemini 模型测试工具已加载
╚════════════════════════════════════════════════════════════════

使用方法:

1. 手动提供图片数据:
   window.testGeminiModels(imageBase64)

2. 使用页面上已捕获的图片:
   window.testGeminiModelsWithSampleImage()

建议步骤:
  1. 前往 "AI识茄" 页面
  2. 捕获或上传一张雪茄图片
  3. 打开浏览器控制台（F12）
  4. 运行: window.testGeminiModelsWithSampleImage()
  5. 等待测试完成（6-10分钟）

注意事项:
  ⚠️ 此测试将消耗大量 API 配额（约 170 次调用）
  ⚠️ 建议在非高峰时段进行测试
  ⚠️ 测试期间请勿关闭浏览器标签页

════════════════════════════════════════════════════════════════
`);

export {};

