// 功能管理页面
import React, { useState, useEffect } from 'react';
import { Card, Switch, Button, Space, Typography, message, Spin, Tabs, Input, Checkbox, Form, Divider, Alert, Select } from 'antd';
const { TextArea } = Input;
import { SaveOutlined, ReloadOutlined, EyeOutlined, EyeInvisibleOutlined, SearchOutlined, SettingOutlined, CopyOutlined, DownloadOutlined, FileTextOutlined, RocketOutlined, CheckCircleOutlined, LoadingOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../../store/modules/auth';
import { useTranslation } from 'react-i18next';
import {
  getFeatureVisibilityConfig,
  updateFeatureVisibilityConfig,
  resetFeatureVisibilityConfig,
} from '../../../services/firebase/featureVisibility';
import { FEATURE_DEFINITIONS, type FeatureDefinition } from '../../../config/featureDefinitions';
import type { FeatureVisibilityConfig, AppConfig, ColorThemeConfig } from '../../../types';
import { getAppConfig, updateAppConfig, resetAppConfig } from '../../../services/firebase/appConfig';
import ImageUpload from '../../../components/common/ImageUpload';
import MockAppInterface from '../../../components/admin/MockAppInterface';
import WhapiMessageTester from '../../../components/admin/WhapiMessageTester';

const { Title, Text } = Typography;
const { Search } = Input;

// 默认颜色主题配置（与 appConfig.ts 中的 DEFAULT_COLOR_THEME 保持一致）
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
    backgroundColor: '#faad14',
    borderColor: '#faad14',
    textColor: '#ffffff',
  },
  border: {
    primary: '#333333',
    secondary: '#444444',
  },
  tag: {
    success: {
      backgroundColor: '#52c41a',
      textColor: '#ffffff',
      borderColor: '#52c41a',
    },
    warning: {
      backgroundColor: '#faad14',
      textColor: '#ffffff',
      borderColor: '#faad14',
    },
    error: {
      backgroundColor: '#ff4d4f',
      textColor: '#ffffff',
      borderColor: '#ff4d4f',
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

const FeatureManagement: React.FC = () => {
  const { user } = useAuthStore();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'frontend' | 'admin' | 'app' | 'whapi' | 'env'>('frontend');
  const [whapiForm] = Form.useForm();
  const [envForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [config, setConfig] = useState<FeatureVisibilityConfig | null>(null);
  const [localFeatures, setLocalFeatures] = useState<Record<string, boolean>>({});
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [appConfigForm] = Form.useForm();
  const [savingAppConfig, setSavingAppConfig] = useState(false);
  const [aiCigarStorageEnabled, setAiCigarStorageEnabled] = useState<boolean>(true);
  const [aiCigarImageSearchEnabled, setAiCigarImageSearchEnabled] = useState<boolean>(true);
  const [pendingColorChanges, setPendingColorChanges] = useState<Partial<ColorThemeConfig>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [generatedEnv, setGeneratedEnv] = useState<string>('');
  const [deploying, setDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<{
    state: 'idle' | 'updating' | 'deploying' | 'success' | 'error';
    message: string;
    deployId?: string;
    deployUrl?: string;
  }>({ state: 'idle', message: '' });
  const [indexDeploying, setIndexDeploying] = useState(false);
  const [indexDeployStatus, setIndexDeployStatus] = useState<{
    state: 'idle' | 'deploying' | 'success' | 'error';
    message: string;
    links?: string[];
    summary?: {
      total: number;
      succeeded: number;
      failed: number;
      skipped: number;
    };
    results?: Array<{
      index: any;
      success: boolean;
      message: string;
      operationName?: string;
      error?: string;
    }>;
    consoleUrl?: string;
  }>({ state: 'idle', message: '' });
  const [firebaseConfigCode, setFirebaseConfigCode] = useState<string>('');

  // 检查是否为开发者
  useEffect(() => {
    if (user?.role !== 'developer') {
      message.error('仅开发者可以访问此页面');
      // 可以重定向到首页
    }
  }, [user]);

  // 加载配置
  useEffect(() => {
    loadConfig();
    loadAppConfig();
  }, []);

  // 当 appConfig 加载完成且切换到应用配置标签页时，设置表单值
  useEffect(() => {
    if (activeTab === 'app' && appConfig) {
      try {
        appConfigForm.setFieldsValue({
          logoUrl: appConfig.logoUrl,
          appName: appConfig.appName,
          hideFooter: appConfig.hideFooter ?? false,
          disableGoogleLogin: appConfig.auth?.disableGoogleLogin ?? false,
          disableEmailLogin: appConfig.auth?.disableEmailLogin ?? false,
          geminiModels: appConfig.gemini?.models || [],
        });
      } catch (err) {
        // Form 可能还未渲染，忽略错误
      }
    }
  }, [activeTab, appConfig, appConfigForm]);

  // 加载 AI识茄 配置
  useEffect(() => {
    if (appConfig) {
      setAiCigarStorageEnabled(appConfig.aiCigar?.enableDataStorage ?? true);
      setAiCigarImageSearchEnabled(appConfig.aiCigar?.enableImageSearch ?? true);
    }
  }, [appConfig]);

  // 当切换到 whapi 标签页时，设置表单值
  useEffect(() => {
    if (activeTab === 'whapi' && appConfig) {
      whapiForm.setFieldsValue({
        whapiApiToken: appConfig.whapi?.apiToken || '',
        whapiChannelId: appConfig.whapi?.channelId || '',
        whapiBaseUrl: appConfig.whapi?.baseUrl || 'https://gate.whapi.cloud',
        whapiEnabled: appConfig.whapi?.enabled ?? false,
        whapiEventReminder: appConfig.whapi?.features?.eventReminder ?? true,
        whapiVipExpiry: appConfig.whapi?.features?.vipExpiry ?? true,
        whapiPasswordReset: appConfig.whapi?.features?.passwordReset ?? true,
      });
    }
  }, [activeTab, appConfig, whapiForm]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const featureConfig = await getFeatureVisibilityConfig();
      if (featureConfig) {
        setConfig(featureConfig);
        // 初始化本地状态
        const visibility: Record<string, boolean> = {};
        FEATURE_DEFINITIONS.forEach(feature => {
          visibility[feature.key] = featureConfig.features[feature.key]?.visible ?? feature.defaultVisible;
        });
        setLocalFeatures(visibility);
      }
    } catch (error) {
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAppConfig = async () => {
    try {
      const config = await getAppConfig();
      if (config) {
        // 确保 colorTheme 存在，如果不存在则使用默认值
        const configWithTheme = {
          ...config,
          colorTheme: config.colorTheme || {
            primaryButton: { startColor: '#FDE08D', endColor: '#C48D3A' },
            secondaryButton: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: '#444444', textColor: '#ffffff' },
            warningButton: { backgroundColor: '#faad14', borderColor: '#faad14', textColor: '#ffffff' },
              border: { primary: '#333333', secondary: '#444444' },
              tag: {
                success: { backgroundColor: '#52c41a', textColor: '#ffffff' },
                warning: { backgroundColor: '#faad14', textColor: '#ffffff' },
                error: { backgroundColor: '#ff4d4f', textColor: '#ffffff' },
              },
              text: { primary: '#f8f8f8', secondary: '#c0c0c0', tertiary: '#999999' },
            icon: { primary: '#ffd700' },
          },
        };
        setAppConfig(configWithTheme as AppConfig);
      }
    } catch (error) {
      message.error('加载应用配置失败');
    }
  };

  // 切换功能可见性
  const handleToggleFeature = (featureKey: string, visible: boolean) => {
    setLocalFeatures(prev => ({
      ...prev,
      [featureKey]: visible,
    }));
  };

  // 批量操作：全部显示
  const handleShowAll = () => {
    const newFeatures: Record<string, boolean> = {};
    getFilteredFeatures().forEach(feature => {
      newFeatures[feature.key] = true;
    });
    setLocalFeatures(prev => ({ ...prev, ...newFeatures }));
  };

  // 批量操作：全部隐藏
  const handleHideAll = () => {
    const newFeatures: Record<string, boolean> = {};
    getFilteredFeatures().forEach(feature => {
      newFeatures[feature.key] = false;
    });
    setLocalFeatures(prev => ({ ...prev, ...newFeatures }));
  };

  // 保存更改
  const handleSave = async () => {
    if (!user?.id) {
      message.error('用户未登录');
      return;
    }

    setSaving(true);
    try {
      // 计算需要更新的功能
      const updates: Partial<FeatureVisibilityConfig['features']> = {};
      
      Object.entries(localFeatures).forEach(([key, visible]) => {
        const currentVisible = config?.features[key]?.visible ?? FEATURE_DEFINITIONS.find(f => f.key === key)?.defaultVisible ?? true;
        if (currentVisible !== visible) {
          const feature = FEATURE_DEFINITIONS.find(f => f.key === key);
          if (feature) {
            updates[key] = {
              visible,
              description: feature.description,
              category: feature.category,
              route: feature.route,
              icon: feature.icon,
              updatedAt: new Date(),
              updatedBy: user.id,
            };
          }
        }
      });

      if (Object.keys(updates).length === 0) {
        message.info('没有需要保存的更改');
        return;
      }

      const result = await updateFeatureVisibilityConfig(updates, user.id);
      if (result.success) {
        message.success('配置已保存');
        await loadConfig(); // 重新加载配置
      } else {
        message.error(result.error || '保存失败');
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 重置为默认
  const handleReset = async () => {
    if (!user?.id) {
      message.error('用户未登录');
      return;
    }

    try {
      const result = await resetFeatureVisibilityConfig(user.id);
      if (result.success) {
        message.success('已重置为默认配置');
        await loadConfig();
      } else {
        message.error(result.error || '重置失败');
      }
    } catch (error) {
      message.error('重置失败');
    }
  };

  // 保存应用配置
  const handleSaveAppConfig = async () => {
    if (!user?.id) {
      message.error('用户未登录');
      return;
    }

    setSavingAppConfig(true);
    try {
      const values = await appConfigForm.validateFields();
      // 合并待保存的颜色更改
      const finalColorTheme = appConfig?.colorTheme
        ? {
            ...appConfig.colorTheme,
            ...pendingColorChanges,
          }
        : undefined;
      
      const authConfig = {
        disableGoogleLogin: Boolean(values.disableGoogleLogin),
        disableEmailLogin: Boolean(values.disableEmailLogin),
      };
      
      const geminiConfig = values.geminiModels && values.geminiModels.length > 0
        ? { models: values.geminiModels }
        : undefined;
      
      const result = await updateAppConfig(
        {
          logoUrl: values.logoUrl,
          appName: values.appName,
          hideFooter: values.hideFooter ?? false,
          colorTheme: finalColorTheme, // 使用合并后的颜色主题
          auth: authConfig,
          gemini: geminiConfig,
        },
        user.id
      );
      
      if (result.success) {
        message.success('应用配置已保存');
        setPendingColorChanges({}); // 清空待保存的更改
        await loadAppConfig();
      } else {
        message.error(result.error || '保存失败');
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSavingAppConfig(false);
    }
  };

  // 重置应用配置
  const handleResetAppConfig = async () => {
    if (!user?.id) {
      message.error('用户未登录');
      return;
    }

    try {
      const result = await resetAppConfig(user.id);
      if (result.success) {
        message.success('已重置为默认配置');
        setPendingColorChanges({}); // 清空待保存的颜色更改
        await loadAppConfig();
      } else {
        message.error(result.error || '重置失败');
      }
    } catch (error) {
      message.error('重置失败');
    }
  };

  // 解析 Firebase 配置代码
  const parseFirebaseConfig = (code: string): Partial<{
    firebaseApiKey: string;
    firebaseAuthDomain: string;
    firebaseProjectId: string;
    firebaseStorageBucket: string;
    firebaseMessagingSenderId: string;
    firebaseAppId: string;
    firebaseMeasurementId: string;
  }> => {
    const config: any = {};
    
    // 提取 apiKey
    const apiKeyMatch = code.match(/apiKey:\s*["']([^"']+)["']/);
    if (apiKeyMatch) config.firebaseApiKey = apiKeyMatch[1];
    
    // 提取 authDomain
    const authDomainMatch = code.match(/authDomain:\s*["']([^"']+)["']/);
    if (authDomainMatch) config.firebaseAuthDomain = authDomainMatch[1];
    
    // 提取 projectId
    const projectIdMatch = code.match(/projectId:\s*["']([^"']+)["']/);
    if (projectIdMatch) config.firebaseProjectId = projectIdMatch[1];
    
    // 提取 storageBucket
    const storageBucketMatch = code.match(/storageBucket:\s*["']([^"']+)["']/);
    if (storageBucketMatch) config.firebaseStorageBucket = storageBucketMatch[1];
    
    // 提取 messagingSenderId
    const messagingSenderIdMatch = code.match(/messagingSenderId:\s*["']([^"']+)["']/);
    if (messagingSenderIdMatch) config.firebaseMessagingSenderId = messagingSenderIdMatch[1];
    
    // 提取 appId
    const appIdMatch = code.match(/appId:\s*["']([^"']+)["']/);
    if (appIdMatch) config.firebaseAppId = appIdMatch[1];
    
    // 提取 measurementId（可选）
    const measurementIdMatch = code.match(/measurementId:\s*["']([^"']+)["']/);
    if (measurementIdMatch) config.firebaseMeasurementId = measurementIdMatch[1];
    
    return config;
  };

  // 处理 Firebase 配置代码粘贴
  const handlePasteFirebaseConfig = (code: string) => {
    try {
      const config = parseFirebaseConfig(code);
      const extractedKeys = Object.keys(config);
      
      if (extractedKeys.length === 0) {
        message.error('未能从粘贴的代码中提取到配置信息，请检查代码格式');
        return;
      }
      
      // 填充表单字段
      envForm.setFieldsValue(config);
      message.success(`已自动填充 ${extractedKeys.length} 个配置项`);
    } catch (error) {
      message.error('解析配置代码失败，请检查代码格式');
    }
  };

  // 生成 .env 文件内容
  const generateEnvFile = (values: {
    firebaseApiKey: string;
    firebaseAuthDomain: string;
    firebaseProjectId: string;
    firebaseStorageBucket: string;
    firebaseMessagingSenderId: string;
    firebaseAppId: string;
    firebaseMeasurementId?: string;
    firebaseServiceAccount?: string;
    cloudinaryCloudName: string;
    cloudinaryApiKey: string;
    cloudinaryApiSecret: string;
    cloudinaryUploadPreset: string;
    cloudinaryBaseFolder: string;
    appName: string;
    fcmVapidKey?: string;
    geminiApiKey?: string;
  }): string => {
    const measurementIdLine = values.firebaseMeasurementId 
      ? `VITE_FIREBASE_MEASUREMENT_ID=${values.firebaseMeasurementId}\n`
      : '';
    
    const fcmVapidKeyLine = values.fcmVapidKey
      ? `# FCM 配置\nVITE_FCM_VAPID_KEY=${values.fcmVapidKey}`
      : '';
    
    const geminiApiKeyLine = values.geminiApiKey
      ? `\n# Gemini API 配置\nVITE_GEMINI_API_KEY=${values.geminiApiKey}`
      : '';
    
    // FIREBASE_SERVICE_ACCOUNT 是服务器端环境变量，需要单独处理（JSON 格式）
    const serviceAccountLine = values.firebaseServiceAccount
      ? (() => {
          try {
            // 尝试解析并压缩 JSON
            const parsed = JSON.parse(values.firebaseServiceAccount.trim());
            const compressed = JSON.stringify(parsed);
            return `\n# Firebase Service Account (用于 Netlify Functions)\n# 注意：这是服务器端环境变量，不会自动部署到 Netlify\n# 需要在 Netlify 控制台的 Environment variables 中手动设置 FIREBASE_SERVICE_ACCOUNT\n# 值为以下 JSON 内容（已压缩为单行）：\nFIREBASE_SERVICE_ACCOUNT=${compressed}`;
          } catch {
            // 如果解析失败，使用原始值（压缩空格和换行）
            const compressed = values.firebaseServiceAccount.trim().replace(/\s+/g, ' ').replace(/\n/g, '');
            return `\n# Firebase Service Account (用于 Netlify Functions)\n# 注意：这是服务器端环境变量，不会自动部署到 Netlify\n# 需要在 Netlify 控制台的 Environment variables 中手动设置 FIREBASE_SERVICE_ACCOUNT\n# 值为以下 JSON 内容（已压缩为单行）：\nFIREBASE_SERVICE_ACCOUNT=${compressed}`;
          }
        })()
      : '';
    
    return `# Firebase配置
VITE_FIREBASE_API_KEY=${values.firebaseApiKey}
VITE_FIREBASE_AUTH_DOMAIN=${values.firebaseAuthDomain}
VITE_FIREBASE_PROJECT_ID=${values.firebaseProjectId}
VITE_FIREBASE_STORAGE_BUCKET=${values.firebaseStorageBucket}
VITE_FIREBASE_MESSAGING_SENDER_ID=${values.firebaseMessagingSenderId}
VITE_FIREBASE_APP_ID=${values.firebaseAppId}${measurementIdLine ? '\n' + measurementIdLine : ''}${serviceAccountLine}
# Cloudinary配置
VITE_CLOUDINARY_CLOUD_NAME=${values.cloudinaryCloudName}
VITE_CLOUDINARY_API_KEY=${values.cloudinaryApiKey}
VITE_CLOUDINARY_API_SECRET=${values.cloudinaryApiSecret}
VITE_CLOUDINARY_UPLOAD_PRESET=${values.cloudinaryUploadPreset}
VITE_CLOUDINARY_BASE_FOLDER=${values.cloudinaryBaseFolder}

# 应用配置
VITE_APP_NAME=${values.appName}${fcmVapidKeyLine ? '\n\n' + fcmVapidKeyLine : ''}${geminiApiKeyLine}`;
  };

  // 部署到 Netlify
  const handleDeployToNetlify = async () => {
    try {
      const values = await envForm.validateFields();
      const { netlifyAccessToken, netlifySiteId } = values;

      if (!netlifyAccessToken || !netlifySiteId) {
        message.error('请填写 Netlify Access Token 和 Site ID 以进行部署');
        return;
      }

      setDeploying(true);
      setDeployStatus({ state: 'updating', message: '正在更新环境变量...' });

      // 构建环境变量数组
      const envVars = [
        { key: 'VITE_FIREBASE_API_KEY', value: values.firebaseApiKey, scopes: ['all'] },
        { key: 'VITE_FIREBASE_AUTH_DOMAIN', value: values.firebaseAuthDomain, scopes: ['all'] },
        { key: 'VITE_FIREBASE_PROJECT_ID', value: values.firebaseProjectId, scopes: ['all'] },
        { key: 'VITE_FIREBASE_STORAGE_BUCKET', value: values.firebaseStorageBucket, scopes: ['all'] },
        { key: 'VITE_FIREBASE_MESSAGING_SENDER_ID', value: values.firebaseMessagingSenderId, scopes: ['all'] },
        { key: 'VITE_FIREBASE_APP_ID', value: values.firebaseAppId, scopes: ['all'] },
        { key: 'VITE_CLOUDINARY_CLOUD_NAME', value: values.cloudinaryCloudName, scopes: ['all'] },
        { key: 'VITE_CLOUDINARY_API_KEY', value: values.cloudinaryApiKey, scopes: ['all'] },
        { key: 'VITE_CLOUDINARY_API_SECRET', value: values.cloudinaryApiSecret, scopes: ['all'] },
        { key: 'VITE_CLOUDINARY_UPLOAD_PRESET', value: values.cloudinaryUploadPreset, scopes: ['all'] },
        { key: 'VITE_CLOUDINARY_BASE_FOLDER', value: values.cloudinaryBaseFolder, scopes: ['all'] },
        { key: 'VITE_APP_NAME', value: values.appName, scopes: ['all'] },
      ];

      // 如果提供了 Measurement ID，添加到环境变量数组
      if (values.firebaseMeasurementId) {
        envVars.push({ key: 'VITE_FIREBASE_MEASUREMENT_ID', value: values.firebaseMeasurementId, scopes: ['all'] });
      }

      // 如果提供了 FCM VAPID Key，添加到环境变量数组
      if (values.fcmVapidKey) {
        envVars.push({ key: 'VITE_FCM_VAPID_KEY', value: values.fcmVapidKey, scopes: ['all'] });
      }

      // 如果提供了 Gemini API Key，添加到环境变量数组
      if (values.geminiApiKey) {
        envVars.push({ key: 'VITE_GEMINI_API_KEY', value: values.geminiApiKey, scopes: ['all'] });
      }

      // 如果提供了 Firebase Service Account，添加到环境变量数组（服务器端变量，不使用 VITE_ 前缀）
      if (values.firebaseServiceAccount) {
        // Service Account JSON 需要压缩为单行（移除所有换行和多余空格）
        try {
          // 先尝试解析 JSON 以确保格式正确
          const parsed = JSON.parse(values.firebaseServiceAccount.trim());
          // 压缩为单行 JSON
          const serviceAccountJson = JSON.stringify(parsed);
          envVars.push({ key: 'FIREBASE_SERVICE_ACCOUNT', value: serviceAccountJson, scopes: ['functions'] });
        } catch (error) {
          message.warning('Firebase Service Account JSON 格式不正确，将使用原始值。请确保 JSON 格式正确。');
          // 如果解析失败，使用压缩后的原始值
          const serviceAccountJson = values.firebaseServiceAccount.trim().replace(/\s+/g, ' ').replace(/\n/g, '');
          envVars.push({ key: 'FIREBASE_SERVICE_ACCOUNT', value: serviceAccountJson, scopes: ['functions'] });
        }
      }

      // 调用 Netlify Function
      const response = await fetch('/.netlify/functions/update-netlify-env', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: netlifyAccessToken,
          siteId: netlifySiteId,
          envVars,
          triggerDeploy: true,
          clearCache: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '部署失败');
      }

      if (result.success) {
        setDeployStatus({
          state: 'deploying',
          message: '环境变量已更新，正在触发部署...',
          deployId: result.deploy?.id,
          deployUrl: result.deploy?.url,
        });

        message.success('环境变量已更新，部署已触发');
        
        // 轮询部署状态
        if (result.deploy?.id) {
          pollDeployStatus(netlifyAccessToken, netlifySiteId, result.deploy.id);
        } else {
          setDeployStatus({
            state: 'success',
            message: '部署已触发，请前往 Netlify 控制台查看进度',
          });
          setDeploying(false);
        }
      }
    } catch (error: any) {
      console.error('[Deploy to Netlify] Error:', error);
      setDeployStatus({
        state: 'error',
        message: error.message || '部署失败，请检查配置',
      });
      message.error(error.message || '部署失败');
      setDeploying(false);
    }
  };

  // 部署 Firebase 索引
  const handleDeployFirestoreIndexes = async () => {
    try {
      // 使用 getFieldsValue 获取值，避免验证错误
      const values = envForm.getFieldsValue(['firebaseProjectId']);
      const { firebaseProjectId } = values;

      if (!firebaseProjectId) {
        message.error('请填写 Firebase Project ID');
        return;
      }

      setIndexDeploying(true);
      setIndexDeployStatus({ state: 'deploying', message: '正在部署 Firestore 索引...' });

      // 调用 Netlify Function 部署索引（Function 会读取 firestore.indexes.json）
      const deployResponse = await fetch(`/.netlify/functions/deploy-firestore-indexes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: firebaseProjectId,
        }),
      });

      if (!deployResponse.ok) {
        const errorData = await deployResponse.json();
        throw new Error(errorData.error || '部署失败');
      }

      const result = await deployResponse.json();

      // 即使部分失败，也显示结果
      if (result.success || (result.summary && result.summary.succeeded > 0)) {
        setIndexDeployStatus({
          state: result.success ? 'success' : 'error',
          message: result.message || (result.success ? '索引部署成功！' : '部分索引部署失败'),
          links: result.links,
          summary: result.summary,
          results: result.results,
          consoleUrl: result.consoleUrl,
        });
        if (result.success) {
          message.success(result.message || '索引部署成功！');
        } else {
          message.warning(result.message || '部分索引部署失败');
        }
      } else {
        setIndexDeployStatus({
          state: 'error',
          message: result.message || '部署失败',
          summary: result.summary,
          results: result.results,
          consoleUrl: result.consoleUrl,
        });
        message.error(result.message || '部署失败');
      }
    } catch (error: any) {
      console.error('[handleDeployFirestoreIndexes] Error:', error);
      setIndexDeployStatus({
        state: 'error',
        message: error.message || '部署失败，请检查配置',
      });
      message.error(error.message || '部署失败');
    } finally {
      setIndexDeploying(false);
    }
  };

  // 轮询部署状态
  const pollDeployStatus = async (accessToken: string, siteId: string, deployId: string) => {
    const maxAttempts = 60; // 最多轮询 60 次（5分钟）
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/.netlify/functions/update-netlify-env`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessToken,
            siteId,
            action: 'getDeployStatus',
            deployId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get deploy status');
        }

        const result = await response.json();

        if (!result.success || !result.deploy) {
          throw new Error('Invalid response from server');
        }

        const deployState = result.deploy.state;

        if (deployState === 'ready') {
          setDeployStatus({
            state: 'success',
            message: '部署成功！',
            deployId: result.deploy.id,
            deployUrl: result.deploy.url,
          });
          message.success('部署成功！');
          setDeploying(false);
          return;
        } else if (deployState === 'error' || deployState === 'failed') {
          setDeployStatus({
            state: 'error',
            message: '部署失败，请查看 Netlify 控制台',
            deployId: result.deploy.id,
            deployUrl: result.deploy.url,
          });
          message.error('部署失败');
          setDeploying(false);
          return;
        } else if (deployState === 'building' || deployState === 'new' || deployState === 'enqueued') {
          // 继续轮询
          setDeployStatus({
            state: 'deploying',
            message: `部署中... (状态: ${deployState})`,
            deployId: result.deploy.id,
            deployUrl: result.deploy.url,
          });
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // 每 5 秒轮询一次
        } else {
          setDeployStatus({
            state: 'success',
            message: '部署已触发，请前往 Netlify 控制台查看进度',
            deployId,
          });
          setDeploying(false);
        }
      } catch (error) {
        console.error('[Poll Deploy Status] Error:', error);
        setDeployStatus({
          state: 'error',
          message: '无法获取部署状态',
        });
        setDeploying(false);
      }
    };

    poll();
  };

  // 处理颜色更改（暂存，不立即保存）
  const handleColorChange = (colors: Partial<ColorThemeConfig>) => {
    setPendingColorChanges(prev => ({
      ...prev,
      ...colors,
    }));
    
    // 实时更新本地状态以预览效果
    if (appConfig?.colorTheme) {
      setAppConfig({
        ...appConfig,
        colorTheme: {
          ...appConfig.colorTheme,
          ...colors,
        },
      });
    }
  };

  // 保存颜色更改
  const handleSaveColorTheme = async () => {
    if (!user?.id || !appConfig || !appConfig.colorTheme) {
      message.error('用户未登录或配置未加载');
      return;
    }

    if (Object.keys(pendingColorChanges).length === 0) {
      message.info('没有需要保存的更改');
      return;
    }

    setSavingAppConfig(true);
    try {
      const updatedColorTheme: ColorThemeConfig = {
        ...appConfig.colorTheme,
        ...pendingColorChanges,
      };

      const result = await updateAppConfig(
        {
          colorTheme: updatedColorTheme,
        },
        user.id
      );

      if (result.success) {
        message.success('颜色配置已保存');
        setPendingColorChanges({});
        await loadAppConfig();
      } else {
        message.error(result.error || '保存失败');
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSavingAppConfig(false);
    }
  };

  // 重置颜色配置
  const handleResetColorTheme = async () => {
    if (!user?.id) {
      message.error('用户未登录');
      return;
    }

    try {
      const result = await resetAppConfig(user.id);
      if (result.success) {
        message.success('已重置为默认配置');
        setPendingColorChanges({});
        await loadAppConfig();
      } else {
        message.error(result.error || '重置失败');
      }
    } catch (error) {
      message.error('重置失败');
    }
  };

  // 获取过滤后的功能列表
  const getFilteredFeatures = (): FeatureDefinition[] => {
    let features = FEATURE_DEFINITIONS.filter(f => f.category === activeTab);
    
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      features = features.filter(f => {
        const name = i18n.language === 'zh-CN' ? f.name : f.nameEn;
        const desc = i18n.language === 'zh-CN' ? f.description : f.descriptionEn;
        return name.toLowerCase().includes(searchLower) || desc.toLowerCase().includes(searchLower);
      });
    }
    
    return features;
  };

  // 获取功能名称（根据语言）
  const getFeatureName = (feature: FeatureDefinition): string => {
    return i18n.language === 'zh-CN' ? feature.name : feature.nameEn;
  };

  // 获取功能描述（根据语言）
  const getFeatureDescription = (feature: FeatureDefinition): string => {
    return i18n.language === 'zh-CN' ? feature.description : feature.descriptionEn;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  const filteredFeatures = getFilteredFeatures();
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

  return (
    <div style={{ paddingBottom: isMobile ? '100px' : '0' }}>
      <Title level={2} style={{
        marginBottom: 8,
        background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontWeight: 700,
      }}>
        {t('featureManagement.title', { defaultValue: '功能管理' })}
      </Title>
      <Text style={{ color: '#c0c0c0', fontSize: '14px', display: 'block', marginBottom: 24 }}>
        {t('featureManagement.description', { defaultValue: '配置系统中各个功能的显示/隐藏状态' })}
      </Text>

      {/* 标签页 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(244,175,37,0.2)',
          marginBottom: 16
        }}>
          {(['frontend', 'admin', 'app', 'whapi', 'env'] as const).map((tabKey) => {
            const isActive = activeTab === tabKey;
            const baseStyle: React.CSSProperties = {
              flex: 1,
              padding: '10px 0',
              fontWeight: 800,
              fontSize: 12,
              outline: 'none',
              borderBottom: isActive ? '2px solid #f4af25' : '2px solid transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              background: 'none',
            };
            const activeStyle: React.CSSProperties = {
              color: 'transparent',
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
              WebkitBackgroundClip: 'text',
            };
            const inactiveStyle: React.CSSProperties = {
              color: '#A0A0A0',
            };

            return (
              <button
                key={tabKey}
                style={{
                  ...baseStyle,
                  ...(isActive ? activeStyle : inactiveStyle),
                }}
                onClick={() => setActiveTab(tabKey)}
              >
                {tabKey === 'frontend' 
                  ? t('featureManagement.frontendFeatures', { defaultValue: '前端功能' })
                  : tabKey === 'admin'
                  ? t('featureManagement.adminFeatures', { defaultValue: '管理后台功能' })
                  : tabKey === 'app'
                  ? t('featureManagement.appSettings', { defaultValue: '应用配置' })
                  : tabKey === 'whapi'
                  ? t('featureManagement.whapiSettings', { defaultValue: 'WhatsApp 管理' })
                  : t('featureManagement.envSettings', { defaultValue: '环境配置' })}
              </button>
            );
          })}
        </div>
      </div>

      {/* 搜索和批量操作（仅功能标签页显示） */}
      {activeTab !== 'app' && activeTab !== 'whapi' && activeTab !== 'env' && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <Search
            placeholder={t('featureManagement.searchPlaceholder', { defaultValue: '搜索功能...' })}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ flex: 1, maxWidth: 300 }}
            prefix={<SearchOutlined />}
          />
          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={handleShowAll}
              size="small"
            >
              {t('featureManagement.showAll', { defaultValue: '全部显示' })}
            </Button>
            <Button
              icon={<EyeInvisibleOutlined />}
              onClick={handleHideAll}
              size="small"
            >
              {t('featureManagement.hideAll', { defaultValue: '全部隐藏' })}
            </Button>
          </Space>
        </div>
      )}

      {/* 功能列表或应用配置 */}
      {activeTab === 'app' ? (
        <Card style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          border: '1px solid rgba(244, 175, 37, 0.6)',
          backdropFilter: 'blur(10px)'
        }}>
          <Form
            form={appConfigForm}
            layout="vertical"
            onFinish={handleSaveAppConfig}
          >
            <Form.Item
              label={<span style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600 }}>应用 Logo</span>}
              name="logoUrl"
              rules={[{ required: true, message: '请上传应用 Logo' }]}
            >
              <ImageUpload
                folder="app-config"
                maxSize={2 * 1024 * 1024} // 2MB
                width="auto"
                height="auto"
                showPreview={false}
                enableCrop={true}
                accept="image/png,image/jpeg,image/jpg,image/webp"
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600 }}>应用名称</span>}
              name="appName"
              rules={[{ required: true, message: '请输入应用名称' }]}
            >
              <Input
                placeholder="例如：Cigar Club"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f8f8f8',
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600 }}>隐藏 Footer</span>}
              name="hideFooter"
              valuePropName="checked"
            >
              <Switch
                checkedChildren={<span style={{ color: '#000' }}>隐藏</span>}
                unCheckedChildren={<span style={{ color: '#000' }}>显示</span>}
                style={{
                  background: appConfigForm.getFieldValue('hideFooter') ? 'linear-gradient(to right,#FDE08D,#C48D3A)' : undefined,
                }}
              />
            </Form.Item>

            <Divider style={{ borderColor: 'rgba(244, 175, 37, 0.2)', margin: '24px 0' }} />

            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600 }}>
                登录方式配置
              </Text>
            </div>

            <Form.Item
              label={<span style={{ color: '#f8f8f8', fontSize: '16px' }}>禁用 Google 登录</span>}
              name="disableGoogleLogin"
              valuePropName="checked"
              getValueFromEvent={(checked) => checked}
              style={{ marginBottom: 16 }}
            >
              <Switch
                checkedChildren={<span style={{ color: '#000' }}>禁用</span>}
                unCheckedChildren={<span style={{ color: '#000' }}>启用</span>}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: '#f8f8f8', fontSize: '16px' }}>禁用电邮登录</span>}
              name="disableEmailLogin"
              valuePropName="checked"
              getValueFromEvent={(checked) => checked}
              style={{ marginBottom: 16 }}
            >
              <Switch
                checkedChildren={<span style={{ color: '#000' }}>禁用</span>}
                unCheckedChildren={<span style={{ color: '#000' }}>启用</span>}
              />
            </Form.Item>

            <Divider style={{ borderColor: 'rgba(244, 175, 37, 0.2)', margin: '24px 0' }} />

            {/* Gemini API 模型设定 */}
            <div style={{ marginBottom: 24 }}>
              <Text style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600 }}>
                Gemini API 模型设定
              </Text>
              <Text style={{ color: '#c0c0c0', fontSize: '12px', display: 'block', marginTop: 8, marginBottom: 16 }}>
                选择用于 AI 雪茄识别的 Gemini 模型列表。系统会按顺序尝试这些模型，直到找到一个可用的模型。
              </Text>
              
              <Form.Item
                label={<span style={{ color: '#f8f8f8', fontSize: '16px' }}>可用模型</span>}
                name="geminiModels"
                extra={
                  <Text style={{ color: '#999', fontSize: '12px' }}>
                    基于实测结果 (2025-12-04): 测试了27个模型，仅15个可用。
                    ⭐推荐使用星级标注的模型。按住 Ctrl/Cmd 键可多选。
                  </Text>
                }
              >
                <Select
                  mode="multiple"
                  placeholder="选择 Gemini 模型（推荐前3个）"
                  allowClear
                  popupClassName="gemini-models-dropdown"
                  style={{
                    width: '100%',
                  }}
                  options={[
                    // 🥇 最佳选择（100%成功率, 极快 1.8-2.2s）
                    { 
                      label: '⭐⭐⭐⭐⭐ gemini-flash-lite-latest (1.8s, 最佳推荐)', 
                      value: 'gemini-flash-lite-latest' 
                    },
                    { 
                      label: '⭐⭐⭐⭐⭐ gemini-2.5-flash-lite-preview-09-2025 (2.2s)', 
                      value: 'gemini-2.5-flash-lite-preview-09-2025' 
                    },
                    
                    // 🥈 优秀选择（100%成功率, 快速 3.5-9.7s）
                    { 
                      label: '⭐⭐⭐⭐⭐ gemini-2.0-flash-001 (3.5s)', 
                      value: 'gemini-2.0-flash-001' 
                    },
                    { 
                      label: '⭐⭐⭐⭐ gemini-2.0-flash (3.9s)', 
                      value: 'gemini-2.0-flash' 
                    },
                    { 
                      label: '⭐⭐⭐⭐ gemini-2.5-flash (9.7s)', 
                      value: 'gemini-2.5-flash' 
                    },
                    
                    // 🥉 稳定选择（100%成功率, 较慢 15-17s）
                    { 
                      label: '⭐⭐⭐⭐ gemini-pro-latest (15.5s)', 
                      value: 'gemini-pro-latest' 
                    },
                    { 
                      label: '⭐⭐⭐⭐ gemini-robotics-er-1.5-preview (16.7s)', 
                      value: 'gemini-robotics-er-1.5-preview' 
                    },
                    
                    // 备选方案（60-80%成功率）
                    { 
                      label: '⭐⭐⭐ gemini-2.5-flash-lite (60%成功率)', 
                      value: 'gemini-2.5-flash-lite' 
                    },
                    { 
                      label: '⭐⭐⭐ gemini-flash-latest (80%成功率)', 
                      value: 'gemini-flash-latest' 
                    },
                    { 
                      label: '⭐⭐⭐ gemini-2.0-flash-lite (60%成功率)', 
                      value: 'gemini-2.0-flash-lite' 
                    },
                    { 
                      label: '⭐⭐⭐ gemini-2.0-flash-lite-001 (40%成功率, 52.8s)', 
                      value: 'gemini-2.0-flash-lite-001' 
                    },
                    { 
                      label: '⭐⭐⭐ gemini-2.0-flash-lite-preview (60%成功率)', 
                      value: 'gemini-2.0-flash-lite-preview' 
                    },
                    { 
                      label: '⭐⭐⭐ gemini-2.5-pro (60%成功率, 每分钟限2次)', 
                      value: 'gemini-2.5-pro' 
                    },
                    { 
                      label: '⭐⭐⭐ gemini-2.5-flash-preview-09-2025 (60%成功率)', 
                      value: 'gemini-2.5-flash-preview-09-2025' 
                    },
                    { 
                      label: '⭐⭐⭐ gemini-2.0-flash-lite-preview-02-05 (80%成功率)', 
                      value: 'gemini-2.0-flash-lite-preview-02-05' 
                    },
                  ]}
                  dropdownStyle={{
                    background: 'rgba(26, 26, 26, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                />
              </Form.Item>
            </div>

            {/* 颜色主题管理 */}
            <div style={{ marginTop: 32 }}>
              <div style={{ 
                marginBottom: 16, 
                paddingBottom: 12, 
                borderBottom: '1px solid rgba(244, 175, 37, 0.2)' 
              }}>
                <Text style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600 }}>
                  颜色主题管理
                </Text>
              </div>
              
              <MockAppInterface
                colorTheme={appConfig?.colorTheme || DEFAULT_COLOR_THEME}
                onColorChange={handleColorChange}
                onSave={handleSaveColorTheme}
                onReset={handleResetColorTheme}
                saving={savingAppConfig}
              />
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleResetAppConfig}
                disabled={savingAppConfig}
              >
                {t('featureManagement.resetToDefault', { defaultValue: '重置为默认' })}
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                htmlType="submit"
                loading={savingAppConfig}
                style={{
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  border: 'none',
                }}
              >
                {t('featureManagement.saveChanges', { defaultValue: '保存更改' })}
              </Button>
            </div>
          </Form>
        </Card>
      ) : null}

      {/* WhatsApp 管理标签页 */}
      {activeTab === 'whapi' ? (
        <>
          <Card style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            border: '1px solid rgba(244, 175, 37, 0.6)',
            backdropFilter: 'blur(10px)',
            marginBottom: 16,
          }}>
            <Form
              form={whapiForm}
              layout="vertical"
              onFinish={async () => {
                if (!user?.id) {
                  message.error('用户未登录');
                  return;
                }

                setSavingAppConfig(true);
                try {
                  const values = await whapiForm.validateFields();
                  const whapiConfig = {
                    apiToken: values.whapiApiToken,
                    channelId: values.whapiChannelId,
                    baseUrl: values.whapiBaseUrl || 'https://gate.whapi.cloud',
                    enabled: values.whapiEnabled ?? false,
                    features: {
                      eventReminder: values.whapiEventReminder ?? true,
                      vipExpiry: values.whapiVipExpiry ?? true,
                      passwordReset: values.whapiPasswordReset ?? true,
                    },
                  };

                  const result = await updateAppConfig(
                    { whapi: whapiConfig },
                    user.id
                  );

                  if (result.success) {
                    message.success('WhatsApp 配置已保存');
                    await loadAppConfig();
                    // 重新初始化 Whapi 客户端
                    const { initWhapiClient } = await import('../../../services/whapi');
                    await initWhapiClient(whapiConfig);
                  } else {
                    message.error(result.error || '保存失败');
                  }
                } catch (error) {
                  message.error('保存失败');
                } finally {
                  setSavingAppConfig(false);
                }
              }}
            >
              <Form.Item
                name="whapiEnabled"
                valuePropName="checked"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600 }}>启用 WhatsApp</span>
                  <Switch
                    checkedChildren={<span style={{ color: '#000' }}>启用</span>}
                    unCheckedChildren={<span style={{ color: '#000' }}>禁用</span>}
                  />
                </div>
              </Form.Item>

              <Form.Item
                label={<span style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600 }}>API 配置</span>}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <Form.Item
                    label={<span style={{ color: '#f8f8f8', fontSize: '14px', fontWeight: 600 }}>API Token</span>}
                    name="whapiApiToken"
                    rules={[{ required: true, message: '请输入 API Token' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input.Password
                      placeholder="输入 Whapi.Cloud API Token"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#f8f8f8',
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span style={{ color: '#f8f8f8', fontSize: '14px', fontWeight: 600 }}>Channel ID</span>}
                    name="whapiChannelId"
                    style={{ marginBottom: 0 }}
                  >
                    <Input
                      placeholder="输入 Channel ID（可选）"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#f8f8f8',
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span style={{ color: '#f8f8f8', fontSize: '14px', fontWeight: 600 }}>Base URL</span>}
                    name="whapiBaseUrl"
                    style={{ marginBottom: 0 }}
                  >
                    <Input
                      placeholder="https://gate.whapi.cloud"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#f8f8f8',
                      }}
                    />
                  </Form.Item>
                </div>
              </Form.Item>

              <Divider style={{ margin: '24px 0', borderColor: 'rgba(255, 255, 255, 0.1)' }} />

              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600, display: 'block', marginBottom: 16 }}>
                  功能开关
                </Text>
                <Text style={{ color: '#c0c0c0', fontSize: '14px', display: 'block', marginBottom: 16 }}>
                  控制自动发送消息功能的启用/禁用
                </Text>
              </div>

              <Form.Item
                label={<span style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600 }}>功能开关</span>}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <Form.Item
                    label={<span style={{ color: '#f8f8f8', fontSize: '14px', fontWeight: 600 }}>活动提醒</span>}
                    name="whapiEventReminder"
                    valuePropName="checked"
                    style={{ marginBottom: 0 }}
                  >
                    <Switch
                      checkedChildren={<span style={{ color: '#000' }}>启用</span>}
                      unCheckedChildren={<span style={{ color: '#000' }}>禁用</span>}
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span style={{ color: '#f8f8f8', fontSize: '14px', fontWeight: 600 }}>VIP到期提醒</span>}
                    name="whapiVipExpiry"
                    valuePropName="checked"
                    style={{ marginBottom: 0 }}
                  >
                    <Switch
                      checkedChildren={<span style={{ color: '#000' }}>启用</span>}
                      unCheckedChildren={<span style={{ color: '#000' }}>禁用</span>}
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span style={{ color: '#f8f8f8', fontSize: '14px', fontWeight: 600 }}>重置密码</span>}
                    name="whapiPasswordReset"
                    valuePropName="checked"
                    style={{ marginBottom: 0 }}
                  >
                    <Switch
                      checkedChildren={<span style={{ color: '#000' }}>启用</span>}
                      unCheckedChildren={<span style={{ color: '#000' }}>禁用</span>}
                    />
                  </Form.Item>
                </div>
              </Form.Item>

              <Form.Item>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    htmlType="submit"
                    loading={savingAppConfig}
                    style={{
                      background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                      border: 'none',
                      color: '#000',
                    }}
                  >
                    {t('featureManagement.saveChanges', { defaultValue: '保存配置' })}
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </Card>

          {/* 消息发送测试 */}
          <WhapiMessageTester whapiConfig={appConfig?.whapi} />
        </>
      ) : null}

      {/* 环境配置标签页 */}
      {activeTab === 'env' ? (
        <Card style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          border: '1px solid rgba(244, 175, 37, 0.6)',
          backdropFilter: 'blur(10px)',
          marginBottom: 16,
        }}>
          <Alert
            message="重要提示"
            description="此配置不会保存到数据库。您可以生成 .env 文件下载，或直接部署到 Netlify 环境变量。页面刷新后表单将清空。"
            type="warning"
            showIcon
            style={{
              marginBottom: 24,
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
            }}
          />

          <Form
            form={envForm}
            layout="horizontal"
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 18 }}
            onFinish={(values) => {
              const envContent = generateEnvFile(values);
              setGeneratedEnv(envContent);
            }}
          >
            {/* Firebase 配置 */}
            <div style={{ marginBottom: 24 }}>
              <Text style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600, display: 'block', marginBottom: 16 }}>
                Firebase 配置
              </Text>
              <Text style={{ color: '#c0c0c0', fontSize: '12px', display: 'block', marginBottom: 16 }}>
                可在 <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#ffd700' }}>Firebase 控制台</a> 的项目设置中找到这些配置信息。进入项目设置 &gt; 常规 &gt; 您的应用，即可查看所有配置值。Measurement ID（可选）用于 Google Analytics，可在项目设置 &gt; 集成 &gt; Google Analytics 中找到。
              </Text>
              
              {/* Firebase 配置代码粘贴区域 */}
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#c0c0c0', fontSize: '12px', display: 'block', marginBottom: 8 }}>
                  快速填充：粘贴 Firebase 配置代码（从 Firebase 控制台复制的代码）
                </Text>
                <TextArea
                  placeholder="粘贴 Firebase 配置代码，例如：const firebaseConfig = { apiKey: '...', authDomain: '...', ... }"
                  rows={4}
                  value={firebaseConfigCode}
                  onChange={(e) => setFirebaseConfigCode(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    marginBottom: 8,
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="primary"
                    onClick={() => {
                      if (firebaseConfigCode.trim()) {
                        handlePasteFirebaseConfig(firebaseConfigCode);
                        setFirebaseConfigCode('');
                      } else {
                        message.warning('请先粘贴 Firebase 配置代码');
                      }
                    }}
                    style={{
                      background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                      border: 'none',
                      color: '#000',
                    }}
                  >
                    解析并填充
                  </Button>
                </div>
              </div>
              
              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>API Key</span>}
                name="firebaseApiKey"
                rules={[{ required: true, message: '请输入 Firebase API Key' }]}
              >
                <Input
                  type={showSecrets.firebaseApiKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  suffix={
                    <Button
                      type="text"
                      icon={showSecrets.firebaseApiKey ? <EyeOutlined style={{ color: '#ffd700' }} /> : <EyeInvisibleOutlined style={{ color: '#ffd700' }} />}
                      onClick={() => setShowSecrets(prev => ({ ...prev, firebaseApiKey: !prev.firebaseApiKey }))}
                      style={{ border: 'none', color: '#ffd700' }}
                    />
                  }
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>Auth Domain</span>}
                name="firebaseAuthDomain"
                rules={[{ required: true, message: '请输入 Firebase Auth Domain' }]}
              >
                <Input
                  placeholder="project.firebaseapp.com"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>Project ID</span>}
                name="firebaseProjectId"
                rules={[{ required: true, message: '请输入 Firebase Project ID' }]}
                extra={
                  <Text style={{ color: '#999', fontSize: '12px' }}>
                    用于部署 Firestore 索引。需要配置 FIREBASE_SERVICE_ACCOUNT 环境变量，并确保 Service Account 具有 'Cloud Datastore Index Admin' 权限。
                  </Text>
                }
              >
                <Input
                  placeholder="your-project-id"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>Storage Bucket</span>}
                name="firebaseStorageBucket"
                rules={[{ required: true, message: '请输入 Firebase Storage Bucket' }]}
              >
                <Input
                  placeholder="project.firebasestorage.app"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>Messaging Sender ID</span>}
                name="firebaseMessagingSenderId"
                rules={[{ required: true, message: '请输入 Firebase Messaging Sender ID' }]}
              >
                <Input
                  placeholder="123456789012"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>App ID</span>}
                name="firebaseAppId"
                rules={[{ required: true, message: '请输入 Firebase App ID' }]}
              >
                <Input
                  placeholder="1:123456789012:web:abc123"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>Measurement ID</span>}
                name="firebaseMeasurementId"
                rules={[{ required: false, message: '请输入 Firebase Measurement ID' }]}
              >
                <Input
                  placeholder="G-XXXXXXXXXX"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>Service Account</span>}
                name="firebaseServiceAccount"
                rules={[{ required: false, message: '请输入 Firebase Service Account JSON' }]}
                extra={
                  <Text style={{ color: '#999', fontSize: '12px' }}>
                    用于 Netlify Functions（如重置密码、部署索引等）。在 <a href="https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk" target="_blank" rel="noopener noreferrer" style={{ color: '#ffd700' }}>Firebase 控制台</a> 生成新的私钥，将 JSON 内容粘贴到此处。注意：这是服务器端环境变量，不会包含在 VITE_ 前缀中。
                  </Text>
                }
              >
                <div style={{ position: 'relative' }}>
                  <Input.TextArea
                    placeholder='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...",...}'
                    rows={6}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8f8f8',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      paddingRight: '40px',
                    }}
                  />
                  <Button
                    type="text"
                    icon={showSecrets.firebaseServiceAccount ? <EyeOutlined style={{ color: '#ffd700' }} /> : <EyeInvisibleOutlined style={{ color: '#ffd700' }} />}
                    onClick={() => setShowSecrets(prev => ({ ...prev, firebaseServiceAccount: !prev.firebaseServiceAccount }))}
                    style={{ 
                      position: 'absolute', 
                      right: 8, 
                      top: 8,
                      border: 'none', 
                      color: '#ffd700',
                      zIndex: 1
                    }}
                  />
                </div>
              </Form.Item>
            </div>

            <Divider style={{ borderColor: 'rgba(244, 175, 37, 0.2)', margin: '24px 0' }} />

            {/* Cloudinary 配置 */}
            <div style={{ marginBottom: 24 }}>
              <Text style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600, display: 'block', marginBottom: 16 }}>
                Cloudinary 配置
              </Text>
              <Text style={{ color: '#c0c0c0', fontSize: '12px', display: 'block', marginBottom: 16 }}>
                可在 <a href="https://console.cloudinary.com" target="_blank" rel="noopener noreferrer" style={{ color: '#ffd700' }}>Cloudinary 控制台</a> 的仪表板中找到这些配置信息。登录后，在仪表板页面即可查看 Cloud Name、API Key 和 API Secret。Upload Preset 可在设置 &gt; 上传预设中创建或查看，Base Folder 是上传文件的默认文件夹路径。
              </Text>
              
              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>Cloud Name</span>}
                name="cloudinaryCloudName"
                rules={[{ required: true, message: '请输入 Cloudinary Cloud Name' }]}
              >
                <Input
                  placeholder="your-cloud-name"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>API Key</span>}
                name="cloudinaryApiKey"
                rules={[{ required: true, message: '请输入 Cloudinary API Key' }]}
              >
                <Input
                  type={showSecrets.cloudinaryApiKey ? 'text' : 'password'}
                  placeholder="123456789012345"
                  suffix={
                    <Button
                      type="text"
                      icon={showSecrets.cloudinaryApiKey ? <EyeOutlined style={{ color: '#ffd700' }} /> : <EyeInvisibleOutlined style={{ color: '#ffd700' }} />}
                      onClick={() => setShowSecrets(prev => ({ ...prev, cloudinaryApiKey: !prev.cloudinaryApiKey }))}
                      style={{ border: 'none', color: '#ffd700' }}
                    />
                  }
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>API Secret</span>}
                name="cloudinaryApiSecret"
                rules={[{ required: true, message: '请输入 Cloudinary API Secret' }]}
              >
                <Input
                  type={showSecrets.cloudinaryApiSecret ? 'text' : 'password'}
                  placeholder="your-api-secret"
                  suffix={
                    <Button
                      type="text"
                      icon={showSecrets.cloudinaryApiSecret ? <EyeOutlined style={{ color: '#ffd700' }} /> : <EyeInvisibleOutlined style={{ color: '#ffd700' }} />}
                      onClick={() => setShowSecrets(prev => ({ ...prev, cloudinaryApiSecret: !prev.cloudinaryApiSecret }))}
                      style={{ border: 'none', color: '#ffd700' }}
                    />
                  }
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>Upload Preset</span>}
                name="cloudinaryUploadPreset"
                rules={[{ required: true, message: '请输入 Cloudinary Upload Preset' }]}
              >
                <Input
                  placeholder="jep-cigar"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>Base Folder</span>}
                name="cloudinaryBaseFolder"
                rules={[{ required: true, message: '请输入 Cloudinary Base Folder' }]}
              >
                <Input
                  placeholder="jep-cigar"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>
            </div>

            <Divider style={{ borderColor: 'rgba(244, 175, 37, 0.2)', margin: '24px 0' }} />

            {/* 应用配置 */}
            <div style={{ marginBottom: 24 }}>
              <Text style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600, display: 'block', marginBottom: 16 }}>
                应用配置
              </Text>
              
              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>App Name</span>}
                name="appName"
                rules={[{ required: true, message: '请输入应用名称' }]}
              >
                <Input
                  placeholder="Cigar Club管理平台"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>
            </div>

            <Divider style={{ borderColor: 'rgba(244, 175, 37, 0.2)', margin: '24px 0' }} />

            {/* FCM 配置 */}
            <div style={{ marginBottom: 24 }}>
              <Text style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600, display: 'block', marginBottom: 16 }}>
                FCM 配置（可选）
              </Text>
              <Text style={{ color: '#c0c0c0', fontSize: '12px', display: 'block', marginBottom: 16 }}>
                可在 <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#ffd700' }}>Firebase 控制台</a> 的项目设置中找到 VAPID Key。进入项目设置 &gt; 云消息传递 &gt; Web 配置，即可查看 VAPID 密钥。此配置为可选，仅在使用推送通知功能时需要。
              </Text>
              
              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>VAPID Key</span>}
                name="fcmVapidKey"
                rules={[{ required: false, message: '请输入 FCM VAPID Key' }]}
              >
                <Input
                  type={showSecrets.fcmVapidKey ? 'text' : 'password'}
                  placeholder="your_vapid_key_here"
                  suffix={
                    <Button
                      type="text"
                      icon={showSecrets.fcmVapidKey ? <EyeOutlined style={{ color: '#ffd700' }} /> : <EyeInvisibleOutlined style={{ color: '#ffd700' }} />}
                      onClick={() => setShowSecrets(prev => ({ ...prev, fcmVapidKey: !prev.fcmVapidKey }))}
                      style={{ border: 'none', color: '#ffd700' }}
                    />
                  }
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>
            </div>

            <Divider style={{ borderColor: 'rgba(244, 175, 37, 0.2)', margin: '24px 0' }} />

            {/* Gemini 配置 */}
            <div style={{ marginBottom: 24 }}>
              <Text style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600, display: 'block', marginBottom: 16 }}>
                Gemini API 配置（可选）
              </Text>
              <Text style={{ color: '#c0c0c0', fontSize: '12px', display: 'block', marginBottom: 16 }}>
                可在 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#ffd700' }}>Google AI Studio</a> 中获取 Gemini API Key。此配置用于 AI 雪茄识别功能。
              </Text>
              
              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>API Key</span>}
                name="geminiApiKey"
                rules={[{ required: false, message: '请输入 Gemini API Key' }]}
              >
                <Input
                  type={showSecrets.geminiApiKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  suffix={
                    <Button
                      type="text"
                      icon={showSecrets.geminiApiKey ? <EyeOutlined style={{ color: '#ffd700' }} /> : <EyeInvisibleOutlined style={{ color: '#ffd700' }} />}
                      onClick={() => setShowSecrets(prev => ({ ...prev, geminiApiKey: !prev.geminiApiKey }))}
                      style={{ border: 'none', color: '#ffd700' }}
                    />
                  }
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>
            </div>

            <Divider style={{ borderColor: 'rgba(244, 175, 37, 0.2)', margin: '24px 0' }} />

            {/* Netlify 配置 */}
            <div style={{ marginBottom: 24 }}>
              <Text style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600, display: 'block', marginBottom: 16 }}>
                Netlify 配置（可选）
              </Text>
              <Text style={{ color: '#c0c0c0', fontSize: '12px', display: 'block', marginBottom: 16 }}>
                  用于将环境变量部署到 Netlify。Access Token 可在 <a href="https://app.netlify.com/user/applications" target="_blank" rel="noopener noreferrer" style={{ color: '#ffd700' }}>Netlify 用户设置</a> 中生成，Site ID 可在站点设置中找到。此配置为可选，仅在需要部署到 Netlify 时需要。
                </Text>
              
              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>Access Token</span>}
                name="netlifyAccessToken"
                rules={[{ required: false, message: '请输入 Netlify Access Token' }]}
              >
                <Input
                  type={showSecrets.netlifyAccessToken ? 'text' : 'password'}
                  placeholder="your_netlify_access_token"
                  suffix={
                    <Button
                      type="text"
                      icon={showSecrets.netlifyAccessToken ? <EyeOutlined style={{ color: '#ffd700' }} /> : <EyeInvisibleOutlined style={{ color: '#ffd700' }} />}
                      onClick={() => setShowSecrets(prev => ({ ...prev, netlifyAccessToken: !prev.netlifyAccessToken }))}
                      style={{ border: 'none', color: '#ffd700' }}
                    />
                  }
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ color: '#c0c0c0' }}>Site ID</span>}
                name="netlifySiteId"
                rules={[{ required: false, message: '请输入 Netlify Site ID' }]}
              >
                <Input
                  placeholder="your-site-id"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8f8f8',
                  }}
                />
              </Form.Item>
            </div>

            {/* 部署状态显示 */}
            {deployStatus.state !== 'idle' && (
              <div style={{ marginBottom: 24 }}>
                <Alert
                  message={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {deployStatus.state === 'updating' || deployStatus.state === 'deploying' ? (
                        <LoadingOutlined style={{ color: '#1890ff' }} />
                      ) : deployStatus.state === 'success' ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <span style={{ color: '#ff4d4f' }}>✕</span>
                      )}
                      <span>{deployStatus.message}</span>
                    </div>
                  }
                  type={
                    deployStatus.state === 'success' ? 'success' :
                    deployStatus.state === 'error' ? 'error' : 'info'
                  }
                  showIcon={false}
                  style={{
                    marginBottom: 16,
                    background: deployStatus.state === 'success' ? 'rgba(82, 196, 26, 0.1)' :
                               deployStatus.state === 'error' ? 'rgba(255, 77, 79, 0.1)' :
                               'rgba(24, 144, 255, 0.1)',
                    border: deployStatus.state === 'success' ? '1px solid rgba(82, 196, 26, 0.3)' :
                           deployStatus.state === 'error' ? '1px solid rgba(255, 77, 79, 0.3)' :
                           '1px solid rgba(24, 144, 255, 0.3)',
                  }}
                  description={
                    deployStatus.deployUrl ? (
                      <div style={{ marginTop: 8 }}>
                        <a
                          href={deployStatus.deployUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#ffd700' }}
                        >
                          查看部署详情
                        </a>
                      </div>
                    ) : null
                  }
                />
              </div>
            )}

            {/* 生成的配置文件预览 */}
            {generatedEnv && (
              <div style={{ marginBottom: 24 }}>
                <Text style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600, display: 'block', marginBottom: 16 }}>
                  生成的配置文件
                </Text>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '16px',
                  maxHeight: '300px',
                  overflow: 'auto',
                }}>
                  <pre style={{
                    color: '#c0c0c0',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}>
                    {generatedEnv}
                  </pre>
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  envForm.resetFields();
                  setGeneratedEnv('');
                  setDeployStatus({ state: 'idle', message: '' });
                }}
                disabled={deploying}
              >
                清空表单
              </Button>
              <Button
                icon={<FileTextOutlined />}
                onClick={async () => {
                  try {
                    const values = await envForm.validateFields();
                    const envContent = generateEnvFile(values);
                    setGeneratedEnv(envContent);
                    message.success('配置文件已生成');
                  } catch (error) {
                    message.error('请填写所有必填字段');
                  }
                }}
                disabled={deploying}
              >
                生成配置文件
              </Button>
              {generatedEnv && (
                <>
                  <Button
                    icon={<CopyOutlined />}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(generatedEnv);
                        message.success('已复制到剪贴板');
                      } catch (error) {
                        message.error('复制失败');
                      }
                    }}
                    disabled={deploying}
                  >
                    复制到剪贴板
                  </Button>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      const blob = new Blob([generatedEnv], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = '.env';
                      a.click();
                      URL.revokeObjectURL(url);
                      message.success('文件已下载');
                    }}
                    disabled={deploying}
                    style={{
                      background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                      border: 'none',
                    }}
                  >
                    下载 .env
                  </Button>
                </>
              )}
              <Button
                type="primary"
                icon={<RocketOutlined />}
                onClick={handleDeployToNetlify}
                loading={deploying}
                disabled={deploying}
                style={{
                  background: 'linear-gradient(to right,#1890ff,#096dd9)',
                  border: 'none',
                }}
              >
                {deploying ? '部署中...' : '部署到 Netlify'}
              </Button>
              <Button
                type="primary"
                icon={<DatabaseOutlined />}
                onClick={handleDeployFirestoreIndexes}
                loading={indexDeploying}
                disabled={indexDeploying}
                style={{
                  background: 'linear-gradient(to right,#52c41a,#389e0d)',
                  border: 'none',
                }}
              >
                {indexDeploying ? '部署中...' : '部署 Firestore 索引'}
              </Button>
            </div>

            {/* Firestore 索引部署状态 */}
            {indexDeployStatus.state !== 'idle' && (
              <div style={{ marginTop: 16 }}>
                <Alert
                  message={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {indexDeployStatus.state === 'deploying' ? (
                        <LoadingOutlined style={{ color: '#1890ff' }} />
                      ) : indexDeployStatus.state === 'success' ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <span style={{ color: '#ff4d4f' }}>✕</span>
                      )}
                      <span>{indexDeployStatus.message}</span>
                    </div>
                  }
                  type={
                    indexDeployStatus.state === 'success' ? 'success' :
                    indexDeployStatus.state === 'error' ? 'error' : 'info'
                  }
                  showIcon={false}
                  style={{
                    marginBottom: 16,
                    background: indexDeployStatus.state === 'success' ? 'rgba(82, 196, 26, 0.1)' :
                               indexDeployStatus.state === 'error' ? 'rgba(255, 77, 79, 0.1)' :
                               'rgba(24, 144, 255, 0.1)',
                    border: indexDeployStatus.state === 'success' ? '1px solid rgba(82, 196, 26, 0.3)' :
                           indexDeployStatus.state === 'error' ? '1px solid rgba(255, 77, 79, 0.3)' :
                           '1px solid rgba(24, 144, 255, 0.3)',
                  }}
                  description={
                    <div style={{ marginTop: 8 }}>
                      {/* 部署摘要 */}
                      {indexDeployStatus.summary && (
                        <div style={{ marginBottom: 12 }}>
                          <Text style={{ color: '#c0c0c0', fontSize: '12px', display: 'block', marginBottom: 4 }}>
                            部署摘要：
                          </Text>
                          <div style={{ 
                            display: 'flex', 
                            gap: 16, 
                            flexWrap: 'wrap',
                            fontSize: '12px',
                            color: '#c0c0c0'
                          }}>
                            <span>总计: <strong style={{ color: '#f8f8f8' }}>{indexDeployStatus.summary.total}</strong></span>
                            <span style={{ color: '#52c41a' }}>
                              成功: <strong>{indexDeployStatus.summary.succeeded}</strong>
                            </span>
                            {indexDeployStatus.summary.failed > 0 && (
                              <span style={{ color: '#ff4d4f' }}>
                                失败: <strong>{indexDeployStatus.summary.failed}</strong>
                              </span>
                            )}
                            {indexDeployStatus.summary.skipped > 0 && (
                              <span style={{ color: '#faad14' }}>
                                跳过: <strong>{indexDeployStatus.summary.skipped}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* 详细结果 */}
                      {indexDeployStatus.results && indexDeployStatus.results.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <Text style={{ color: '#c0c0c0', fontSize: '12px', display: 'block', marginBottom: 8 }}>
                            详细结果：
                          </Text>
                          <div style={{
                            maxHeight: '200px',
                            overflowY: 'auto',
                            background: 'rgba(0, 0, 0, 0.2)',
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}>
                            {indexDeployStatus.results.map((result, idx) => (
                              <div 
                                key={idx} 
                                style={{ 
                                  marginBottom: 4,
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  background: result.success 
                                    ? 'rgba(82, 196, 26, 0.1)' 
                                    : 'rgba(255, 77, 79, 0.1)',
                                  border: `1px solid ${result.success ? 'rgba(82, 196, 26, 0.3)' : 'rgba(255, 77, 79, 0.3)'}`
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {result.success ? (
                                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                                  ) : (
                                    <span style={{ color: '#ff4d4f' }}>✕</span>
                                  )}
                                  <span style={{ color: '#f8f8f8', fontWeight: 500 }}>
                                    {result.index.collectionGroup}
                                  </span>
                                  <span style={{ color: '#c0c0c0' }}>
                                    ({result.index.fields.map((f: any) => `${f.fieldPath}(${f.order})`).join(', ')})
                                  </span>
                                  <span style={{ 
                                    color: result.success ? '#52c41a' : '#ff4d4f',
                                    marginLeft: 'auto',
                                    fontSize: '10px'
                                  }}>
                                    {result.message}
                                  </span>
                                </div>
                                {result.error && (
                                  <div style={{ 
                                    color: '#ff4d4f', 
                                    fontSize: '10px', 
                                    marginTop: 4,
                                    marginLeft: 20
                                  }}>
                                    错误: {result.error}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Firebase Console 链接 */}
                      {indexDeployStatus.consoleUrl && (
                        <div>
                          <a
                            href={indexDeployStatus.consoleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#ffd700', fontSize: '12px' }}
                          >
                            在 Firebase Console 中查看索引状态 →
                          </a>
                        </div>
                      )}
                      
                      {/* 备用链接（如果没有 consoleUrl） */}
                      {indexDeployStatus.links && indexDeployStatus.links.length > 0 && !indexDeployStatus.consoleUrl && (
                        <div style={{ marginTop: 8 }}>
                          <Text style={{ color: '#c0c0c0', fontSize: '12px', display: 'block', marginBottom: 8 }}>
                            请通过以下链接在 Firebase Console 中创建索引：
                          </Text>
                          {indexDeployStatus.links.map((link, idx) => (
                            <div key={idx} style={{ marginTop: 4 }}>
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#ffd700' }}
                              >
                                {link}
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  }
                />
              </div>
            )}
          </Form>
        </Card>
      ) : null}

      {activeTab !== 'app' && activeTab !== 'whapi' && activeTab !== 'env' && (
        <>
          <Card style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            border: '1px solid rgba(244, 175, 37, 0.6)',
            backdropFilter: 'blur(10px)'
          }}>
            {filteredFeatures.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                {t('featureManagement.noResults', { defaultValue: '没有找到匹配的功能' })}
              </div>
            ) : (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {filteredFeatures.map(feature => {
                  const isVisible = localFeatures[feature.key] ?? feature.defaultVisible;
                  
                  return (
                    <div
                      key={feature.key}
                      style={{
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 8,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Checkbox
                          checked={isVisible}
                          onChange={(e) => handleToggleFeature(feature.key, e.target.checked)}
                          style={{
                            color: isVisible ? '#ffd700' : '#999',
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{
                            color: '#f8f8f8',
                            fontSize: '16px',
                            fontWeight: 600,
                            marginBottom: '4px',
                          }}>
                            {getFeatureName(feature)}
                          </div>
                          <div style={{
                            color: '#c0c0c0',
                            fontSize: '13px',
                            marginBottom: '4px',
                          }}>
                            {getFeatureDescription(feature)}
                          </div>
                          <div style={{
                            color: '#999',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                          }}>
                            {feature.route}
                          </div>
                          {/* AI识茄功能的存储数据开关 */}
                          {feature.key === 'ai-cigar' && activeTab === 'frontend' && (
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={{ color: '#c0c0c0', fontSize: '13px' }}>
                                  启用数据存储
                                </Text>
                                <Switch
                                  checked={aiCigarStorageEnabled}
                                  onChange={async (checked) => {
                                    const previousValue = aiCigarStorageEnabled;
                                    setAiCigarStorageEnabled(checked);
                                    // 立即保存配置
                                    if (user?.id) {
                                      try {
                                        const result = await updateAppConfig(
                                          {
                                            aiCigar: {
                                              enableDataStorage: checked,
                                              enableImageSearch: aiCigarImageSearchEnabled,
                                            },
                                          },
                                          user.id
                                        );
                                        if (result.success) {
                                          message.success('配置已保存');
                                          // 直接更新本地 appConfig 状态，不重新加载避免状态回退
                                          if (appConfig) {
                                            setAppConfig({
                                              ...appConfig,
                                              aiCigar: {
                                                ...appConfig.aiCigar,
                                                enableDataStorage: checked,
                                                enableImageSearch: aiCigarImageSearchEnabled,
                                              },
                                            });
                                          }
                                        } else {
                                          message.error(result.error || '保存失败');
                                          setAiCigarStorageEnabled(previousValue); // 恢复原值
                                        }
                                      } catch (error) {
                                        message.error('保存失败');
                                        setAiCigarStorageEnabled(previousValue); // 恢复原值
                                      }
                                    } else {
                                      // 如果没有用户ID，恢复原值
                                      setAiCigarStorageEnabled(previousValue);
                                    }
                                  }}
                                  checkedChildren="启用"
                                  unCheckedChildren="禁用"
                                  size="small"
                                />
                              </div>
                              <Text style={{ color: '#999', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                                控制AI识茄功能是否将识别结果保存到数据库
                              </Text>
                            </div>
                          )}
                          {/* AI识茄功能的图片URL搜索开关 */}
                          {feature.key === 'ai-cigar' && activeTab === 'frontend' && (
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={{ color: '#c0c0c0', fontSize: '13px' }}>
                                  启用图片URL搜索
                                </Text>
                                <Switch
                                  checked={aiCigarImageSearchEnabled}
                                  onChange={async (checked) => {
                                    const previousValue = aiCigarImageSearchEnabled;
                                    setAiCigarImageSearchEnabled(checked);
                                    // 立即保存配置
                                    if (user?.id) {
                                      try {
                                        const result = await updateAppConfig(
                                          {
                                            aiCigar: {
                                              enableDataStorage: aiCigarStorageEnabled,
                                              enableImageSearch: checked,
                                            },
                                          },
                                          user.id
                                        );
                                        if (result.success) {
                                          message.success('配置已保存');
                                          // 直接更新本地 appConfig 状态，不重新加载避免状态回退
                                          if (appConfig) {
                                            setAppConfig({
                                              ...appConfig,
                                              aiCigar: {
                                                ...appConfig.aiCigar,
                                                enableDataStorage: aiCigarStorageEnabled,
                                                enableImageSearch: checked,
                                              },
                                            });
                                          }
                                        } else {
                                          message.error(result.error || '保存失败');
                                          setAiCigarImageSearchEnabled(previousValue);
                                        }
                                      } catch (error) {
                                        message.error('保存失败');
                                        setAiCigarImageSearchEnabled(previousValue);
                                      }
                                    } else {
                                      setAiCigarImageSearchEnabled(previousValue);
                                    }
                                  }}
                                  checkedChildren="启用"
                                  unCheckedChildren="禁用"
                                  size="small"
                                />
                              </div>
                              <Text style={{ color: '#999', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                                控制AI识茄功能是否自动搜索雪茄图片URL（Google + Gemini）
                              </Text>
                            </div>
                          )}
                        </div>
                        <Space>
                          <Button
                            type={isVisible ? 'primary' : 'default'}
                            icon={isVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                            onClick={() => handleToggleFeature(feature.key, !isVisible)}
                            size="small"
                            style={{
                              background: isVisible ? 'linear-gradient(to right,#FDE08D,#C48D3A)' : undefined,
                              borderColor: isVisible ? undefined : '#444',
                            }}
                          >
                            {isVisible 
                              ? t('featureManagement.visible', { defaultValue: '显示' })
                              : t('featureManagement.hidden', { defaultValue: '隐藏' })}
                          </Button>
                        </Space>
                      </div>
                    </div>
                  );
                })}
              </Space>
            )}
          </Card>

          {/* 操作按钮 */}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={saving}
            >
              {t('featureManagement.resetToDefault', { defaultValue: '重置为默认' })}
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              style={{
                background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                border: 'none',
              }}
            >
              {t('featureManagement.saveChanges', { defaultValue: '保存更改' })}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default FeatureManagement;

