/**
 * 雪茄数据库查询服务
 * 
 * 功能：
 * 1. 根据品牌和名称查询雪茄详细信息
 * 2. 支持精确匹配和模糊匹配
 * 3. 计算相似度评分
 */

import { collection, query, where, getDocs, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import type { CigarDetailedInfo, CigarSearchResult } from '@/types/cigar';
import { cigarCache } from './cigarCache';

/**
 * 标准化名称
 * 
 * 规则：
 * 1. 转换为小写
 * 2. 移除所有空格
 * 3. 移除特殊字符（保留字母、数字、连字符）
 * 4. 移除多余的连字符
 * 
 * @param name - 原始名称
 * @returns 标准化后的名称
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')  // 移除所有空格
    .replace(/[^a-z0-9-]/g, '')  // 只保留字母、数字、连字符
    .replace(/-+/g, '-')  // 合并多个连字符
    .replace(/^-|-$/g, '');  // 移除首尾连字符
}

/**
 * 生成搜索关键词
 * 
 * 包含：
 * 1. 完整品牌名
 * 2. 完整雪茄名
 * 3. 品牌+雪茄名组合
 * 4. 单词拆分
 * 
 * @param brand - 品牌名称
 * @param name - 雪茄名称
 * @returns 关键词数组
 */
export function generateSearchKeywords(brand: string, name: string): string[] {
  const keywords = new Set<string>();
  
  // 标准化
  const normalizedBrand = normalizeName(brand);
  const normalizedName = normalizeName(name);
  
  // 添加完整名称
  keywords.add(normalizedBrand);
  keywords.add(normalizedName);
  keywords.add(`${normalizedBrand}${normalizedName}`);
  keywords.add(`${normalizedBrand}-${normalizedName}`);
  
  // 拆分单词
  const brandWords = brand.toLowerCase().split(/\s+/);
  const nameWords = name.toLowerCase().split(/\s+/);
  
  brandWords.forEach(word => {
    if (word.length > 2) {  // 忽略太短的词
      keywords.add(normalizeName(word));
    }
  });
  
  nameWords.forEach(word => {
    if (word.length > 2) {
      keywords.add(normalizeName(word));
    }
  });
  
  return Array.from(keywords);
}

/**
 * 计算相似度
 * 
 * 评分标准：
 * - 品牌完全匹配：+50 分
 * - 品牌部分匹配：+30 分
 * - 名称完全匹配：+50 分
 * - 名称部分匹配：+20 分
 * - 关键词匹配：每个 +5 分（最多 +20）
 * 
 * @param inputBrand - 输入的品牌名
 * @param inputName - 输入的雪茄名
 * @param dbBrand - 数据库中的品牌名
 * @param dbName - 数据库中的雪茄名
 * @param keywords - 数据库中的搜索关键词
 * @returns 相似度分数（0-1）
 */
export function calculateSimilarity(
  inputBrand: string,
  inputName: string,
  dbBrand: string,
  dbName: string,
  keywords: string[]
): number {
  let score = 0;
  
  const normalizedInputBrand = normalizeName(inputBrand);
  const normalizedInputName = normalizeName(inputName);
  const normalizedDbBrand = normalizeName(dbBrand);
  const normalizedDbName = normalizeName(dbName);
  
  // 品牌匹配
  if (normalizedInputBrand === normalizedDbBrand) {
    score += 50;
  } else if (
    normalizedDbBrand.includes(normalizedInputBrand) || 
    normalizedInputBrand.includes(normalizedDbBrand)
  ) {
    score += 30;
  }
  
  // 名称匹配
  if (normalizedInputName === normalizedDbName) {
    score += 50;
  } else if (
    normalizedDbName.includes(normalizedInputName) || 
    normalizedInputName.includes(normalizedDbName)
  ) {
    score += 20;
  }
  
  // 关键词匹配
  const inputWords = generateSearchKeywords(inputBrand, inputName);
  let keywordMatches = 0;
  inputWords.forEach(word => {
    if (keywords.includes(word)) {
      keywordMatches++;
    }
  });
  score += Math.min(keywordMatches * 5, 20);  // 最多 +20 分
  
  return Math.min(score / 100, 1.0);
}

/**
 * 精确匹配查询
 * 
 * 使用 normalizedBrand 和 normalizedName 进行精确匹配
 * 
 * @param normalizedBrand - 标准化的品牌名
 * @param normalizedName - 标准化的雪茄名
 * @returns 匹配的雪茄信息或 null
 */
async function queryExactMatch(
  normalizedBrand: string,
  normalizedName: string
): Promise<CigarDetailedInfo | null> {
  try {
    console.log(`[cigarDatabase] 🔍 精确匹配查询: brand="${normalizedBrand}", name="${normalizedName}"`);
    
    const cigarsRef = collection(db, GLOBAL_COLLECTIONS.CIGAR_DATABASE);
    const q = query(
      cigarsRef,
      where('normalizedBrand', '==', normalizedBrand),
      where('normalizedName', '==', normalizedName),
      firestoreLimit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log(`[cigarDatabase] ℹ️ 精确匹配未找到结果`);
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data() as CigarDetailedInfo;
    
    console.log(`[cigarDatabase] ✅ 精确匹配成功: ${data.brand} ${data.name}`);
    
    return {
      ...data,
      id: doc.id,
      // 转换 Firestore Timestamp 为 Date
      createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any).toDate(),
      ratingDate: data.ratingDate ? 
        (data.ratingDate instanceof Date ? data.ratingDate : (data.ratingDate as any).toDate()) : 
        null
    };
  } catch (error) {
    console.error('[cigarDatabase] ❌ 精确匹配查询失败:', error);
    return null;
  }
}

/**
 * 模糊匹配查询
 * 
 * 使用 searchKeywords 进行模糊匹配，并计算相似度
 * 
 * @param inputBrand - 输入的品牌名
 * @param inputName - 输入的雪茄名
 * @returns 最匹配的结果或 null
 */
async function queryFuzzyMatch(
  inputBrand: string,
  inputName: string
): Promise<CigarSearchResult | null> {
  try {
    console.log(`[cigarDatabase] 🔍 模糊匹配查询: brand="${inputBrand}", name="${inputName}"`);
    
    // 生成搜索关键词
    const searchKeywords = generateSearchKeywords(inputBrand, inputName);
    console.log(`[cigarDatabase] 📋 搜索关键词:`, searchKeywords);
    
    const cigarsRef = collection(db, GLOBAL_COLLECTIONS.CIGAR_DATABASE);
    
    // 查询包含任一关键词的文档
    const q = query(
      cigarsRef,
      where('searchKeywords', 'array-contains-any', searchKeywords.slice(0, 10)),  // Firestore 限制最多 10 个
      firestoreLimit(20)  // 获取前 20 个候选
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log(`[cigarDatabase] ℹ️ 模糊匹配未找到结果`);
      return null;
    }
    
    console.log(`[cigarDatabase] 📊 找到 ${snapshot.size} 个候选项，开始计算相似度...`);
    
    // 计算每个候选的相似度
    const candidates: CigarSearchResult[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data() as CigarDetailedInfo;
      const similarity = calculateSimilarity(
        inputBrand,
        inputName,
        data.brand,
        data.name,
        data.searchKeywords
      );
      
      console.log(`[cigarDatabase]   - ${data.brand} ${data.name}: 相似度 ${(similarity * 100).toFixed(1)}%`);
      
      candidates.push({
        data: {
          ...data,
          id: doc.id,
          // 转换 Firestore Timestamp 为 Date
          createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
          updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any).toDate(),
          ratingDate: data.ratingDate ? 
            (data.ratingDate instanceof Date ? data.ratingDate : (data.ratingDate as any).toDate()) : 
            null
        },
        similarity
      });
    });
    
    // 按相似度排序
    candidates.sort((a, b) => b.similarity - a.similarity);
    
    const bestMatch = candidates[0];
    
    if (bestMatch) {
      console.log(`[cigarDatabase] ✅ 最佳匹配: ${bestMatch.data.brand} ${bestMatch.data.name} (相似度: ${(bestMatch.similarity * 100).toFixed(1)}%)`);
    }
    
    return bestMatch || null;
  } catch (error) {
    console.error('[cigarDatabase] ❌ 模糊匹配查询失败:', error);
    return null;
  }
}

/**
 * 根据品牌和名称查询雪茄详细信息
 * 
 * 查询策略：
 * 1. 精确匹配（normalizedBrand + normalizedName）
 * 2. 模糊匹配（searchKeywords）
 * 3. 相似度排序（返回最匹配的结果）
 * 
 * @param brand - 品牌名称
 * @param name - 雪茄名称
 * @returns 雪茄详细信息或 null
 */
export async function getCigarDetails(
  brand: string,
  name: string
): Promise<CigarDetailedInfo | null> {
  console.log(`[cigarDatabase] 🚀 开始查询雪茄详细信息: "${brand} ${name}"`);
  
  // 1. 检查缓存
  const cached = cigarCache.get(brand, name);
  if (cached) {
    return cached;
  }
  
  // 2. 标准化输入
  const normalizedBrand = normalizeName(brand);
  const normalizedName = normalizeName(name);
  
  // 3. 精确匹配查询
  const exactMatch = await queryExactMatch(normalizedBrand, normalizedName);
  if (exactMatch) {
    // 写入缓存
    cigarCache.set(brand, name, exactMatch);
    return exactMatch;
  }
  
  // 4. 模糊匹配查询
  const fuzzyMatch = await queryFuzzyMatch(brand, name);
  if (fuzzyMatch && fuzzyMatch.similarity >= 0.8) {  // 80% 相似度阈值
    console.log(`[cigarDatabase] ✅ 模糊匹配成功（相似度 >= 80%）`);
    // 写入缓存
    cigarCache.set(brand, name, fuzzyMatch.data);
    return fuzzyMatch.data;
  } else if (fuzzyMatch) {
    console.log(`[cigarDatabase] ⚠️ 最佳匹配相似度过低 (${(fuzzyMatch.similarity * 100).toFixed(1)}% < 80%)，不返回结果`);
  }
  
  // 5. 未找到
  console.log(`[cigarDatabase] ❌ 未找到匹配的雪茄信息`);
  return null;
}

