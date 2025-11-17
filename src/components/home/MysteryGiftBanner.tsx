// 神秘礼物CTA横幅组件
import React from 'react';
import { Card, Button, Typography, Space } from 'antd';
import { GiftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

interface MysteryGiftBannerProps {
  style?: React.CSSProperties;
}

export const MysteryGiftBanner: React.FC<MysteryGiftBannerProps> = ({ style }) => {
  const navigate = useNavigate();

  return (
    <Card
      style={{
        background: 'linear-gradient(135deg, #FFD700 0%, #C48D3A 100%)',
        border: 'none',
        borderRadius: 12,
        marginTop: 16,
        cursor: 'pointer',
        ...style
      }}
      bodyStyle={{ padding: 16 }}
      onClick={() => navigate('/mystery-gift')}
    >
      <Space align="center" style={{ width: '100%' }}>
        <GiftOutlined style={{ fontSize: 32, color: '#FFFFFF' }} />
        <Text strong style={{ color: '#FFFFFF', fontSize: 16 }}>
          Redeem Your Mystery Gift Here!
        </Text>
      </Space>
    </Card>
  );
};

