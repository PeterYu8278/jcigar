/**
 * 通知设置组件
 * 用于个人中心页面，管理推送通知偏好
 */

import React, { useState, useEffect } from 'react';
import { Card, Switch, List, Button, Space, Typography, Tag, Divider, message as antMessage, Modal } from 'antd';
import { 
  BellOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LaptopOutlined,
  MobileOutlined,
  TabletOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/store/modules/auth';
import { DeviceToken, NotificationPreferences } from '@/types';
import { formatNotificationTime } from '@/utils/notification';
import { removeDeviceToken } from '@/services/firebase/deviceTokens';

const { Title, Text, Paragraph } = Typography;

export const NotificationSettings: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore(state => state.user);
  
  // ✅ 从 user store 中读取 pushEnabled 值，确保状态一致
  const userPushEnabled = user?.notifications?.pushEnabled;
  
  const {
    isSupported,
    permission,
    isEnabled,
    deviceTokens,
    loading,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    updatePreferences
  } = useNotifications(user?.id, userPushEnabled);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    reloadVerified: true,
    eventReminders: true,
    orderUpdates: true,
    pointsUpdates: true,
    membershipAlerts: true,
    visitAlerts: true
  });

  // 加载用户的通知偏好
  useEffect(() => {
    if (user?.notifications?.preferences) {
      setPreferences(user.notifications.preferences);
    }
  }, [user]);

  // 处理总开关
  const handleToggleNotifications = async (checked: boolean) => {
    if (checked) {
      await subscribeToNotifications();
    } else {
      await unsubscribeFromNotifications();
    }
  };

  // 处理偏好设置更新
  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    await updatePreferences({ [key]: value });
  };

  // 处理移除设备
  const handleRemoveDevice = (token: DeviceToken) => {
    Modal.confirm({
      title: t('notifications.settings.removeDevice'),
      content: t('notifications.settings.removeDeviceConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: {
        danger: true
      },
      onOk: async () => {
        if (user?.id) {
          const result = await removeDeviceToken(user.id, token.token);
          if (result.success) {
            antMessage.success(t('common.success'));
          }
        }
      }
    });
  };

  // 获取设备图标
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <MobileOutlined />;
      case 'tablet':
        return <TabletOutlined />;
      default:
        return <LaptopOutlined />;
    }
  };

  if (!isSupported) {
    return (
      <Card 
        title={
          <Space>
            <BellOutlined />
            {t('notifications.settings.title')}
          </Space>
        }
        style={{ marginTop: 24 }}
      >
        <Text type="secondary">{t('notifications.notSupported')}</Text>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <BellOutlined />
          {t('notifications.settings.title')}
        </Space>
      }
      style={{ marginTop: 24 }}
    >
      {/* 总开关 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 24,
        padding: 16,
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Space direction="vertical" size={4}>
          <Text strong>{t('notifications.settings.enableAll')}</Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {permission === 'granted' 
              ? t('notifications.permissionGranted')
              : permission === 'denied'
              ? t('notifications.permissionDenied')
              : '尚未授予通知权限'}
          </Text>
        </Space>
        <Switch
          checked={isEnabled && permission === 'granted'}
          onChange={handleToggleNotifications}
          loading={loading}
          disabled={permission === 'denied' || loading}
        />
      </div>

      {/* 通知偏好设置 */}
      {isEnabled && permission === 'granted' && (
        <>
          <Divider orientation="left">{t('notifications.settings.preferences')}</Divider>
          
          <List
            dataSource={[
              {
                key: 'reloadVerified' as keyof NotificationPreferences,
                icon: '💰',
                title: t('notifications.settings.reloadVerified'),
                description: '充值到账即时通知'
              },
              {
                key: 'orderUpdates' as keyof NotificationPreferences,
                icon: '📦',
                title: t('notifications.settings.orderUpdates'),
                description: '订单状态实时更新'
              },
              {
                key: 'eventReminders' as keyof NotificationPreferences,
                icon: '🎉',
                title: t('notifications.settings.eventReminders'),
                description: '活动提醒不错过'
              },
              {
                key: 'membershipAlerts' as keyof NotificationPreferences,
                icon: '⏰',
                title: t('notifications.settings.membershipAlerts'),
                description: '会员到期提醒'
              },
              {
                key: 'pointsUpdates' as keyof NotificationPreferences,
                icon: '✨',
                title: t('notifications.settings.pointsUpdates'),
                description: '积分变动通知'
              },
              {
                key: 'visitAlerts' as keyof NotificationPreferences,
                icon: '🏠',
                title: t('notifications.settings.visitAlerts'),
                description: '驻店相关提醒'
              }
            ]}
            renderItem={item => (
              <List.Item>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Space>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <Space direction="vertical" size={0}>
                      <Text strong>{item.title}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.description}
                      </Text>
                    </Space>
                  </Space>
                  <Switch
                    checked={preferences[item.key]}
                    onChange={(checked) => handlePreferenceChange(item.key, checked)}
                    size="small"
                  />
                </div>
              </List.Item>
            )}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 12,
              padding: '8px 0'
            }}
          />

          {/* 已注册设备 */}
          {deviceTokens.length > 0 && (
            <>
              <Divider orientation="left">{t('notifications.settings.devices')}</Divider>
              
              <List
                dataSource={deviceTokens}
                renderItem={device => (
                  <List.Item
                    actions={[
                      <Button
                        key="remove"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveDevice(device)}
                      >
                        {t('notifications.settings.removeDevice')}
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={getDeviceIcon(device.deviceInfo.deviceType)}
                      title={
                        <Space>
                          {t('notifications.settings.deviceInfo', { 
                            browser: device.deviceInfo.browser,
                            os: device.deviceInfo.os
                          })}
                          {device.isActive ? (
                            <Tag icon={<CheckCircleOutlined />} color="success">
                              活跃
                            </Tag>
                          ) : (
                            <Tag icon={<CloseCircleOutlined />} color="default">
                              未激活
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t('notifications.settings.lastUsed', { 
                            time: formatNotificationTime(device.lastUsedAt)
                          })}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 12,
                  padding: '8px 0'
                }}
              />
            </>
          )}
        </>
      )}
    </Card>
  );
};

