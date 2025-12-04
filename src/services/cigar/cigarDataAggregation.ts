/**
 * 雪茄数据聚合服务
 * 基于多次 AI 识别的统计结果，提供可靠的雪茄数据
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { CigarAnalysisResult } from '../gemini/cigarRecognition';

// 标准化产品名称（用于生成文档 ID）
function normalizeProductName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');
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
}

/**
 * 保存或更新 AI 识别结果到 cigar_database
 * 每次识别都更新同一个文档的统计计数
 */
export async function saveRecognitionToCigarDatabase(
    result: CigarAnalysisResult
): Promise<void> {
    try {
        const productName = `${result.brand} ${result.name}`.trim();
        const docId = normalizeProductName(productName);
        const docRef = doc(db, 'cigar_database', docId);
        
        console.log(`[cigarDataAggregation] 📊 保存识别结果: ${productName}`);
        
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            // 文档已存在，更新统计
            console.log(`[cigarDataAggregation] ✅ 文档已存在，更新统计计数`);
            
            const existingData = docSnap.data();
            
            // 更新单值字段统计
            const updateData: any = {
                totalRecognitions: increment(1),
                lastRecognizedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
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
            
            console.log(`[cigarDataAggregation] ✅ 统计已更新，总识别次数: ${(existingData.totalRecognitions || 0) + 1}`);
            
        } else {
            // 文档不存在，创建新文档
            console.log(`[cigarDataAggregation] 📝 创建新文档`);
            
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
                updatedAt: serverTimestamp()
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
            
            console.log(`[cigarDataAggregation] ✅ 新文档已创建`);
        }
    } catch (error) {
        console.error('[cigarDataAggregation] ❌ 保存失败:', error);
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
        
        console.log(`[cigarDataAggregation] 🔍 查询聚合数据: ${productName}`);
        
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            console.log(`[cigarDataAggregation] ℹ️ 未找到数据（从未被识别过）`);
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
            avgConfidence
        };
        
        console.log(`[cigarDataAggregation] ✅ 聚合完成，基于 ${aggregatedData.totalRecognitions} 次识别`);
        
        return aggregatedData;
        
    } catch (error) {
        console.error('[cigarDataAggregation] ❌ 查询失败:', error);
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
        console.error('[cigarDataAggregation] ❌ 搜索失败:', error);
        return [];
    }
}

