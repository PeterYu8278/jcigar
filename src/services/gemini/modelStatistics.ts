/**
 * Gemini 模型统计服务
 * 用于分析测试结果并生成统计报告
 */

import type {
    ModelTestResult,
    CigarDataStatistics,
    FieldOccurrence,
    TestReport,
    TestConfig,
    FieldValueStatistics,
    ValueFrequency
} from '@/types/geminiTest';

// 字段显示名称映射
const FIELD_DISPLAY_NAMES: { [key: string]: string } = {
    origin: '产地',
    wrapper: '茄衣',
    binder: '茄套',
    filler: '茄芯',
    flavorProfile: '风味特征',
    footTasteNotes: '头段品吸笔记',
    bodyTasteNotes: '中段品吸笔记',
    headTasteNotes: '尾段品吸笔记',
    strength: '强度',
    size: '尺寸',
    description: '描述',
    rating: '评分',
    brandDescription: '品牌描述'
};

// 分析单个字段的值分布
function analyzeFieldValues(
    responses: any[],
    fieldName: string
): FieldValueStatistics {
    const valueCounts = new Map<string, number>();
    let nonEmptyCount = 0;
    let totalValues = 0;  // 用于数组字段
    
    responses.forEach(response => {
        const value = response[fieldName];
        
        if (value) {
            if (Array.isArray(value)) {
                // 数组字段（如 flavorProfile, tastingNotes）
                if (value.length > 0) {
                    nonEmptyCount++;
                    value.forEach(v => {
                        if (v && typeof v === 'string' && v.trim()) {
                            const normalized = v.trim();
                            valueCounts.set(normalized, (valueCounts.get(normalized) || 0) + 1);
                            totalValues++;
                        }
                    });
                }
            } else {
                // 单值字段（如 origin, wrapper）
                if (typeof value === 'string' && value.trim()) {
                    const normalized = value.trim();
                    valueCounts.set(normalized, (valueCounts.get(normalized) || 0) + 1);
                    nonEmptyCount++;
                } else if (typeof value === 'number') {
                    // 数字字段（如 rating）
                    valueCounts.set(String(value), (valueCounts.get(String(value)) || 0) + 1);
                    nonEmptyCount++;
                }
            }
        }
    });
    
    // 转换为频率数组并按出现次数降序排序
    const values: ValueFrequency[] = Array.from(valueCounts.entries())
        .map(([value, count]) => ({
            value,
            count,
            percentage: (count / responses.length) * 100
        }))
        .sort((a, b) => b.count - a.count);
    
    // 计算一致性评分（最高频率值的占比）
    const consistency = values.length > 0 ? values[0].percentage : 0;
    
    // 判断字段类型
    const isArrayField = responses.some(r => Array.isArray(r[fieldName]));
    
    const stats: FieldValueStatistics = {
        fieldName,
        displayName: FIELD_DISPLAY_NAMES[fieldName] || fieldName,
        fieldType: isArrayField ? 'array' : 'string',
        totalResponses: responses.length,
        nonEmptyCount,
        emptyCount: responses.length - nonEmptyCount,
        fillRate: (nonEmptyCount / responses.length) * 100,
        values,
        consistency
    };
    
    // 数组字段额外统计
    if (isArrayField && nonEmptyCount > 0) {
        stats.totalValues = totalValues;
        stats.avgValuesPerResponse = totalValues / nonEmptyCount;
    }
    
    return stats;
}

// 计算单个模型的所有字段值统计
export function calculateFieldValueStatsForModel(responses: any[]): {
    [fieldName: string]: FieldValueStatistics;
} {
    if (responses.length === 0) {
        return {};
    }
    
    const fieldsToAnalyze = [
        'origin', 'wrapper', 'binder', 'filler',
        'flavorProfile', 'footTasteNotes', 'bodyTasteNotes', 'headTasteNotes',
        'strength', 'size'
    ];
    
    const stats: { [key: string]: FieldValueStatistics } = {};
    
    fieldsToAnalyze.forEach(field => {
        stats[field] = analyzeFieldValues(responses, field);
    });
    
    return stats;
}

// 初始化雪茄数据统计
export function initializeCigarDataStatistics(): CigarDataStatistics {
    const createFieldOccurrence = (): FieldOccurrence => ({
        count: 0,
        rate: 0,
        avgConfidence: 0
    });
    
    return {
        fieldOccurrence: {
            brand: createFieldOccurrence(),
            name: createFieldOccurrence(),
            origin: createFieldOccurrence(),
            wrapper: createFieldOccurrence(),
            binder: createFieldOccurrence(),
            filler: createFieldOccurrence(),
            footTasteNotes: createFieldOccurrence(),
            bodyTasteNotes: createFieldOccurrence(),
            headTasteNotes: createFieldOccurrence(),
            flavorProfile: createFieldOccurrence(),
            strength: createFieldOccurrence(),
            size: createFieldOccurrence(),
            description: createFieldOccurrence(),
            rating: createFieldOccurrence(),
            brandDescription: createFieldOccurrence()
        },
        qualityMetrics: {
            completeDataSets: 0,
            partialDataSets: 0,
            emptyDataSets: 0,
            avgFieldsPerResponse: 0,
            avgConfidence: 0,
            totalResponses: 0
        },
        modelContribution: {}
    };
}

// 分析单个响应的数据质量
function analyzeResponseData(data: any, stats: CigarDataStatistics, modelName: string) {
    const fields = [
        'brand', 'name', 'origin', 'wrapper', 'binder', 'filler',
        'footTasteNotes', 'bodyTasteNotes', 'headTasteNotes',
        'flavorProfile', 'strength', 'size', 'description', 'rating', 'brandDescription'
    ];
    
    let filledFieldsCount = 0;
    const confidence = data.confidence || 0;
    
    fields.forEach(field => {
        const value = data[field];
        const hasValue = value && 
            (Array.isArray(value) ? value.length > 0 : value !== '' && value !== null);
        
        if (hasValue) {
            stats.fieldOccurrence[field as keyof typeof stats.fieldOccurrence].count++;
            filledFieldsCount++;
        }
    });
    
    // 更新模型贡献
    if (!stats.modelContribution[modelName]) {
        stats.modelContribution[modelName] = {
            totalResponses: 0,
            avgFieldCount: 0,
            avgConfidence: 0,
            topFields: []
        };
    }
    
    const contribution = stats.modelContribution[modelName];
    contribution.totalResponses++;
    contribution.avgFieldCount = 
        (contribution.avgFieldCount * (contribution.totalResponses - 1) + filledFieldsCount) / 
        contribution.totalResponses;
    contribution.avgConfidence = 
        (contribution.avgConfidence * (contribution.totalResponses - 1) + confidence) / 
        contribution.totalResponses;
    
    // 数据集完整度分类
    const completionRate = filledFieldsCount / fields.length;
    if (completionRate >= 0.9) {
        stats.qualityMetrics.completeDataSets++;
    } else if (completionRate >= 0.3) {
        stats.qualityMetrics.partialDataSets++;
    } else {
        stats.qualityMetrics.emptyDataSets++;
    }
    
    stats.qualityMetrics.totalResponses++;
    stats.qualityMetrics.avgFieldsPerResponse = 
        (stats.qualityMetrics.avgFieldsPerResponse * (stats.qualityMetrics.totalResponses - 1) + filledFieldsCount) / 
        stats.qualityMetrics.totalResponses;
    stats.qualityMetrics.avgConfidence = 
        (stats.qualityMetrics.avgConfidence * (stats.qualityMetrics.totalResponses - 1) + confidence) / 
        stats.qualityMetrics.totalResponses;
}

// 计算雪茄数据统计
export function calculateCigarDataStatistics(modelResults: ModelTestResult[]): CigarDataStatistics {
    const stats = initializeCigarDataStatistics();
    
    // 这里需要从实际的测试响应中收集数据
    // 由于测试服务中没有保存原始响应数据，这里先返回初始化的统计
    // 在实际实现中，需要在 testSingleModel 中收集每次成功的响应数据
    
    console.log('[ModelStatistics] ℹ️ 雪茄数据统计计算完成');
    
    return stats;
}

// 生成测试报告
export function generateTestReport(
    config: TestConfig,
    modelResults: ModelTestResult[],
    startTime: number,
    endTime: number
): TestReport {
    const cigarDataStats = calculateCigarDataStatistics(modelResults);
    
    // 计算汇总数据
    const reliableModels = modelResults.filter(r => r.isReliable).length;
    const totalSuccesses = modelResults.reduce((sum, r) => sum + r.successes, 0);
    const totalAttempts = modelResults.reduce((sum, r) => sum + r.attempts, 0);
    const avgSuccessRate = totalAttempts > 0 ? (totalSuccesses / totalAttempts) * 100 : 0;
    
    const avgResponseTime = modelResults.length > 0
        ? modelResults.reduce((sum, r) => sum + r.avgResponseTime, 0) / modelResults.length
        : 0;
    
    const avgDataCompleteness = modelResults.length > 0
        ? modelResults.reduce((sum, r) => sum + r.dataQuality.avgFieldCount, 0) / modelResults.length / 15 * 100
        : 0;
    
    // 找出 Top 5 模型
    const topModels = [...modelResults]
        .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
        .slice(0, 5)
        .map(r => r.modelName);
    
    // 生成优化建议
    const recommendations = generateRecommendations(modelResults, cigarDataStats);
    
    return {
        config,
        startTime,
        endTime,
        duration: endTime - startTime,
        modelResults,
        cigarDataStats,
        summary: {
            totalModels: modelResults.length,
            reliableModels,
            avgSuccessRate,
            avgResponseTime,
            avgDataCompleteness,
            topModels
        },
        recommendations
    };
}

// 生成优化建议
function generateRecommendations(
    modelResults: ModelTestResult[],
    cigarDataStats: CigarDataStatistics
): string[] {
    const recommendations: string[] = [];
    
    // 推荐模型
    const topModels = modelResults
        .filter(r => r.reliabilityScore >= 70)
        .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
        .slice(0, 3);
    
    if (topModels.length > 0) {
        recommendations.push(`✅ 推荐使用的模型: ${topModels.map(m => m.modelName).join(', ')}`);
    }
    
    // 警告不可靠的模型
    const unreliableModels = modelResults.filter(r => !r.isReliable);
    if (unreliableModels.length > 0) {
        recommendations.push(`⚠️ 不可用模型 (${unreliableModels.length}个): 考虑从配置中移除`);
    }
    
    // 配额问题
    const quotaErrors = modelResults.filter(r => 
        r.errors.some(e => e.type === '429')
    );
    if (quotaErrors.length > 0) {
        recommendations.push(`⚠️ ${quotaErrors.length} 个模型遇到配额限制，建议增加调用间隔或分批测试`);
    }
    
    // 数据质量建议
    const avgFieldCount = cigarDataStats.qualityMetrics.avgFieldsPerResponse;
    if (avgFieldCount < 10) {
        recommendations.push(`⚠️ 平均数据完整度较低 (${avgFieldCount.toFixed(1)}/15 字段)，建议优化 Prompt`);
    }
    
    // 具体字段建议
    const lowOccurrenceFields = Object.entries(cigarDataStats.fieldOccurrence)
        .filter(([_, value]) => value.rate < 0.5 && value.rate > 0)
        .sort((a, b) => a[1].rate - b[1].rate)
        .slice(0, 3);
    
    if (lowOccurrenceFields.length > 0) {
        const fieldNames = lowOccurrenceFields.map(([field, value]) => 
            `${field} (${(value.rate * 100).toFixed(0)}%)`
        ).join(', ');
        recommendations.push(`📝 数据缺失严重的字段: ${fieldNames} - 建议在 Prompt 中增加示例或强调`);
    }
    
    return recommendations;
}

// 打印单个模型的字段值统计
function printModelFieldValueStats(modelResult: ModelTestResult, rank: number) {
    console.group(`${rank}. 🤖 ${modelResult.modelName}`);
    console.log(`⚡ 响应: ${modelResult.avgResponseTime.toFixed(0)}ms | ✅ 成功: ${modelResult.successes}/${modelResult.attempts} | 🏆 可靠性: ${modelResult.reliabilityScore}分`);
    console.log('');
    
    // 重点字段：产地、茄衣、茄套、茄芯、风味、品吸、强度
    const keyFields = ['origin', 'wrapper', 'binder', 'filler', 'flavorProfile', 
                       'footTasteNotes', 'bodyTasteNotes', 'headTasteNotes', 'strength'];
    
    keyFields.forEach(fieldName => {
        const stats = modelResult.fieldValueStats[fieldName];
        if (!stats) return;
        
        // 字段标题
        const icon = {
            origin: '🌍',
            wrapper: '🍂',
            binder: '🌿',
            filler: '🌾',
            flavorProfile: '🎨',
            footTasteNotes: '👃',
            bodyTasteNotes: '👃',
            headTasteNotes: '👃',
            strength: '💪'
        }[fieldName] || '📋';
        
        console.log(`${icon} ${stats.displayName} (${fieldName})`);
        console.log(`   填充率: ${stats.fillRate.toFixed(0)}% (${stats.nonEmptyCount}/${stats.totalResponses})`);
        
        if (stats.fieldType === 'array' && stats.totalValues) {
            console.log(`   总值数: ${stats.totalValues}个, 平均每次: ${stats.avgValuesPerResponse?.toFixed(1)}个`);
        }
        
        if (stats.values.length > 0) {
            // 只显示前10个最常见的值
            const topValues = stats.values.slice(0, 10);
            const tableData: any = {};
            
            topValues.forEach(v => {
                tableData[v.value] = {
                    次数: `x${v.count}`,
                    占比: `${v.percentage.toFixed(1)}%`
                };
            });
            
            console.table(tableData);
        } else {
            console.log('   (无数据)');
        }
        
        // 添加未返回的统计
        if (stats.emptyCount > 0) {
            console.log(`   ⚠️ 未返回: ${stats.emptyCount}次 (${(stats.emptyCount / stats.totalResponses * 100).toFixed(0)}%)`);
        }
        
        console.log('');
    });
    
    // 数据质量总结
    const highQualityFields = Object.values(modelResult.fieldValueStats).filter(s => s.fillRate >= 80);
    const mediumQualityFields = Object.values(modelResult.fieldValueStats).filter(s => s.fillRate >= 50 && s.fillRate < 80);
    const lowQualityFields = Object.values(modelResult.fieldValueStats).filter(s => s.fillRate < 50);
    
    console.log('💡 数据质量总结:');
    console.log(`   ✅ 高质量字段 (填充率≥80%): ${highQualityFields.length}个`);
    if (highQualityFields.length > 0) {
        console.log(`      ${highQualityFields.map(f => f.displayName).join(', ')}`);
    }
    console.log(`   ⚠️ 中等质量字段 (填充率50-80%): ${mediumQualityFields.length}个`);
    if (mediumQualityFields.length > 0) {
        console.log(`      ${mediumQualityFields.map(f => f.displayName).join(', ')}`);
    }
    if (lowQualityFields.length > 0) {
        console.log(`   ❌ 低质量字段 (填充率<50%): ${lowQualityFields.length}个`);
        console.log(`      ${lowQualityFields.map(f => f.displayName).join(', ')}`);
    }
    
    console.groupEnd();
    console.log('');
}

// 打印控制台统计报告
export function printConsoleReport(report: TestReport) {
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('📊 测试完成 - 最终统计报告');
    console.log('═'.repeat(80));
    console.log('');
    
    // 1. 汇总信息
    console.group('📈 测试汇总');
    console.log(`⏱️  测试时长: ${(report.duration / 1000 / 60).toFixed(1)} 分钟`);
    console.log(`🤖 测试模型数: ${report.summary.totalModels}`);
    console.log(`✅ 可用模型数: ${report.summary.reliableModels} (${(report.summary.reliableModels / report.summary.totalModels * 100).toFixed(1)}%)`);
    console.log(`📊 平均成功率: ${report.summary.avgSuccessRate.toFixed(1)}%`);
    console.log(`⚡ 平均响应时间: ${report.summary.avgResponseTime.toFixed(0)}ms`);
    console.log(`📋 数据完整度: ${report.summary.avgDataCompleteness.toFixed(1)}%`);
    console.groupEnd();
    
    console.log('');
    
    // 2. 模型性能排名
    console.group('🏆 模型性能排名 (Top 10)');
    const topResults = [...report.modelResults]
        .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
        .slice(0, 10);
    
    console.table(topResults.map((r, index) => ({
        排名: index + 1,
        模型: r.modelName,
        成功率: `${(r.successes / r.attempts * 100).toFixed(1)}%`,
        响应时间: `${r.avgResponseTime.toFixed(0)}ms`,
        数据完整度: `${(r.dataQuality.avgFieldCount / 15 * 100).toFixed(1)}%`,
        可靠性评分: r.reliabilityScore,
        推荐: r.recommendation === 'highly_recommended' ? '⭐⭐⭐⭐⭐' :
              r.recommendation === 'recommended' ? '⭐⭐⭐⭐' :
              r.recommendation === 'use_with_caution' ? '⭐⭐⭐' : '⭐⭐'
    })));
    console.groupEnd();
    
    console.log('');
    
    // 3. 雪茄数据统计
    console.group('🥃 雪茄数据统计');
    console.log('📋 字段出现率:');
    console.table({
        '品牌 brand': { 
            出现率: `${(report.cigarDataStats.fieldOccurrence.brand.rate * 100).toFixed(1)}%`,
            出现次数: report.cigarDataStats.fieldOccurrence.brand.count
        },
        '名称 name': { 
            出现率: `${(report.cigarDataStats.fieldOccurrence.name.rate * 100).toFixed(1)}%`,
            出现次数: report.cigarDataStats.fieldOccurrence.name.count
        },
        '产地 origin': { 
            出现率: `${(report.cigarDataStats.fieldOccurrence.origin.rate * 100).toFixed(1)}%`,
            出现次数: report.cigarDataStats.fieldOccurrence.origin.count
        },
        '茄衣 wrapper': { 
            出现率: `${(report.cigarDataStats.fieldOccurrence.wrapper.rate * 100).toFixed(1)}%`,
            出现次数: report.cigarDataStats.fieldOccurrence.wrapper.count
        },
        '茄套 binder': { 
            出现率: `${(report.cigarDataStats.fieldOccurrence.binder.rate * 100).toFixed(1)}%`,
            出现次数: report.cigarDataStats.fieldOccurrence.binder.count
        },
        '茄芯 filler': { 
            出现率: `${(report.cigarDataStats.fieldOccurrence.filler.rate * 100).toFixed(1)}%`,
            出现次数: report.cigarDataStats.fieldOccurrence.filler.count
        },
        '品吸笔记 tasting': { 
            出现率: `${((report.cigarDataStats.fieldOccurrence.footTasteNotes.rate + 
                          report.cigarDataStats.fieldOccurrence.bodyTasteNotes.rate + 
                          report.cigarDataStats.fieldOccurrence.headTasteNotes.rate) / 3 * 100).toFixed(1)}%`,
            出现次数: report.cigarDataStats.fieldOccurrence.footTasteNotes.count + 
                     report.cigarDataStats.fieldOccurrence.bodyTasteNotes.count +
                     report.cigarDataStats.fieldOccurrence.headTasteNotes.count
        },
        '风味特征 flavor': { 
            出现率: `${(report.cigarDataStats.fieldOccurrence.flavorProfile.rate * 100).toFixed(1)}%`,
            出现次数: report.cigarDataStats.fieldOccurrence.flavorProfile.count
        },
        '强度 strength': { 
            出现率: `${(report.cigarDataStats.fieldOccurrence.strength.rate * 100).toFixed(1)}%`,
            出现次数: report.cigarDataStats.fieldOccurrence.strength.count
        }
    });
    
    console.log('');
    console.log('📊 数据质量:');
    console.log({
        完整数据集: `${report.cigarDataStats.qualityMetrics.completeDataSets}/${report.cigarDataStats.qualityMetrics.totalResponses} (${(report.cigarDataStats.qualityMetrics.completeDataSets / report.cigarDataStats.qualityMetrics.totalResponses * 100).toFixed(1)}%)`,
        部分数据集: `${report.cigarDataStats.qualityMetrics.partialDataSets}/${report.cigarDataStats.qualityMetrics.totalResponses} (${(report.cigarDataStats.qualityMetrics.partialDataSets / report.cigarDataStats.qualityMetrics.totalResponses * 100).toFixed(1)}%)`,
        平均字段数: `${report.cigarDataStats.qualityMetrics.avgFieldsPerResponse.toFixed(1)}/15`,
        平均置信度: report.cigarDataStats.qualityMetrics.avgConfidence.toFixed(2)
    });
    console.groupEnd();
    
    console.log('');
    
    // 4. 优化建议
    console.group('💡 优化建议');
    report.recommendations.forEach(rec => console.log(rec));
    console.groupEnd();
    
    console.log('');
    console.log('═'.repeat(80));
    
    // 5. 详细字段值统计（仅显示可用模型）
    const reliableModels = report.modelResults.filter(r => r.isReliable && r.responses.length > 0);
    
    if (reliableModels.length > 0) {
        console.log('');
        console.log('═'.repeat(80));
        console.log('📊 雪茄数据详细值统计（各模型）');
        console.log('═'.repeat(80));
        console.log('');
        
        reliableModels.forEach((modelResult, index) => {
            printModelFieldValueStats(modelResult, index + 1);
        });
    }
}

