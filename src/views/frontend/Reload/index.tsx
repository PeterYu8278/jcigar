// 用户充值页面
import React, { useState } from 'react';
import { Card, Button, Typography, Space, message, Spin } from 'antd';
import { WalletOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../../store/modules/auth';
import { createReloadRecord } from '../../../services/firebase/reload';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const ReloadPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const amountOptions = [100, 200, 300, 500, 1000];

  const handleReload = async (amount: number) => {
    if (!user?.id) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const result = await createReloadRecord(user.id, amount, user.displayName);
      if (result.success) {
        message.success(`充值请求已提交（${amount} RM），等待管理员验证`);
        setSelectedAmount(null);
        // 可选：跳转到充值历史页面
        // navigate('/reload-history');
      } else {
        message.error(result.error || '提交充值请求失败');
      }
    } catch (error: any) {
      message.error(error.message || '提交充值请求失败');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text>请先登录</Text>
      </div>
    );
  }

  const currentPoints = user.membership?.points || 0;

  return (
    <div style={{ padding: '24px', maxWidth: 600, margin: '0 auto' }}>
      <Card
        style={{
          background: '#FFFFFF',
          borderRadius: 12
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 标题 */}
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>
              <WalletOutlined /> RELOAD
            </Title>
            <Text type="secondary" style={{ fontSize: 14, display: 'block', marginTop: 8 }}>
              当前余额: <Text strong style={{ color: '#FFD700', fontSize: 16 }}>
                {currentPoints} 积分
              </Text>
            </Text>
          </div>

          {/* 金额选择按钮 */}
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {amountOptions.map((amount) => (
              <Button
                key={amount}
                type={selectedAmount === amount ? 'primary' : 'default'}
                size="large"
                block
                onClick={() => setSelectedAmount(amount)}
                disabled={loading}
                style={{
                  height: 60,
                  fontSize: 18,
                  fontWeight: 600,
                  background: selectedAmount === amount
                    ? 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)'
                    : undefined,
                  border: selectedAmount === amount ? 'none' : undefined,
                  color: selectedAmount === amount ? '#111' : undefined
                }}
              >
                {amount} RM
                {selectedAmount === amount && (
                  <Text style={{ marginLeft: 8, fontSize: 14 }}>
                    = {amount} 积分
                  </Text>
                )}
              </Button>
            ))}
          </Space>

          {/* 确认按钮 */}
          {selectedAmount && (
            <Button
              type="primary"
              size="large"
              block
              icon={<ReloadOutlined />}
              onClick={() => handleReload(selectedAmount)}
              loading={loading}
              style={{
                height: 50,
                fontSize: 16,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
                border: 'none',
                color: '#111'
              }}
            >
              确认充值 {selectedAmount} RM
            </Button>
          )}

          {/* 提示信息 */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              * 充值请求提交后，请等待管理员验证到账
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default ReloadPage;

