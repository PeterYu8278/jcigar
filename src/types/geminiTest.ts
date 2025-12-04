/**
 * Gemini 模型测试系统 - 类型定义
 */

// 错误类型
export type ErrorType = '404' | '429' | '500' | 'timeout' | 'other';

// 错误详情
export interface ErrorDetail {
    type: ErrorType;
    count: number;
    messages: string[];
}

// 雪茄数据字段统计
export interface FieldOccurrence {
    count: number;
    rate: number;
    avgConfidence?: number;
}

// 雪茄数据统计
export interface CigarDataStatistics {
    // 字段出现率统计
    fieldOccurrence: {
        brand: FieldOccurrence;
        name: FieldOccurrence;
        origin: FieldOccurrence;
        wrapper: FieldOccurrence;
        binder: FieldOccurrence;
        filler: FieldOccurrence;
        footTasteNotes: FieldOccurrence;
        bodyTasteNotes: FieldOccurrence;
        headTasteNotes: FieldOccurrence;
        flavorProfile: FieldOccurrence;
        strength: FieldOccurrence;
        size: FieldOccurrence;
        description: FieldOccurrence;
        rating: FieldOccurrence;
        brandDescription: FieldOccurrence;
    };
    
    // 数据质量统计
    qualityMetrics: {
        completeDataSets: number;      // 完整数据集数量 (>90%字段)
        partialDataSets: number;       // 部分数据集 (30-90%字段)
        emptyDataSets: number;         // 空数据集 (<30%字段)
        avgFieldsPerResponse: number;  // 平均字段数
        avgConfidence: number;         // 平均置信度
        totalResponses: number;        // 总响应数
    };
    
    // 各模型的数据贡献
    modelContribution: {
        [modelName: string]: {
            totalResponses: number;
            avgFieldCount: number;
            avgConfidence: number;
            topFields: string[];  // 该模型最擅长返回的字段
        };
    };
}

// 单个模型测试结果
export interface ModelTestResult {
    modelName: string;
    apiVersion: 'v1' | 'v1beta';
    attempts: number;
    successes: number;
    failures: number;
    errors: ErrorDetail[];
    responseTimes: number[];  // 每次响应时间（毫秒）
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    dataQuality: {
        avgFieldCount: number;
        avgConfidence: number;
        bestFields: string[];  // 最常返回的字段
    };
    isReliable: boolean; // 至少1次成功
    reliabilityScore: number; // 0-100
    recommendation: 'highly_recommended' | 'recommended' | 'use_with_caution' | 'not_recommended';
}

// 测试配置
export interface TestConfig {
    testImage: File | null;
    testTimes: number;  // 每个模型测试次数
    concurrency: number;  // 并发数
    includeExperimental: boolean;  // 包含实验性模型
    includePreview: boolean;  // 包含预览版模型
    delayBetweenCalls: number;  // 调用间隔（毫秒）
}

// 测试进度
export interface TestProgress {
    currentModel: string;
    currentAttempt: number;
    totalAttempts: number;
    completedModels: number;
    totalModels: number;
    percentage: number;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
    startTime?: number;
    estimatedEndTime?: number;
}

// 完整测试报告
export interface TestReport {
    config: TestConfig;
    startTime: number;
    endTime: number;
    duration: number;
    modelResults: ModelTestResult[];
    cigarDataStats: CigarDataStatistics;
    summary: {
        totalModels: number;
        reliableModels: number;
        avgSuccessRate: number;
        avgResponseTime: number;
        avgDataCompleteness: number;
        topModels: string[];  // Top 5 推荐模型
    };
    recommendations: string[];  // 优化建议
}

