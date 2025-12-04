/**
 * Gemini 模型测试服务
 * 用于测试所有 Gemini 模型的可用性和性能
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { 
    ModelTestResult, 
    TestConfig, 
    ErrorDetail,
    CigarDataStatistics 
} from '@/types/geminiTest';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// 获取所有可用的 Gemini 模型（不过滤）
export async function fetchAllGeminiModels(config: TestConfig): Promise<string[]> {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    const allModels: string[] = [];
    
    try {
        // 获取 v1 模型
        const v1Models = await genAI.listModels();
        v1Models.forEach((model: any) => {
            if (model.name?.includes('gemini')) {
                allModels.push(model.name.replace('models/', ''));
            }
        });
        
        console.log(`[ModelTester] ✅ 获取到 ${allModels.length} 个模型`);
        
        // 根据配置过滤
        let filteredModels = allModels;
        
        if (!config.includeExperimental) {
            filteredModels = filteredModels.filter(m => !m.includes('-exp'));
            console.log(`[ModelTester] ℹ️ 排除实验性模型，剩余 ${filteredModels.length} 个`);
        }
        
        if (!config.includePreview) {
            filteredModels = filteredModels.filter(m => !m.includes('-preview'));
            console.log(`[ModelTester] ℹ️ 排除预览版模型，剩余 ${filteredModels.length} 个`);
        }
        
        return filteredModels;
        
    } catch (error: any) {
        console.error('[ModelTester] ❌ 获取模型列表失败:', error.message);
        return [];
    }
}

// 将图片文件转换为 base64
async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 测试单个模型单次
async function testModelOnce(
    modelName: string,
    imageBase64: string,
    mimeType: string
): Promise<{
    success: boolean;
    responseTime: number;
    data?: any;
    error?: ErrorDetail;
}> {
    const startTime = Date.now();
    
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const prompt = `
Analyze this cigar image and provide detailed information.

Return the result strictly as a JSON object with the following keys:
- brand: string (brand name)
- name: string (full cigar name)
- origin: string (country)
- wrapper: string (wrapper tobacco)
- binder: string (binder tobacco)
- filler: string (filler tobacco)
- flavorProfile: array of strings
- strength: "Mild" | "Medium-Mild" | "Medium" | "Medium-Full" | "Full" | "Unknown"
- size: string (vitola)
- footTasteNotes: array of strings
- bodyTasteNotes: array of strings
- headTasteNotes: array of strings
- description: string
- brandDescription: string
- rating: number (0-100)
- confidence: number (0.0 to 1.0)
        `.trim();
        
        const result = await model.generateContent([
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: mimeType
                }
            },
            { text: prompt }
        ]);
        
        const responseTime = Date.now() - startTime;
        const text = result.response.text();
        
        // 尝试解析 JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const data = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        
        return {
            success: true,
            responseTime,
            data
        };
        
    } catch (error: any) {
        const responseTime = Date.now() - startTime;
        
        // 分类错误
        let errorType: 'timeout' | '404' | '429' | '500' | 'other' = 'other';
        
        if (error.message?.includes('404')) {
            errorType = '404';
        } else if (error.message?.includes('429')) {
            errorType = '429';
        } else if (error.message?.includes('500') || error.message?.includes('503')) {
            errorType = '500';
        } else if (error.message?.includes('timeout')) {
            errorType = 'timeout';
        }
        
        return {
            success: false,
            responseTime,
            error: {
                type: errorType,
                count: 1,
                messages: [error.message || 'Unknown error']
            }
        };
    }
}

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 测试单个模型多次
export async function testSingleModel(
    modelName: string,
    imageFile: File,
    testTimes: number,
    delayMs: number,
    onProgress?: (attempt: number, total: number) => void
): Promise<ModelTestResult> {
    console.group(`[ModelTester] 🧪 测试模型: ${modelName}`);
    
    const imageBase64 = await fileToBase64(imageFile);
    const mimeType = imageFile.type;
    
    const result: ModelTestResult = {
        modelName,
        apiVersion: modelName.includes('v1beta') ? 'v1beta' : 'v1',
        attempts: testTimes,
        successes: 0,
        failures: 0,
        errors: [],
        responseTimes: [],
        avgResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        dataQuality: {
            avgFieldCount: 0,
            avgConfidence: 0,
            bestFields: []
        },
        isReliable: false,
        reliabilityScore: 0,
        recommendation: 'not_recommended'
    };
    
    let totalFieldCount = 0;
    let totalConfidence = 0;
    const fieldCounts: { [key: string]: number } = {};
    
    // 执行测试
    for (let i = 0; i < testTimes; i++) {
        console.log(`[ModelTester] 📍 尝试 ${i + 1}/${testTimes}...`);
        onProgress?.(i + 1, testTimes);
        
        const testResult = await testModelOnce(modelName, imageBase64, mimeType);
        
        result.responseTimes.push(testResult.responseTime);
        result.minResponseTime = Math.min(result.minResponseTime, testResult.responseTime);
        result.maxResponseTime = Math.max(result.maxResponseTime, testResult.responseTime);
        
        if (testResult.success && testResult.data) {
            result.successes++;
            
            // 统计字段
            const fields = Object.keys(testResult.data);
            totalFieldCount += fields.length;
            
            fields.forEach(field => {
                const value = testResult.data[field];
                if (value && (Array.isArray(value) ? value.length > 0 : value !== '')) {
                    fieldCounts[field] = (fieldCounts[field] || 0) + 1;
                }
            });
            
            if (testResult.data.confidence) {
                totalConfidence += testResult.data.confidence;
            }
            
            console.log(`[ModelTester] ✅ 成功 - 响应时间: ${testResult.responseTime}ms, 字段数: ${fields.length}`);
            
        } else {
            result.failures++;
            
            // 记录错误
            if (testResult.error) {
                const existingError = result.errors.find(e => e.type === testResult.error!.type);
                if (existingError) {
                    existingError.count++;
                    existingError.messages.push(...testResult.error.messages);
                } else {
                    result.errors.push(testResult.error);
                }
            }
            
            console.log(`[ModelTester] ❌ 失败 - ${testResult.error?.type}: ${testResult.error?.messages[0]}`);
        }
        
        // 延迟避免配额耗尽
        if (i < testTimes - 1) {
            await delay(delayMs);
        }
    }
    
    // 计算统计数据
    result.avgResponseTime = result.responseTimes.reduce((a, b) => a + b, 0) / result.responseTimes.length;
    result.isReliable = result.successes > 0;
    
    if (result.successes > 0) {
        result.dataQuality.avgFieldCount = totalFieldCount / result.successes;
        result.dataQuality.avgConfidence = totalConfidence / result.successes;
        
        // 找出最常返回的字段
        result.dataQuality.bestFields = Object.entries(fieldCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([field]) => field);
    }
    
    // 计算可靠性评分 (0-100)
    const successRate = result.successes / result.attempts;
    const responseTimeScore = Math.max(0, 100 - (result.avgResponseTime / 50)); // 5秒 = 0分
    const dataQualityScore = (result.dataQuality.avgFieldCount / 15) * 100; // 15个字段为满分
    
    result.reliabilityScore = Math.round(
        successRate * 50 +  // 成功率占50%
        (responseTimeScore / 100) * 30 +  // 响应时间占30%
        (dataQualityScore / 100) * 20  // 数据质量占20%
    );
    
    // 生成推荐
    if (result.reliabilityScore >= 80) {
        result.recommendation = 'highly_recommended';
    } else if (result.reliabilityScore >= 60) {
        result.recommendation = 'recommended';
    } else if (result.reliabilityScore >= 40) {
        result.recommendation = 'use_with_caution';
    } else {
        result.recommendation = 'not_recommended';
    }
    
    console.log(`[ModelTester] 📊 测试完成 - 成功率: ${(successRate * 100).toFixed(1)}%, 可靠性评分: ${result.reliabilityScore}`);
    console.groupEnd();
    
    return result;
}

// 测试所有模型
export async function testAllModels(
    config: TestConfig,
    onProgress?: (current: number, total: number, modelName: string) => void
): Promise<ModelTestResult[]> {
    console.log('🚀 开始 Gemini 模型全面测试');
    console.log(`📷 测试图片: ${config.testImage?.name}`);
    console.log(`🔢 测试配置: 每个模型测试 ${config.testTimes} 次`);
    console.log(`⏱️ 调用间隔: ${config.delayBetweenCalls}ms`);
    console.log('─'.repeat(60));
    
    if (!config.testImage) {
        throw new Error('请上传测试图片');
    }
    
    const models = await fetchAllGeminiModels(config);
    const results: ModelTestResult[] = [];
    
    for (let i = 0; i < models.length; i++) {
        const modelName = models[i];
        onProgress?.(i + 1, models.length, modelName);
        
        try {
            const result = await testSingleModel(
                modelName,
                config.testImage,
                config.testTimes,
                config.delayBetweenCalls
            );
            results.push(result);
        } catch (error: any) {
            console.error(`[ModelTester] ❌ 测试模型 ${modelName} 失败:`, error.message);
        }
        
        // 模型之间的延迟
        if (i < models.length - 1) {
            await delay(config.delayBetweenCalls);
        }
    }
    
    console.log('\n');
    console.log('═'.repeat(60));
    console.log('✅ 所有模型测试完成');
    console.log('═'.repeat(60));
    
    return results;
}

