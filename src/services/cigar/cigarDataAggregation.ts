/**
 * 雪茄数据聚合服务
 * 基于多次 AI 识别的统计结果，提供可靠的雪茄数据
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment, collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { CigarAnalysisResult } from '../gemini/cigarRecognition';

// 标准化产品名称（用于生成文档 ID）
function normalizeProductName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');
}

// 生成产品名称（去除品牌名重复）
export function generateProductName(brand: string, name: string): string {
    // 如果 name 已经包含 brand，则直接使用 name
    if (name.toLowerCase().startsWith(brand.toLowerCase())) {
        return name.trim();
    }
    // 否则拼接 brand + name
    return `${brand} ${name}`.trim();
}

// 值频率统计接口
export interface ValueFrequencyItem {
    value: string;
    count: number;
    percentage: number;
}

// 聚合后的雪茄数据
export interface AggregatedCigarData {
    productName: string;
    
    // 单值字段（统计最多的）
    brand: string;
    brandConsistency: number;  // 一致性百分比
    
    origin: string;
    originConsistency: number;
    
    strength: string;
    strengthConsistency: number;
    
    description: string;  // 最新或最佳描述
    
    // 数值型字段（计算平均值）
    rating: number | null;      // 平均评分（0-100）
    ratingCount: number;        // 有评分的识别次数
    
    // Top N 字段（包含统计信息）
    wrappers: ValueFrequencyItem[];      // Top 5
    binders: ValueFrequencyItem[];       // Top 5
    fillers: ValueFrequencyItem[];       // Top 5
    footTasteNotes: ValueFrequencyItem[]; // Top 5
    bodyTasteNotes: ValueFrequencyItem[]; // Top 5
    headTasteNotes: ValueFrequencyItem[]; // Top 5
    flavorProfile: ValueFrequencyItem[];  // Top 10
    
    // 统计元数据
    totalRecognitions: number;
    lastRecognizedAt: Date;
    avgConfidence: number;
    
    // 🆕 贡献者信息
    contributors: Array<{
        userId: string;
        userName: string;
    }>;
    uniqueContributors: number;
}

/**
 * 保存或更新 AI 识别结果到 cigar_database
 * 每次识别都更新同一个文档的统计计数
 * @param result AI 识别结果
 * @param userId 用户ID（可选）
 * @param userName 用户名（可选）
 */
export async function saveRecognitionToCigarDatabase(
    result: CigarAnalysisResult,
    userId?: string,
    userName?: string
): Promise<void> {
    try {
        // 使用辅助函数生成产品名称（自动去重品牌名）
        const productName = generateProductName(result.brand, result.name);
        const docId = normalizeProductName(productName);
        const docRef = doc(db, 'cigar_database', docId);
        
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            // 文档已存在，更新统计
            const existingData = docSnap.data();
            
            // 更新单值字段统计
            const updateData: any = {
                totalRecognitions: increment(1),
                lastRecognizedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
            // 🆕 更新用户资料映射（如果提供了用户信息）
            if (userId && userName) {
                updateData[`contributors.${userId}`] = userName;
            }
            
            // 更新品牌统计
            if (result.brand) {
                updateData[`brandStats.${result.brand}`] = increment(1);
            }
            
            // 更新产地统计
            if (result.origin) {
                updateData[`originStats.${result.origin}`] = increment(1);
            }
            
            // 更新强度统计
            if (result.strength) {
                updateData[`strengthStats.${result.strength}`] = increment(1);
            }
            
            // 更新茄衣统计
            if (result.wrapper) {
                updateData[`wrapperStats.${result.wrapper}`] = increment(1);
            }
            
            // 更新茄套统计
            if (result.binder) {
                updateData[`binderStats.${result.binder}`] = increment(1);
            }
            
            // 更新茄芯统计
            if (result.filler) {
                updateData[`fillerStats.${result.filler}`] = increment(1);
            }
            
            // 更新评分统计（数值字段 - 累积总和和计数）
            if (result.rating !== null && result.rating !== undefined && typeof result.rating === 'number') {
                updateData.ratingSum = increment(result.rating);
                updateData.ratingCount = increment(1);
            }
            
            // 更新风味特征统计（数组字段）
            if (result.flavorProfile && Array.isArray(result.flavorProfile)) {
                result.flavorProfile.forEach(flavor => {
                    if (flavor && flavor.trim()) {
                        updateData[`flavorProfileStats.${flavor}`] = increment(1);
                    }
                });
            }
            
            // 更新头段品吸笔记统计
            if (result.footTasteNotes && Array.isArray(result.footTasteNotes)) {
                result.footTasteNotes.forEach(note => {
                    if (note && note.trim()) {
                        updateData[`footTasteNotesStats.${note}`] = increment(1);
                    }
                });
            }
            
            // 更新中段品吸笔记统计
            if (result.bodyTasteNotes && Array.isArray(result.bodyTasteNotes)) {
                result.bodyTasteNotes.forEach(note => {
                    if (note && note.trim()) {
                        updateData[`bodyTasteNotesStats.${note}`] = increment(1);
                    }
                });
            }
            
            // 更新尾段品吸笔记统计
            if (result.headTasteNotes && Array.isArray(result.headTasteNotes)) {
                result.headTasteNotes.forEach(note => {
                    if (note && note.trim()) {
                        updateData[`headTasteNotesStats.${note}`] = increment(1);
                    }
                });
            }
            
            // 添加新的描述
            if (result.description) {
                const newDescription = {
                    text: result.description,
                    confidence: result.confidence,
                    addedAt: new Date().toISOString()
                };
                
                const existingDescriptions = existingData.descriptions || [];
                updateData.descriptions = [...existingDescriptions, newDescription];
            }
            
            // 执行更新
            await updateDoc(docRef, updateData);
            
        } else {
            // 文档不存在，创建新文档
            
            const newData: any = {
                productName,
                normalizedName: docId,
                
                // 初始化统计对象
                brandStats: { [result.brand]: 1 },
                originStats: result.origin ? { [result.origin]: 1 } : {},
                strengthStats: result.strength ? { [result.strength]: 1 } : {},
                wrapperStats: result.wrapper ? { [result.wrapper]: 1 } : {},
                binderStats: result.binder ? { [result.binder]: 1 } : {},
                fillerStats: result.filler ? { [result.filler]: 1 } : {},
                flavorProfileStats: {},
                footTasteNotesStats: {},
                bodyTasteNotesStats: {},
                headTasteNotesStats: {},
                
                // 初始化评分统计
                ratingSum: (result.rating !== null && result.rating !== undefined && typeof result.rating === 'number') ? result.rating : 0,
                ratingCount: (result.rating !== null && result.rating !== undefined && typeof result.rating === 'number') ? 1 : 0,
                
                descriptions: result.description ? [{
                    text: result.description,
                    confidence: result.confidence,
                    addedAt: new Date().toISOString()
                }] : [],
                
                totalRecognitions: 1,
                lastRecognizedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                
                // 🆕 初始化用户资料映射（如果提供了用户信息）
                contributors: (userId && userName) ? { [userId]: userName } : {}
            };
            
            // 初始化风味特征统计
            if (result.flavorProfile && Array.isArray(result.flavorProfile)) {
                result.flavorProfile.forEach(flavor => {
                    if (flavor && flavor.trim()) {
                        newData.flavorProfileStats[flavor] = 1;
                    }
                });
            }
            
            // 初始化品吸笔记统计
            if (result.footTasteNotes && Array.isArray(result.footTasteNotes)) {
                result.footTasteNotes.forEach(note => {
                    if (note && note.trim()) {
                        newData.footTasteNotesStats[note] = 1;
                    }
                });
            }
            
            if (result.bodyTasteNotes && Array.isArray(result.bodyTasteNotes)) {
                result.bodyTasteNotes.forEach(note => {
                    if (note && note.trim()) {
                        newData.bodyTasteNotesStats[note] = 1;
                    }
                });
            }
            
            if (result.headTasteNotes && Array.isArray(result.headTasteNotes)) {
                result.headTasteNotes.forEach(note => {
                    if (note && note.trim()) {
                        newData.headTasteNotesStats[note] = 1;
                    }
                });
            }
            
            await setDoc(docRef, newData);
        }
    } catch (error) {
        throw error;
    }
}

/**
 * 从统计对象中获取最常见的值
 */
function getMostFrequentValue(stats: { [key: string]: number }): {
    value: string;
    count: number;
    percentage: number;
} | null {
    if (!stats || Object.keys(stats).length === 0) {
        return null;
    }
    
    const entries = Object.entries(stats);
    const total = entries.reduce((sum, [_, count]) => sum + count, 0);
    
    // 按次数降序排序
    entries.sort((a, b) => b[1] - a[1]);
    
    const [value, count] = entries[0];
    
    return {
        value,
        count,
        percentage: (count / total) * 100
    };
}

/**
 * 从统计对象中获取前 N 个最常见的值
 */
function getTopNValues(stats: { [key: string]: number }, n: number): ValueFrequencyItem[] {
    if (!stats || Object.keys(stats).length === 0) {
        return [];
    }
    
    const entries = Object.entries(stats);
    const total = entries.reduce((sum, [_, count]) => sum + count, 0);
    
    // 按次数降序排序
    entries.sort((a, b) => b[1] - a[1]);
    
    // 取前 N 个
    return entries.slice(0, n).map(([value, count]) => ({
        value,
        count,
        percentage: (count / total) * 100
    }));
}

/**
 * 获取聚合后的雪茄数据
 */
export async function getAggregatedCigarData(
    productName: string
): Promise<AggregatedCigarData | null> {
    try {
        const docId = normalizeProductName(productName);
        const docRef = doc(db, 'cigar_database', docId);
        
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            return null;
        }
        
        const data = docSnap.data();
        
        // 获取单值字段（统计最多的）
        const brandResult = getMostFrequentValue(data.brandStats || {});
        const originResult = getMostFrequentValue(data.originStats || {});
        const strengthResult = getMostFrequentValue(data.strengthStats || {});
        
        // 获取 Top N 字段
        const wrappers = getTopNValues(data.wrapperStats || {}, 5);
        const binders = getTopNValues(data.binderStats || {}, 5);
        const fillers = getTopNValues(data.fillerStats || {}, 5);
        const flavorProfile = getTopNValues(data.flavorProfileStats || {}, 10);
        const footTasteNotes = getTopNValues(data.footTasteNotesStats || {}, 5);
        const bodyTasteNotes = getTopNValues(data.bodyTasteNotesStats || {}, 5);
        const headTasteNotes = getTopNValues(data.headTasteNotesStats || {}, 5);
        
        // 获取描述（取最新的）
        const descriptions = data.descriptions || [];
        const latestDescription = descriptions.length > 0 
            ? descriptions[descriptions.length - 1].text 
            : '';
        
        // 计算平均置信度
        const avgConfidence = descriptions.length > 0
            ? descriptions.reduce((sum: number, d: any) => sum + (d.confidence || 0), 0) / descriptions.length
            : 0;
        
        // 计算平均评分
        const ratingSum = data.ratingSum || 0;
        const ratingCount = data.ratingCount || 0;
        const avgRating = ratingCount > 0 ? ratingSum / ratingCount : null;
        
        // 🆕 提取贡献者信息
        const contributors = data.contributors || {};
        const contributorsList = Object.entries(contributors).map(([userId, userName]) => ({
            userId,
            userName: userName as string
        }));
        
        const aggregatedData: AggregatedCigarData = {
            productName,
            
            brand: brandResult?.value || '',
            brandConsistency: brandResult?.percentage || 0,
            
            origin: originResult?.value || '',
            originConsistency: originResult?.percentage || 0,
            
            strength: strengthResult?.value || '',
            strengthConsistency: strengthResult?.percentage || 0,
            
            description: latestDescription,
            
            rating: avgRating,
            ratingCount,
            
            wrappers,
            binders,
            fillers,
            footTasteNotes,
            bodyTasteNotes,
            headTasteNotes,
            flavorProfile,
            
            totalRecognitions: data.totalRecognitions || 0,
            lastRecognizedAt: data.lastRecognizedAt?.toDate() || new Date(),
            avgConfidence,
            
            // 🆕 贡献者信息
            contributors: contributorsList,
            uniqueContributors: Object.keys(contributors).length
        };
        
        return aggregatedData;
        
    } catch (error) {
        return null;
    }
}

/**
 * 搜索 cigar_database 中的雪茄（模糊匹配）
 */
export async function searchCigarDatabase(searchTerm: string): Promise<string[]> {
    try {
        // 简化版：返回标准化的产品名称
        // 实际实现需要遍历集合或使用 Algolia 等搜索服务
        const normalized = normalizeProductName(searchTerm);
        return [normalized];
    } catch (error) {
        return [];
    }
}

/**
 * 从文档数据中提取聚合数据（辅助函数）
 */
function getAggregatedCigarDataFromDoc(data: any): AggregatedCigarData {
    // 获取单值字段（统计最多的）
    const brandResult = getMostFrequentValue(data.brandStats || {});
    const originResult = getMostFrequentValue(data.originStats || {});
    const strengthResult = getMostFrequentValue(data.strengthStats || {});
    
    // 获取 Top N 字段
    const wrappers = getTopNValues(data.wrapperStats || {}, 5);
    const binders = getTopNValues(data.binderStats || {}, 5);
    const fillers = getTopNValues(data.fillerStats || {}, 5);
    const flavorProfile = getTopNValues(data.flavorProfileStats || {}, 10);
    const footTasteNotes = getTopNValues(data.footTasteNotesStats || {}, 5);
    const bodyTasteNotes = getTopNValues(data.bodyTasteNotesStats || {}, 5);
    const headTasteNotes = getTopNValues(data.headTasteNotesStats || {}, 5);
    
    // 获取描述（取最新的）
    const descriptions = data.descriptions || [];
    const latestDescription = descriptions.length > 0 
        ? descriptions[descriptions.length - 1].text 
        : '';
    
    // 计算平均置信度
    const avgConfidence = descriptions.length > 0
        ? descriptions.reduce((sum: number, d: any) => sum + (d.confidence || 0), 0) / descriptions.length
        : 0;
    
    // 计算平均评分
    const ratingSum = data.ratingSum || 0;
    const ratingCount = data.ratingCount || 0;
    const avgRating = ratingCount > 0 ? ratingSum / ratingCount : null;
    
    // 提取贡献者信息
    const contributors = data.contributors || {};
    const contributorsList = Object.entries(contributors).map(([userId, userName]) => ({
        userId,
        userName: userName as string
    }));
    
    return {
        productName: data.productName || '',
        
        brand: brandResult?.value || '',
        brandConsistency: brandResult?.percentage || 0,
        
        origin: originResult?.value || '',
        originConsistency: originResult?.percentage || 0,
        
        strength: strengthResult?.value || '',
        strengthConsistency: strengthResult?.percentage || 0,
        
        description: latestDescription,
        
        rating: avgRating,
        ratingCount,
        
        wrappers,
        binders,
        fillers,
        footTasteNotes,
        bodyTasteNotes,
        headTasteNotes,
        flavorProfile,
        
        totalRecognitions: data.totalRecognitions || 0,
        lastRecognizedAt: data.lastRecognizedAt?.toDate() || new Date(),
        avgConfidence,
        
        contributors: contributorsList,
        uniqueContributors: Object.keys(contributors).length
    };
}

/**
 * 获取用户的所有识别历史
 * @param userId 用户ID
 * @returns 用户扫描过的雪茄列表（包含聚合数据）
 */
export async function getUserCigarScanHistory(userId: string): Promise<Array<{
    productName: string;
    aggregatedData: AggregatedCigarData;
}>> {
    try {
        // 1. 获取所有 cigar_database 文档
        const snapshot = await getDocs(collection(db, 'cigar_database'));
        
        // 2. 过滤出 contributors 中包含该用户的文档
        const userHistory: Array<{
            productName: string;
            aggregatedData: AggregatedCigarData;
        }> = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const contributors = data.contributors || {};
            
            // 检查该用户是否在 contributors 中
            if (contributors[userId]) {
                // 提取聚合数据
                const aggregatedData = getAggregatedCigarDataFromDoc(data);
                
                userHistory.push({
                    productName: data.productName,
                    aggregatedData
                });
            }
        });
        
        // 3. 按最后识别时间排序（降序：最新的在前）
        return userHistory.sort((a, b) => {
            const timeA = a.aggregatedData.lastRecognizedAt?.getTime() || 0;
            const timeB = b.aggregatedData.lastRecognizedAt?.getTime() || 0;
            return timeB - timeA;
        });
        
    } catch (error) {
        console.error('[getUserCigarScanHistory] 查询失败:', error);
        return [];
    }
}

