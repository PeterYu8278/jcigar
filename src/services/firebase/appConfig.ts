/**
 * 应用配置服务
 */
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { GLOBAL_COLLECTIONS } from '../../config/globalCollections';
import type { AppConfig, ColorThemeConfig } from '../../types';
import type { WhapiConfig, MessageTemplate } from '../../types/whapi';
import { DEFAULT_MESSAGE_TEMPLATES } from '../../types/whapi';

// 默认颜色主题配置
const DEFAULT_COLOR_THEME: ColorThemeConfig = {
  primaryButton: {
    startColor: '#FDE08D',
    endColor: '#C48D3A',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: '#444444',
    textColor: '#ffffff',
  },
  warningButton: {
    backgroundColor: '#ff0000',
    borderColor: '#faad14',
    textColor: '#ffffff',
  },
  border: {
    primary: '#333333',
    secondary: '#444444',
  },
  tag: {
    success: {
      backgroundColor: '#f6ffed',
      textColor: '#52c41a',
      borderColor: '#b7eb8f',
    },
    warning: {
      backgroundColor: '#fffbe6',
      textColor: '#faad14',
      borderColor: '#ffe58f',
    },
    error: {
      backgroundColor: '#fff1f0',
      textColor: '#cf1322',
      borderColor: '#ffccc7',
    },
  },
  text: {
    primary: '#f8f8f8',
    secondary: '#c0c0c0',
    tertiary: '#999999',
  },
  icon: {
    primary: '#ffd700',
  },
};

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
        colorTheme: DEFAULT_COLOR_THEME,
        auth: {
          disableGoogleLogin: true,
          disableEmailLogin: true,
        },
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
    
    // 处理 whapi 配置
    const whapiConfig: WhapiConfig | undefined = data.whapi ? {
      apiToken: data.whapi.apiToken,
      channelId: data.whapi.channelId,
      baseUrl: data.whapi.baseUrl,
      enabled: data.whapi.enabled ?? false,
    } : undefined;

    // 处理消息模板
    const whapiTemplates: MessageTemplate[] = data.whapiTemplates 
      ? data.whapiTemplates.map((t: any) => ({
          id: t.id || '',
          name: t.name,
          type: t.type,
          template: t.template,
          variables: t.variables || [],
          enabled: t.enabled ?? true,
          createdAt: t.createdAt?.toDate?.() || new Date(t.createdAt),
          updatedAt: t.updatedAt?.toDate?.() || new Date(t.updatedAt),
        }))
      : DEFAULT_MESSAGE_TEMPLATES.map((t, index) => ({
          id: `default_${index}`,
          ...t,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

    return {
      id: docSnap.id,
      logoUrl: data.logoUrl || undefined,
      appName: data.appName || undefined,
      hideFooter: data.hideFooter ?? false,
      colorTheme: data.colorTheme ? {
        primaryButton: data.colorTheme.primaryButton || DEFAULT_COLOR_THEME.primaryButton,
        secondaryButton: data.colorTheme.secondaryButton || DEFAULT_COLOR_THEME.secondaryButton,
        warningButton: data.colorTheme.warningButton || DEFAULT_COLOR_THEME.warningButton,
        border: data.colorTheme.border || DEFAULT_COLOR_THEME.border,
        tag: data.colorTheme.tag || DEFAULT_COLOR_THEME.tag,
        text: data.colorTheme.text || DEFAULT_COLOR_THEME.text,
        icon: data.colorTheme.icon || DEFAULT_COLOR_THEME.icon,
      } : DEFAULT_COLOR_THEME,
      whapi: whapiConfig,
      whapiTemplates,
      auth: data.auth ? {
        disableGoogleLogin: data.auth.disableGoogleLogin ?? true,
        disableEmailLogin: data.auth.disableEmailLogin ?? true,
      } : {
        disableGoogleLogin: true,
        disableEmailLogin: true,
      },
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
  updates: Partial<Pick<AppConfig, 'logoUrl' | 'appName' | 'hideFooter' | 'colorTheme' | 'whapi' | 'whapiTemplates' | 'auth'>>,
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
        colorTheme: updates.colorTheme || DEFAULT_COLOR_THEME,
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
    const defaultConfig: Partial<Pick<AppConfig, 'logoUrl' | 'appName' | 'hideFooter' | 'colorTheme'>> = {
      logoUrl: 'https://res.cloudinary.com/dy2zb1n41/image/upload/jep-cigar/brands/JEP_Logo_White_1763310931359_s1pkcz8y617',
      appName: 'Gentlemen Club',
      hideFooter: false,
      colorTheme: DEFAULT_COLOR_THEME,
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

