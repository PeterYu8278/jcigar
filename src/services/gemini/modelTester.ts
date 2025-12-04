/**
 * Gemini 模型全面测试工具
 * 用于测试所有 Gemini 模型的性能和数据质量
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// 测试结果数据结构
export interface ModelTestResult {
    modelName: string;
    successCount: number;
    failCount: number;
    totalAttempts: number;
    successRate: number;
    errors: string[];
    responseTimes: number[];
    avgResponseTime: number;
    dataQuality: DataQualityMetrics;
}

export interface DataQualityMetrics {
    hasImageUrl: number;
    hasBrandDescription: number;
    hasBrandFoundedYear: number;
    hasOrigin: number;
    hasSize: number;
    hasWrapper: number;
    hasBinder: number;
    hasFiller: number;
    hasFootTasteNotes: number;
    hasBodyTasteNotes: number;
    hasHeadTasteNotes: number;
    hasFlavorProfile: number;
    hasStrength: number;
    hasDescription: number;
    hasRating: number;
    avgConfidence: number;
    confidences: number[];
}

export interface FieldStatistics {
    fieldName: string;
    displayName: string;
    category: string;
    totalTests: number;
    presentCount: number;
    absentCount: number;
    presenceRate: number;
    validCount: number;
    invalidCount: number;
    byModel: Map<string, { present: number; absent: number; rate: number }>;
}

export interface TestSession {
    startTime: Date;
    endTime?: Date;
    totalTests: number;
    modelResults: Map<string, ModelTestResult>;
    fieldStatistics: Map<string, FieldStatistics>;
    summary: {
        totalModels: number;
        availableModels: string[];
        reliableModels: string[];
        unreliableModels: string[];
        failedModels: string[];
    };
}

// 获取所有可用模型（不过滤）
async function getAllModelsUnfiltered(): Promise<string[]> {
    if (!API_KEY) {
        throw new Error('VITE_GEMINI_API_KEY 未配置');
    }

    const apiVersions = ['v1', 'v1beta'];
    const allModels = new Set<string>();

    console.log(`\n🔍 开始获取所有 Gemini 模型（无过滤）...`);

    for (const version of apiVersions) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/${version}/models?key=${API_KEY}`
            );

            if (!response.ok) {
                console.warn(`⚠️ ${version} API 请求失败:`, response.status);
                continue;
            }

            const data = await response.json();
            const models = data.models || [];

            const modelNames = models
                .map((model: any) => {
                    const name = model.name || '';
                    const modelName = name.replace(/^models\//, '');
                    const supportedMethods = model.supportedGenerationMethods || [];
                    const supportsGenerateContent = supportedMethods.includes('generateContent');

                    if (modelName && modelName.includes('gemini') && supportsGenerateContent) {
                        return modelName;
                    }
                    return null;
                })
                .filter((name: string | null): name is string => name !== null);

            if (modelNames.length > 0) {
                modelNames.forEach((model: string) => allModels.add(model));
                console.log(`  ✅ ${version} API: 找到 ${modelNames.length} 个模型`);
            }
        } catch (error) {
            console.warn(`  ⚠️ ${version} API 调用失败:`, error);
            continue;
        }
    }

    const uniqueModels = Array.from(allModels).sort();
    console.log(`\n✅ 总共找到 ${uniqueModels.length} 个支持 generateContent 的 Gemini 模型`);
    console.log(`📋 模型列表:`, uniqueModels);

    return uniqueModels;
}

// 创建测试提示词
function createTestPrompt(): string {
    return `
Analyze this cigar image and provide detailed information.

Return the result strictly as a JSON object with the following keys:
- brand: string (brand name)
- brandDescription: string (brand history, 2-3 sentences)
- brandFoundedYear: number (founding year)
- name: string (full cigar name)
- origin: string (country)
- size: string (vitola name)
- flavorProfile: array of strings
- strength: "Mild" | "Medium" | "Full"
- wrapper: string (wrapper tobacco)
- binder: string (binder tobacco)
- filler: string (filler tobacco)
- footTasteNotes: array of strings (first third tasting notes)
- bodyTasteNotes: array of strings (middle third tasting notes)
- headTasteNotes: array of strings (final third tasting notes)
- description: string (2 sentences)
- rating: number (0-100)
- confidence: number (0-1)

IMPORTANT: Try to provide as much information as possible. Use reasonable inferences based on brand and visual cues.
`.trim();
}

// 检查字段是否存在
function checkFieldPresence(value: any, fieldType: 'string' | 'number' | 'array'): boolean {
    if (value === null || value === undefined) return false;

    switch (fieldType) {
        case 'string':
            return typeof value === 'string' && value.trim().length > 0;
        case 'array':
            return Array.isArray(value) && value.length > 0;
        case 'number':
            return typeof value === 'number' && !isNaN(value);
        default:
            return !!value;
    }
}

// 检查字段有效性
function checkFieldValidity(value: any, fieldType: 'string' | 'number' | 'array'): boolean {
    if (!checkFieldPresence(value, fieldType)) return false;

    switch (fieldType) {
        case 'string':
            const str = value.trim().toLowerCase();
            return str !== 'unknown' && str !== 'null' && str !== 'n/a' && str.length >= 2;
        case 'array':
            return value.some((item: any) =>
                typeof item === 'string' && item.trim().length > 0 && item.toLowerCase() !== 'unknown'
            );
        case 'number':
            return value > 0;
        default:
            return true;
    }
}

// 格式化品吸笔记
function formatTasteNotes(notes: string[] | string | null | undefined): string {
    if (!notes) return '❌ 未提供';
    if (Array.isArray(notes)) {
        return notes.length > 0 ? `✅ ${notes.join(', ')}` : '❌ 空数组';
    }
    return notes.trim().length > 0 ? `✅ ${notes}` : '❌ 空字符串';
}

// 计算数据完整度
function calculateDataCompleteness(result: any): number {
    const fields = [
        'brandDescription',
        'brandFoundedYear',
        'origin',
        'size',
        'wrapper',
        'binder',
        'filler',
        'footTasteNotes',
        'bodyTasteNotes',
        'headTasteNotes',
        'flavorProfile',
        'strength',
        'description',
        'rating'
    ];

    let presentFields = 0;
    fields.forEach(field => {
        if (checkFieldPresence(result[field], Array.isArray(result[field]) ? 'array' : typeof result[field] === 'number' ? 'number' : 'string')) {
            presentFields++;
        }
    });

    return Math.round((presentFields / fields.length) * 100);
}

// 测试单个模型单次
async function testSingleModel(modelName: string, imageBase64: string, testNum: number): Promise<any> {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = createTestPrompt();
    const imagePart = {
        inlineData: {
            data: imageBase64,
            mimeType: 'image/jpeg'
        }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
}

// 初始化字段统计
function initializeFieldStatistics(): Map<string, FieldStatistics> {
    const fields = [
        { name: 'brandDescription', displayName: '品牌简介', category: '品牌信息' },
        { name: 'brandFoundedYear', displayName: '成立年份', category: '品牌信息' },
        { name: 'origin', displayName: '产地', category: '基础信息' },
        { name: 'size', displayName: '尺寸', category: '基础信息' },
        { name: 'wrapper', displayName: '茄衣', category: '🌿 烟叶构造' },
        { name: 'binder', displayName: '茄套', category: '🌿 烟叶构造' },
        { name: 'filler', displayName: '茄芯', category: '🌿 烟叶构造' },
        { name: 'footTasteNotes', displayName: '脚部品吸', category: '👃 品吸笔记' },
        { name: 'bodyTasteNotes', displayName: '主体品吸', category: '👃 品吸笔记' },
        { name: 'headTasteNotes', displayName: '头部品吸', category: '👃 品吸笔记' },
        { name: 'flavorProfile', displayName: '风味轮廓', category: '🎨 风味特征' },
        { name: 'strength', displayName: '强度', category: '🎨 风味特征' },
        { name: 'description', displayName: '描述', category: '其他' },
        { name: 'rating', displayName: '评分', category: '其他' }
    ];

    const statsMap = new Map<string, FieldStatistics>();

    fields.forEach(field => {
        statsMap.set(field.name, {
            fieldName: field.name,
            displayName: field.displayName,
            category: field.category,
            totalTests: 0,
            presentCount: 0,
            absentCount: 0,
            presenceRate: 0,
            validCount: 0,
            invalidCount: 0,
            byModel: new Map()
        });
    });

    return statsMap;
}

// 更新字段统计
function updateFieldStatistics(
    result: any,
    modelName: string,
    fieldStats: Map<string, FieldStatistics>
) {
    const fieldTypes: Record<string, 'string' | 'number' | 'array'> = {
        brandDescription: 'string',
        brandFoundedYear: 'number',
        origin: 'string',
        size: 'string',
        wrapper: 'string',
        binder: 'string',
        filler: 'string',
        footTasteNotes: 'array',
        bodyTasteNotes: 'array',
        headTasteNotes: 'array',
        flavorProfile: 'array',
        strength: 'string',
        description: 'string',
        rating: 'number'
    };

    fieldStats.forEach((stat, fieldName) => {
        const value = result[fieldName];
        const fieldType = fieldTypes[fieldName];
        const isPresent = checkFieldPresence(value, fieldType);
        const isValid = checkFieldValidity(value, fieldType);

        stat.totalTests++;

        if (isPresent) {
            stat.presentCount++;
            if (isValid) {
                stat.validCount++;
            } else {
                stat.invalidCount++;
            }
        } else {
            stat.absentCount++;
        }

        // 更新模型统计
        if (!stat.byModel.has(modelName)) {
            stat.byModel.set(modelName, { present: 0, absent: 0, rate: 0 });
        }

        const modelStat = stat.byModel.get(modelName)!;
        if (isPresent) {
            modelStat.present++;
        } else {
            modelStat.absent++;
        }
        modelStat.rate = (modelStat.present / (modelStat.present + modelStat.absent)) * 100;

        stat.presenceRate = (stat.presentCount / stat.totalTests) * 100;
    });
}

// 生成进度条
function generateProgressBar(percentage: number): string {
    const total = 20;
    const filled = Math.round(percentage / 5);
    const empty = total - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

// 主测试函数
export async function runComprehensiveModelTest(imageBase64: string): Promise<TestSession> {
    console.log(`
╔════════════════════════════════════════════════════════════════
║ 🧪 GEMINI 模型全面测试开始
╚════════════════════════════════════════════════════════════════
测试时间: ${new Date().toLocaleString()}
测试策略:
  1. 获取所有 Gemini 模型（无过滤）
  2. 每个模型测试 5 次
  3. 统计成功率和数据质量
  4. 只要成功 1 次即标记为"可用"
════════════════════════════════════════════════════════════════
`);

    const testSession: TestSession = {
        startTime: new Date(),
        totalTests: 0,
        modelResults: new Map(),
        fieldStatistics: initializeFieldStatistics(),
        summary: {
            totalModels: 0,
            availableModels: [],
            reliableModels: [],
            unreliableModels: [],
            failedModels: []
        }
    };

    // 获取所有模型
    const allModels = await getAllModelsUnfiltered();
    testSession.summary.totalModels = allModels.length;

    console.log(`\n📊 将测试 ${allModels.length} 个模型，每个模型 5 次`);
    console.log(`📊 总测试次数: ${allModels.length * 5}`);
    console.log(`⏱️ 预计耗时: ${Math.ceil(allModels.length * 5 * 2 / 60)} 分钟\n`);

    // 测试每个模型
    for (let modelIndex = 0; modelIndex < allModels.length; modelIndex++) {
        const modelName = allModels[modelIndex];

        console.log(`
───────────────────────────────────────────────────────────────
📋 模型 ${modelIndex + 1}/${allModels.length}: ${modelName}
───────────────────────────────────────────────────────────────`);

        const modelResult: ModelTestResult = {
            modelName,
            successCount: 0,
            failCount: 0,
            totalAttempts: 5,
            successRate: 0,
            errors: [],
            responseTimes: [],
            avgResponseTime: 0,
            dataQuality: {
                hasImageUrl: 0,
                hasBrandDescription: 0,
                hasBrandFoundedYear: 0,
                hasOrigin: 0,
                hasSize: 0,
                hasWrapper: 0,
                hasBinder: 0,
                hasFiller: 0,
                hasFootTasteNotes: 0,
                hasBodyTasteNotes: 0,
                hasHeadTasteNotes: 0,
                hasFlavorProfile: 0,
                hasStrength: 0,
                hasDescription: 0,
                hasRating: 0,
                avgConfidence: 0,
                confidences: []
            }
        };

        // 测试5次
        for (let testNum = 1; testNum <= 5; testNum++) {
            console.log(`\n🔄 [${modelName}] 测试 ${testNum}/5`);

            const startTime = performance.now();

            try {
                const result = await testSingleModel(modelName, imageBase64, testNum);
                const endTime = performance.now();
                const responseTime = endTime - startTime;

                modelResult.responseTimes.push(responseTime);
                modelResult.successCount++;

                // 更新数据质量统计
                if (result.brandDescription) modelResult.dataQuality.hasBrandDescription++;
                if (result.brandFoundedYear) modelResult.dataQuality.hasBrandFoundedYear++;
                if (result.origin) modelResult.dataQuality.hasOrigin++;
                if (result.size) modelResult.dataQuality.hasSize++;
                if (result.wrapper) modelResult.dataQuality.hasWrapper++;
                if (result.binder) modelResult.dataQuality.hasBinder++;
                if (result.filler) modelResult.dataQuality.hasFiller++;
                if (result.footTasteNotes && (Array.isArray(result.footTasteNotes) ? result.footTasteNotes.length > 0 : true)) {
                    modelResult.dataQuality.hasFootTasteNotes++;
                }
                if (result.bodyTasteNotes && (Array.isArray(result.bodyTasteNotes) ? result.bodyTasteNotes.length > 0 : true)) {
                    modelResult.dataQuality.hasBodyTasteNotes++;
                }
                if (result.headTasteNotes && (Array.isArray(result.headTasteNotes) ? result.headTasteNotes.length > 0 : true)) {
                    modelResult.dataQuality.hasHeadTasteNotes++;
                }
                if (result.flavorProfile && result.flavorProfile.length > 0) {
                    modelResult.dataQuality.hasFlavorProfile++;
                }
                if (result.strength) modelResult.dataQuality.hasStrength++;
                if (result.description) modelResult.dataQuality.hasDescription++;
                if (result.rating) modelResult.dataQuality.hasRating++;
                if (result.confidence) {
                    modelResult.dataQuality.confidences.push(result.confidence);
                }

                // 更新字段统计
                updateFieldStatistics(result, modelName, testSession.fieldStatistics);

                // 显示数据完整度
                const completeness = calculateDataCompleteness(result);

                console.log(`✅ [${modelName}] 测试 ${testNum}/5 成功 (${responseTime.toFixed(0)}ms)`);
                console.log(`   品牌: ${result.brand || '❌'}`);
                console.log(`   名称: ${result.name || '❌'}`);
                console.log(`   置信度: ${result.confidence || 0}`);
                console.log(`   🌿 烟叶构造: 茄衣=${result.wrapper ? '✅' : '❌'} 茄套=${result.binder ? '✅' : '❌'} 茄芯=${result.filler ? '✅' : '❌'}`);
                console.log(`   👃 品吸笔记: 脚部=${formatTasteNotes(result.footTasteNotes)} 主体=${formatTasteNotes(result.bodyTasteNotes)} 头部=${formatTasteNotes(result.headTasteNotes)}`);
                console.log(`   📊 数据完整度: ${completeness}/100`);

                testSession.totalTests++;

                // 延迟1秒避免 rate limit
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error: any) {
                const endTime = performance.now();
                const responseTime = endTime - startTime;

                modelResult.responseTimes.push(responseTime);
                modelResult.failCount++;
                const errorMsg = error?.message || error?.toString() || 'Unknown error';
                modelResult.errors.push(errorMsg);

                console.log(`❌ [${modelName}] 测试 ${testNum}/5 失败 (${responseTime.toFixed(0)}ms)`);
                console.log(`   错误: ${errorMsg.substring(0, 100)}`);

                testSession.totalTests++;

                // 延迟1秒
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // 计算模型统计
        modelResult.successRate = (modelResult.successCount / 5) * 100;
        modelResult.avgResponseTime =
            modelResult.responseTimes.reduce((a, b) => a + b, 0) / modelResult.responseTimes.length;
        modelResult.dataQuality.avgConfidence =
            modelResult.dataQuality.confidences.length > 0
                ? modelResult.dataQuality.confidences.reduce((a, b) => a + b, 0) /
                  modelResult.dataQuality.confidences.length
                : 0;

        testSession.modelResults.set(modelName, modelResult);

        // 显示模型测试总结
        const stars = '★'.repeat(Math.ceil(modelResult.successRate / 20));
        console.log(`\n📊 [${modelName}] 测试完成:`);
        console.log(`   成功次数: ${modelResult.successCount}/5`);
        console.log(`   成功率: ${modelResult.successRate.toFixed(1)}% ${stars}`);
        console.log(`   平均响应时间: ${modelResult.avgResponseTime.toFixed(0)}ms`);
        console.log(`   平均置信度: ${modelResult.dataQuality.avgConfidence.toFixed(2)}`);

        // 判断模型可用性
        if (modelResult.successCount >= 1) {
            testSession.summary.availableModels.push(modelName);
            if (modelResult.successRate >= 80) {
                testSession.summary.reliableModels.push(modelName);
                console.log(`   ✅ 状态: 可靠模型 (≥80%)`);
            } else if (modelResult.successRate >= 50) {
                console.log(`   ⚠️ 状态: 可用但不够可靠 (50-80%)`);
            } else {
                testSession.summary.unreliableModels.push(modelName);
                console.log(`   ⚠️ 状态: 不可靠 (<50%)`);
            }
        } else {
            testSession.summary.failedModels.push(modelName);
            console.log(`   ❌ 状态: 完全失败 (0/5)`);
        }
    }

    testSession.endTime = new Date();

    // 生成最终报告
    printFinalReport(testSession);

    return testSession;
}

// 打印最终报告
function printFinalReport(testSession: TestSession) {
    const duration = ((testSession.endTime!.getTime() - testSession.startTime.getTime()) / 1000 / 60).toFixed(1);

    console.log(`
╔════════════════════════════════════════════════════════════════
║ 📊 GEMINI 模型测试总结报告
╚════════════════════════════════════════════════════════════════
测试完成时间: ${testSession.endTime!.toLocaleString()}
总耗时: ${duration} 分钟
总测试次数: ${testSession.totalTests}
════════════════════════════════════════════════════════════════

📈 模型可用性统计:
────────────────────────────────────────────────────────────────
  总模型数: ${testSession.summary.totalModels}
  可用模型 (≥1次成功): ${testSession.summary.availableModels.length}
  可靠模型 (≥80%成功率): ${testSession.summary.reliableModels.length}
  不可靠模型 (<50%成功率): ${testSession.summary.unreliableModels.length}
  完全失败模型: ${testSession.summary.failedModels.length}

════════════════════════════════════════════════════════════════
🏆 推荐使用的模型（按成功率排序）:
════════════════════════════════════════════════════════════════
`);

    // 按成功率排序
    const sortedModels = Array.from(testSession.modelResults.entries()).sort(
        (a, b) => b[1].successRate - a[1].successRate
    );

    sortedModels.forEach(([name, result], index) => {
        const stars = '★'.repeat(Math.ceil(result.successRate / 20));
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
        console.log(
            `${medal} ${(index + 1).toString().padStart(2)}. ${name.padEnd(45)} ${result.successRate.toFixed(1)}% ${stars}`
        );
        console.log(
            `      响应: ${result.avgResponseTime.toFixed(0)}ms | 置信度: ${result.dataQuality.avgConfidence.toFixed(2)} | 构造: ${result.dataQuality.hasWrapper + result.dataQuality.hasBinder + result.dataQuality.hasFiller}/15 | 品吸: ${result.dataQuality.hasFootTasteNotes + result.dataQuality.hasBodyTasteNotes + result.dataQuality.hasHeadTasteNotes}/15`
        );
    });

    console.log(`
════════════════════════════════════════════════════════════════
📋 雪茄数据字段统计
════════════════════════════════════════════════════════════════
`);

    // 按类别分组
    const categories = new Map<string, string[]>();
    testSession.fieldStatistics.forEach((stat, fieldName) => {
        if (!categories.has(stat.category)) {
            categories.set(stat.category, []);
        }
        categories.get(stat.category)!.push(fieldName);
    });

    categories.forEach((fields, category) => {
        console.log(`\n${category}:`);
        console.log('─'.repeat(64));

        fields.forEach(fieldName => {
            const stat = testSession.fieldStatistics.get(fieldName)!;
            const presenceRate = stat.presenceRate.toFixed(1);
            const validRate = ((stat.validCount / stat.totalTests) * 100).toFixed(1);
            const bar = generateProgressBar(parseFloat(presenceRate));
            const quality = parseFloat(validRate) >= 70 ? '✅' : parseFloat(validRate) >= 40 ? '⚠️' : '❌';

            console.log(`  ${stat.displayName.padEnd(12)} ${quality}`);
            console.log(`    出现率: ${presenceRate}% ${bar}`);
            console.log(`    有效率: ${validRate}%`);
            console.log(`    出现: ${stat.presentCount}/${stat.totalTests} | 有效: ${stat.validCount}/${stat.presentCount}`);
        });
    });

    console.log(`
════════════════════════════════════════════════════════════════
❌ 需要移除的模型（完全失败或<30%成功率）:
════════════════════════════════════════════════════════════════
`);

    const failedModels = sortedModels.filter(([_, result]) => result.successRate < 30);
    if (failedModels.length > 0) {
        failedModels.forEach(([name, result]) => {
            console.log(`❌ ${name}: ${result.successRate.toFixed(1)}%`);
            if (result.errors.length > 0) {
                console.log(`   典型错误: ${result.errors[0].substring(0, 80)}`);
            }
        });
    } else {
        console.log(`✅ 没有需要移除的模型！所有模型成功率都 ≥30%`);
    }

    console.log(`
════════════════════════════════════════════════════════════════
💡 优化建议:
════════════════════════════════════════════════════════════════
`);

    // 生成建议
    const recommendations: string[] = [];

    // 1. 模型过滤建议
    if (failedModels.length > 0) {
        const modelsToFilter = failedModels.map(([name]) => name);
        recommendations.push(`建议过滤以下 ${modelsToFilter.length} 个模型:`);
        modelsToFilter.forEach(name => {
            recommendations.push(`  - ${name}`);
        });
    }

    // 2. 优先使用建议
    const topModels = sortedModels.filter(([_, result]) => result.successRate >= 80).slice(0, 5);
    if (topModels.length > 0) {
        recommendations.push(`\n建议优先使用以下 ${topModels.length} 个高成功率模型:`);
        topModels.forEach(([name, result]) => {
            recommendations.push(`  - ${name} (${result.successRate.toFixed(1)}%)`);
        });
    }

    // 3. 数据字段建议
    const lowPresenceFields = Array.from(testSession.fieldStatistics.values())
        .filter(stat => stat.presenceRate < 50)
        .sort((a, b) => a.presenceRate - b.presenceRate);

    if (lowPresenceFields.length > 0) {
        recommendations.push(`\n以下 ${lowPresenceFields.length} 个字段出现率较低，建议优化 Prompt:`);
        lowPresenceFields.forEach(stat => {
            recommendations.push(`  - ${stat.displayName} (${stat.presenceRate.toFixed(1)}%)`);
        });
    }

    recommendations.forEach(rec => console.log(rec));

    console.log(`
════════════════════════════════════════════════════════════════
✅ 测试完成！
════════════════════════════════════════════════════════════════
`);
}

