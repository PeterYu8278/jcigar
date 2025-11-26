// 神秘礼物CTA横幅组件
import React, { useState, useEffect } from 'react';
import { GiftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getAppConfig } from '../../services/firebase/appConfig';
import type { AppConfig } from '../../types';

interface MysteryGiftBannerProps {
  style?: React.CSSProperties;
}

export const MysteryGiftBanner: React.FC<MysteryGiftBannerProps> = ({ style }) => {
  const navigate = useNavigate();
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    const loadAppConfig = async () => {
      try {
        const config = await getAppConfig();
        if (config) {
          setAppConfig(config);
        }
      } catch (error) {
        console.error('加载应用配置失败:', error);
      }
    };
    loadAppConfig();
  }, []);

  return (
    <button
      type="button"
      onClick={() => navigate('/mystery-gift')}
      style={{
        background: appConfig?.colorTheme?.primaryButton 
          ? `linear-gradient(135deg, ${appConfig.colorTheme.primaryButton.startColor} 0%, ${appConfig.colorTheme.primaryButton.endColor} 100%)`
          : 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
        borderRadius: 12,
        marginTop: 16,
        height: 56,
        fontSize: 16,
        fontWeight: 600,
        color: '#111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        cursor: 'pointer',
        padding: '0 16px',
        ...style
      }}
    >
      <GiftOutlined style={{ fontSize: 20 }} />
      Redeem Your Mystery Gift Here!
    </button>
  );
};

