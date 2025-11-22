/**
 * 通知权限提示组件
 * 友好地引导用户启用推送通知
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Space, Typography } from 'antd';
import { BellOutlined, CloseOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/hooks/useNotifications';

const { Title, Paragraph } = Typography;

interface NotificationPermissionPromptProps {
  userId?: string;
  autoShow?: boolean; // 是否自动显示
  onClose?: () => void;
}

export const NotificationPermissionPrompt: React.FC<NotificationPermissionPromptProps> = ({
  userId,
  autoShow = true,
  onClose
}) => {
  const { t } = useTranslation();
  const { isSupported, permission, subscribeToNotifications, loading } = useNotifications(userId);
  
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // 检查是否应该显示提示
  useEffect(() => {
    if (!autoShow || !isSupported || !userId) return;

    // 检查本地存储，看用户是否已经关闭过提示
    const dismissedTime = localStorage.getItem('notificationPromptDismissed');
    if (dismissedTime) {
      const dismissedDate = new Date(dismissedTime);
      const now = new Date();
      const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // 如果用户在 7 天内关闭过，不再显示
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // 只在权限为 'default' 时显示
    if (permission === 'default') {
      // 延迟 2 秒显示，避免打扰用户
      const timer = setTimeout(() => {
        setVisible(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [autoShow, isSupported, userId, permission]);

  // 处理启用通知
  const handleEnable = async () => {
    const success = await subscribeToNotifications();
    if (success) {
      setVisible(false);
      onClose?.();
    }
  };

  // 处理稍后提醒
  const handleLater = () => {
    setVisible(false);
    setDismissed(true);
    onClose?.();
  };

  // 处理不再显示
  const handleNeverShow = () => {
    localStorage.setItem('notificationPromptDismissed', new Date().toISOString());
    setVisible(false);
    setDismissed(true);
    onClose?.();
  };

  if (!isSupported || dismissed) {
    return null;
  }

  return (
    <Modal
      open={visible}
      onCancel={handleLater}
      footer={null}
      width={480}
      centered
      closeIcon={<CloseOutlined />}
      styles={{
        content: {
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          borderRadius: 16,
          border: '1px solid rgba(244, 175, 37, 0.3)',
          boxShadow: '0 8px 32px rgba(244, 175, 37, 0.2)',
        },
        mask: {
          backdropFilter: 'blur(4px)',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        }
      }}
    >
      <div style={{ padding: '24px 0' }}>
        {/* 图标 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 80,
            height: 80,
            margin: '0 auto',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(244, 175, 37, 0.4)'
          }}>
            <BellOutlined style={{ fontSize: 40, color: '#000' }} />
          </div>
        </div>

        {/* 标题 */}
        <Title level={3} style={{ 
          textAlign: 'center', 
          marginBottom: 16,
          background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {t('notifications.prompt.title')}
        </Title>

        {/* 说明文字 */}
        <Paragraph style={{ 
          textAlign: 'center', 
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: 15,
          marginBottom: 24,
          lineHeight: 1.6
        }}>
          {t('notifications.prompt.description')}
        </Paragraph>

        {/* 功能列表 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {[
              t('notifications.prompt.feature1'),
              t('notifications.prompt.feature2'),
              t('notifications.prompt.feature3'),
              t('notifications.prompt.feature4')
            ].map((feature, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'center',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
                  marginRight: 12,
                  flexShrink: 0
                }} />
                {feature}
              </div>
            ))}
          </Space>
        </div>

        {/* 按钮组 */}
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Button
            type="primary"
            size="large"
            icon={<BellOutlined />}
            loading={loading}
            onClick={handleEnable}
            block
            style={{
              height: 48,
              background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              color: '#000',
              boxShadow: '0 4px 15px rgba(244, 175, 37, 0.35)'
            }}
          >
            {t('notifications.prompt.enable')}
          </Button>

          <Button
            size="large"
            icon={<ClockCircleOutlined />}
            onClick={handleLater}
            block
            style={{
              height: 44,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 12,
              color: '#fff'
            }}
          >
            {t('notifications.prompt.later')}
          </Button>

          <Button
            type="text"
            onClick={handleNeverShow}
            block
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: 13
            }}
          >
            {t('notifications.prompt.neverShow')}
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

