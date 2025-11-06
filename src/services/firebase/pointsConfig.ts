// 积分配置服务
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { PointsConfig } from '../../types';

/**
 * 获取积分配置
 */
export const getPointsConfig = async (): Promise<PointsConfig | null> => {
  try {
    const docRef = doc(db, 'config', 'points');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as PointsConfig;
    }
    
    // 如果不存在，返回默认配置
    return getDefaultPointsConfig();
  } catch (error) {
    return null;
  }
};

/**
 * 更新积分配置
 */
export const updatePointsConfig = async (
  config: Omit<PointsConfig, 'id' | 'updatedAt'>,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, 'config', 'points');
    
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date(),
      updatedBy: userId,
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: '更新失败，请重试' };
  }
};

/**
 * 获取默认积分配置
 */
export const getDefaultPointsConfig = (): PointsConfig => {
  return {
    id: 'default',
    registration: {
      base: 50,              // 基础注册积分
      withReferral: 100,     // 被引荐注册积分
      referrerReward: 200,   // 引荐人奖励积分
    },
    purchase: {
      firstOrder: 100,       // 首次购买奖励
      perRinggit: 1,         // 每消费1马币获得1积分
      referrerFirstOrder: 50, // 被引荐人首次购买，引荐人获得50积分
    },
    event: {
      registration: 10,      // 活动报名积分
      checkIn: 20,           // 活动签到积分
      completion: 50,        // 完成活动积分
    },
    other: {
      profileComplete: 30,   // 完善资料积分
      firstLogin: 10,        // 首次登录积分
      dailyCheckIn: 5,       // 每日签到积分
    },
    updatedAt: new Date(),
    updatedBy: 'system',
  };
};

/**
 * 初始化积分配置（如果不存在）
 */
export const initializePointsConfig = async (userId: string): Promise<void> => {
  try {
    const existing = await getPointsConfig();
    if (!existing) {
      const defaultConfig = getDefaultPointsConfig();
      await updatePointsConfig(defaultConfig, userId);
    }
  } catch (error) {
    // 静默失败
  }
};

