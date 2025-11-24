/**
 * 应用配置服务
 */
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { GLOBAL_COLLECTIONS } from '../../config/globalCollections';
import type { AppConfig } from '../../types';

const CONFIG_ID = 'default';

/**
 * 获取应用配置
 */
export const getAppConfig = async (): Promise<AppConfig | null> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.APP_CONFIG, CONFIG_ID);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      // 如果不存在，创建默认配置
      const defaultConfig: AppConfig = {
        id: CONFIG_ID,
        logoUrl: 'https://res.cloudinary.com/dy2zb1n41/image/upload/jep-cigar/brands/JEP_Logo_White_1763310931359_s1pkcz8y617',
        appName: 'Gentlemen Club',
        hideFooter: false,
        updatedAt: new Date(),
        updatedBy: '',
      };
      
      await setDoc(docRef, {
        ...defaultConfig,
        updatedAt: Timestamp.fromDate(defaultConfig.updatedAt),
      });
      
      return defaultConfig;
    }
    
    const data = docSnap.data();
    
    return {
      id: docSnap.id,
      logoUrl: data.logoUrl || undefined,
      appName: data.appName || undefined,
      hideFooter: data.hideFooter ?? false,
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      updatedBy: data.updatedBy || '',
    };
  } catch (error) {
    console.error('[getAppConfig] 获取配置失败:', error);
    return null;
  }
};

/**
 * 更新应用配置
 */
export const updateAppConfig = async (
  updates: Partial<Pick<AppConfig, 'logoUrl' | 'appName' | 'hideFooter'>>,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.APP_CONFIG, CONFIG_ID);
    const docSnap = await getDoc(docRef);
    
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
      updatedBy,
    };
    
    if (docSnap.exists()) {
      await updateDoc(docRef, updateData);
    } else {
      // 如果不存在，创建新文档
      await setDoc(docRef, {
        id: CONFIG_ID,
        logoUrl: updates.logoUrl || 'https://res.cloudinary.com/dy2zb1n41/image/upload/jep-cigar/brands/JEP_Logo_White_1763310931359_s1pkcz8y617',
        appName: updates.appName || 'Gentlemen Club',
        hideFooter: updates.hideFooter ?? false,
        ...updateData,
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('[updateAppConfig] 更新配置失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '更新配置失败' 
    };
  }
};

/**
 * 重置应用配置为默认值
 */
export const resetAppConfig = async (
  updatedBy: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const defaultConfig: Partial<Pick<AppConfig, 'logoUrl' | 'appName' | 'hideFooter'>> = {
      logoUrl: 'https://res.cloudinary.com/dy2zb1n41/image/upload/jep-cigar/brands/JEP_Logo_White_1763310931359_s1pkcz8y617',
      appName: 'Gentlemen Club',
      hideFooter: false,
    };
    
    return await updateAppConfig(defaultConfig, updatedBy);
  } catch (error) {
    console.error('[resetAppConfig] 重置配置失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '重置配置失败' 
    };
  }
};

