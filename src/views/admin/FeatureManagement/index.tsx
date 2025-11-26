// 功能管理页面
import React, { useState, useEffect } from 'react';
import { Card, Switch, Button, Space, Typography, message, Spin, Tabs, Input, Checkbox, Form } from 'antd';
import { SaveOutlined, ReloadOutlined, EyeOutlined, EyeInvisibleOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons';
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
  const [activeTab, setActiveTab] = useState<'frontend' | 'admin' | 'app'>('frontend');
  const [searchText, setSearchText] = useState('');
  const [config, setConfig] = useState<FeatureVisibilityConfig | null>(null);
  const [localFeatures, setLocalFeatures] = useState<Record<string, boolean>>({});
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [appConfigForm] = Form.useForm();
  const [savingAppConfig, setSavingAppConfig] = useState(false);
  const [pendingColorChanges, setPendingColorChanges] = useState<Partial<ColorThemeConfig>>({});

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
        appConfigForm.setFieldsValue({
          logoUrl: config.logoUrl,
          appName: config.appName,
          hideFooter: config.hideFooter ?? false,
        });
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
      
      const result = await updateAppConfig(
        {
          logoUrl: values.logoUrl,
          appName: values.appName,
          hideFooter: values.hideFooter ?? false,
          colorTheme: finalColorTheme, // 使用合并后的颜色主题
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
        await loadAppConfig();
      } else {
        message.error(result.error || '重置失败');
      }
    } catch (error) {
      message.error('重置失败');
    }
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

  return (
    <div style={{ padding: '24px' }}>
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
          {(['frontend', 'admin', 'app'] as const).map((tabKey) => {
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
                  : t('featureManagement.appSettings', { defaultValue: '应用配置' })}
              </button>
            );
          })}
        </div>
      </div>

      {/* 搜索和批量操作（仅功能标签页显示） */}
      {activeTab !== 'app' && (
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
                value={appConfigForm.getFieldValue('logoUrl')}
                onChange={(url) => appConfigForm.setFieldsValue({ logoUrl: url || '' })}
                width={200}
                height={200}
                enableCrop={true}
                cropAspectRatio={1}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: '#f8f8f8', fontSize: '16px', fontWeight: 600 }}>应用名称</span>}
              name="appName"
              rules={[{ required: true, message: '请输入应用名称' }]}
            >
              <Input
                placeholder="例如：Gentlemen Club"
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
                checkedChildren="隐藏"
                unCheckedChildren="显示"
                style={{
                  background: appConfigForm.getFieldValue('hideFooter') ? 'linear-gradient(to right,#FDE08D,#C48D3A)' : undefined,
                }}
              />
            </Form.Item>

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

      {activeTab !== 'app' && (
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

