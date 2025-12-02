/**
 * 雪茄 AI 识别统计服务
 * 
 * 功能：
 * 1. 记录每次 AI 识别的结果
 * 2. 更新数据库中的识别统计信息
 * 3. 追踪识别准确度和成功率
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { normalizeName } from './cigarDatabase';

/**
 * AI 识别结果接口
 */
export interface AIRecognitionResult {
  brand: string;
  name: string;
  confidence: number;         // 识别置信度（0-1）
  imageUrlFound: boolean;     // 是否成功找到图片 URL
  hasDetailedInfo: boolean;   // 是否找到数据库详细信息
}

/**
 * 更新雪茄的 AI 识别统计信息
 * 
 * @param result - AI 识别结果
 */
export async function updateRecognitionStats(result: AIRecognitionResult): Promise<void> {
  try {
    console.log(`[cigarRecognitionStats] 📊 更新识别统计: ${result.brand} ${result.name}`);
    
    const normalizedBrand = normalizeName(result.brand);
    const normalizedName = normalizeName(result.name);
    
    // 查找数据库中是否已有此雪茄的记录
    const cigarsRef = db;
    const statsDocId = `${normalizedBrand}_${normalizedName}`;
    const statsDocRef = doc(cigarsRef, GLOBAL_COLLECTIONS.CIGAR_DATABASE, statsDocId);
    
    const docSnap = await getDoc(statsDocRef);
    
    if (docSnap.exists()) {
      // 更新现有记录的统计信息
      const existingData = docSnap.data();
      const existingStats = existingData.aiRecognitionStats || {
        totalScans: 0,
        successfulScans: 0,
        averageConfidence: 0,
        lastScannedAt: new Date(),
        imageUrlSuccessRate: 0
      };
      
      // 计算新的统计数据
      const totalScans = existingStats.totalScans + 1;
      const successfulScans = result.confidence > 0.5 ? existingStats.successfulScans + 1 : existingStats.successfulScans;
      
      // 计算平均置信度（加权平均）
      const averageConfidence = (
        (existingStats.averageConfidence * existingStats.totalScans + result.confidence) / 
        totalScans
      );
      
      // 计算图片 URL 成功率
      const imageUrlSuccessCount = existingStats.imageUrlSuccessRate * existingStats.totalScans + (result.imageUrlFound ? 1 : 0);
      const imageUrlSuccessRate = imageUrlSuccessCount / totalScans;
      
      await updateDoc(statsDocRef, {
        'aiRecognitionStats.totalScans': totalScans,
        'aiRecognitionStats.successfulScans': successfulScans,
        'aiRecognitionStats.averageConfidence': averageConfidence,
        'aiRecognitionStats.lastScannedAt': serverTimestamp(),
        'aiRecognitionStats.imageUrlSuccessRate': imageUrlSuccessRate,
        updatedAt: serverTimestamp()
      });
      
      console.log(`[cigarRecognitionStats] ✅ 统计已更新: 总扫描 ${totalScans}, 成功 ${successfulScans}, 平均置信度 ${(averageConfidence * 100).toFixed(1)}%`);
    } else {
      // 如果数据库中没有此雪茄，创建一个统计记录（不包含详细信息）
      console.log(`[cigarRecognitionStats] ℹ️ 数据库中无此雪茄，创建统计记录（仅统计信息）`);
      
      // 注意：这里只创建统计信息，不创建完整的雪茄记录
      // 完整的雪茄记录应该由管理员手动录入或用户贡献
      
      // 暂时不创建新记录，只记录到日志
      // 未来可以创建一个单独的 "ai_recognition_stats" 集合来存储这些统计
      console.log(`[cigarRecognitionStats] 📝 记录到日志: ${result.brand} ${result.name}, 置信度: ${(result.confidence * 100).toFixed(1)}%`);
    }
  } catch (error) {
    console.error('[cigarRecognitionStats] ❌ 更新统计失败:', error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 获取雪茄的 AI 识别统计信息
 * 
 * @param brand - 品牌名称
 * @param name - 雪茄名称
 * @returns 统计信息或 null
 */
export async function getRecognitionStats(
  brand: string,
  name: string
): Promise<{
  totalScans: number;
  successfulScans: number;
  averageConfidence: number;
  lastScannedAt: Date;
  imageUrlSuccessRate: number;
} | null> {
  try {
    const normalizedBrand = normalizeName(brand);
    const normalizedName = normalizeName(name);
    const statsDocId = `${normalizedBrand}_${normalizedName}`;
    const statsDocRef = doc(db, GLOBAL_COLLECTIONS.CIGAR_DATABASE, statsDocId);
    
    const docSnap = await getDoc(statsDocRef);
    
    if (docSnap.exists() && docSnap.data().aiRecognitionStats) {
      const stats = docSnap.data().aiRecognitionStats;
      return {
        ...stats,
        lastScannedAt: stats.lastScannedAt?.toDate?.() || new Date(stats.lastScannedAt)
      };
    }
    
    return null;
  } catch (error) {
    console.error('[cigarRecognitionStats] ❌ 获取统计失败:', error);
    return null;
  }
}

