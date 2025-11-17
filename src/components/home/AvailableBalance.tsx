// 可用余额卡片组件
import React from 'react';
import { Card, Typography, Button, Space } from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/modules/auth';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface AvailableBalanceProps {
  style?: React.CSSProperties;
}

export const AvailableBalance: React.FC<AvailableBalanceProps> = ({ style }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const currentPoints = user.membership?.points || 0;

  return (
    <Card
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        marginTop: 16,
        ...style
      }}
      bodyStyle={{ padding: 20 }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Text style={{ fontSize: 14, color: '#666' }}>Available Balance</Text>
        <Title level={2} style={{ margin: 0, color: '#000', fontWeight: 700 }}>
          {currentPoints} Points
        </Title>
        <Button
          type="primary"
          block
          icon={<WalletOutlined />}
          onClick={() => navigate('/reload')}
          style={{
            background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
            border: 'none',
            color: '#111',
            height: 40,
            fontSize: 14,
            fontWeight: 600
          }}
        >
          + Reload
        </Button>
      </Space>
    </Card>
  );
};

