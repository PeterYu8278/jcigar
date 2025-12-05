/**
 * 用户 AI 功能使用统计服务
 */

import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';

/**
 * 增加用户的 AI 识茄使用次数
 * @param userId 用户 ID
 */
export async function incrementUserCigarScanCount(userId: string): Promise<void> {
    try {
        const userRef = doc(db, GLOBAL_COLLECTIONS.USERS, userId);
        
        await updateDoc(userRef, {
            'aiUsageStats.cigarScanCount': increment(1),
            'aiUsageStats.lastCigarScanAt': serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        console.log(`[userAiStats] ✅ 用户 ${userId} 的 AI识茄 使用次数已更新`);
    } catch (error) {
        console.error('[userAiStats] ❌ 更新 AI识茄 使用次数失败:', error);
        // 不抛出错误，统计失败不应影响主流程
    }
}

/**
 * 获取用户的 AI 使用统计
 * @param userId 用户 ID
 * @returns AI 使用统计数据
 */
export async function getUserAiStats(userId: string): Promise<{
    cigarScanCount: number;
    lastCigarScanAt: Date | null;
} | null> {
    try {
        const { getDoc } = await import('firebase/firestore');
        const userRef = doc(db, GLOBAL_COLLECTIONS.USERS, userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            return null;
        }
        
        const data = userSnap.data();
        const aiUsageStats = data.aiUsageStats || {};
        
        return {
            cigarScanCount: aiUsageStats.cigarScanCount || 0,
            lastCigarScanAt: aiUsageStats.lastCigarScanAt?.toDate() || null
        };
    } catch (error) {
        console.error('[userAiStats] ❌ 获取 AI 使用统计失败:', error);
        return null;
    }
}

