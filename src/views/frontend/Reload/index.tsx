// 用户充值页面
import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, message, Spin, Tag, Modal, App } from 'antd';
import { WalletOutlined, ReloadOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../../store/modules/auth';
import { createReloadRecord, getUserReloadRecords, getUserPendingReloadRecord, cancelReloadRecord } from '../../../services/firebase/reload';
import { useNavigate } from 'react-router-dom';
import type { ReloadRecord } from '../../../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ReloadPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { modal } = App.useApp(); // 使用 App.useApp() 获取 modal 实例以支持 React 19
  const [loading, setLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [pendingRecord, setPendingRecord] = useState<ReloadRecord | null>(null);
  const [checkingPending, setCheckingPending] = useState(true);

  const amountOptions = [100, 200, 300, 500, 1000];

  // 检查是否有未验证的充值记录
  useEffect(() => {
    const checkPendingRecord = async () => {
      if (!user?.id) {
        setCheckingPending(false);
        return;
      }

      try {
        // 直接查询 pending 状态的记录
        const pending = await getUserPendingReloadRecord(user.id);
        setPendingRecord(pending);
      } catch (error) {
        console.error('[ReloadPage] 检查充值记录失败:', error);
        // 如果直接查询失败，尝试从所有记录中查找
        try {
          const records = await getUserReloadRecords(user.id, 10);
          const pending = records.find(r => r.status === 'pending');
          setPendingRecord(pending || null);
        } catch (fallbackError) {
          console.error('[ReloadPage] 备用查询也失败:', fallbackError);
        }
      } finally {
        setCheckingPending(false);
      }
    };

    checkPendingRecord();
  }, [user?.id]);

  const handleReload = async (amount: number) => {
    if (!user?.id) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }

    // 如果有未验证的充值记录，不允许再次提交
    if (pendingRecord) {
      message.warning('您已有待验证的充值请求，请等待管理员处理后再提交新的请求');
      return;
    }

    setLoading(true);
    try {
      const result = await createReloadRecord(user.id, amount, user.displayName);
      if (result.success) {
        message.success(`充值请求已提交（${amount} RM），等待管理员验证`);
        setSelectedAmount(null);
        // 重新检查 pending 记录
        const pending = await getUserPendingReloadRecord(user.id);
        setPendingRecord(pending);
        // 跳转到主页
        navigate('/');
      } else {
        message.error(result.error || '提交充值请求失败');
      }
    } catch (error: any) {
      message.error(error.message || '提交充值请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReload = () => {
    if (!pendingRecord || !user?.id) {
      console.warn('[ReloadPage] 无法撤销：pendingRecord 或 user.id 不存在', { pendingRecord, userId: user?.id });
      return;
    }

    modal.confirm({
      title: '确认撤销充值请求',
      content: `确定要撤销 ${pendingRecord.requestedAmount} RM 的充值请求吗？撤销后将无法恢复。`,
      okText: '确认撤销',
      cancelText: '取消',
      okButtonProps: {
        danger: true
      },
      onOk: async () => {
        setLoading(true);
        try {
          const result = await cancelReloadRecord(pendingRecord.id, user.id);
          if (result.success) {
            message.success('充值请求已撤销');
            setPendingRecord(null);
          } else {
            message.error(result.error || '撤销充值请求失败');
          }
        } catch (error: any) {
          console.error('[ReloadPage] 撤销失败:', error);
          message.error(error.message || '撤销充值请求失败');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  if (!user) {
    return (
      <div style={{ 
        padding: '24px', 
        textAlign: 'center',
        minHeight: 'calc(100vh - 200px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Text style={{ color: '#c0c0c0', fontSize: 16 }}>请先登录</Text>
      </div>
    );
  }

  const currentPoints = user.membership?.points || 0;

  // 如果正在检查，显示加载状态
  if (checkingPending) {
    return (
      <div style={{ 
        padding: '24px', 
        maxWidth: 600, 
        margin: '0 auto',
        minHeight: 'calc(100vh - 200px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '24px', 
      maxWidth: 600, 
      margin: '0 auto',
      minHeight: 'calc(100vh - 200px)'
    }}>
      <Card
        style={{
          background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(45, 45, 45, 0.95) 100%)',
          borderRadius: 12,
          border: '1px solid rgba(255, 215, 0, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.1)'
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 标题 */}
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ 
              margin: 0, 
              color: '#FFD700',
              fontWeight: 700,
              textShadow: '0 2px 8px rgba(255, 215, 0, 0.3)'
            }}>
              <WalletOutlined style={{ marginRight: 8 }} /> RELOAD
            </Title>
            <Text style={{ 
              fontSize: 14, 
              display: 'block', 
              marginTop: 12,
              color: '#c0c0c0'
            }}>
              当前余额: <Text strong style={{ 
                color: '#FFD700', 
                fontSize: 18,
                fontWeight: 700,
                textShadow: '0 2px 4px rgba(255, 215, 0, 0.3)'
              }}>
                {currentPoints} 积分
              </Text>
            </Text>
          </div>

          {/* 如果有待验证的充值记录，显示记录信息 */}
          {pendingRecord ? (
            <div style={{
              background: 'rgba(255, 215, 0, 0.1)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: 8,
              padding: 20,
              textAlign: 'center'
            }}>
              <ClockCircleOutlined style={{ 
                fontSize: 48, 
                color: '#FFD700',
                marginBottom: 16
              }} />
              <Title level={4} style={{ 
                color: '#FFD700',
                marginBottom: 12
              }}>
                待验证的充值请求
              </Title>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#c0c0c0', fontSize: 16, display: 'block', marginBottom: 8 }}>
                  充值金额: <Text strong style={{ color: '#FFD700', fontSize: 20 }}>
                    {pendingRecord.requestedAmount} RM
                  </Text>
                </Text>
                <Text style={{ color: '#c0c0c0', fontSize: 14, display: 'block', marginBottom: 8 }}>
                  预计获得积分: <Text strong style={{ color: '#FFD700' }}>
                    {pendingRecord.pointsEquivalent} 积分
                  </Text>
                </Text>
                <Text style={{ color: '#999999', fontSize: 12, display: 'block' }}>
                  提交时间: {dayjs(pendingRecord.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </Text>
              </div>
              <Tag color="orange" style={{ 
                fontSize: 14,
                padding: '4px 12px',
                borderRadius: 4,
                margin: 0,
                display: 'inline-block'
              }}>
                等待管理员验证
              </Tag>
              <div style={{ marginTop: 20 }}>
                <Button
                  type="default"
                  danger
                  size="large"
                  icon={<CloseCircleOutlined />}
                  onClick={handleCancelReload}
                  loading={loading}
                  style={{
                    height: 40,
                    fontSize: 14,
                    fontWeight: 600,
                    borderColor: '#ff4d4f',
                    color: '#ff4d4f'
                  }}
                >
                  撤销充值请求
                </Button>
              </div>
              <div style={{ marginTop: 16 }}>
                <Text style={{ 
                  fontSize: 12,
                  color: '#999999',
                  display: 'block'
                }}>
                  * 请等待管理员验证后，积分将自动到账
                </Text>
                <Text style={{ 
                  fontSize: 12,
                  color: '#999999',
                  display: 'block',
                  marginTop: 4
                }}>
                  * 验证完成后，您可以提交新的充值请求
                </Text>
              </div>
            </div>
          ) : (
            <>
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
                        : 'rgba(45, 45, 45, 0.8)',
                      border: selectedAmount === amount 
                        ? 'none' 
                        : '1px solid rgba(255, 215, 0, 0.3)',
                      color: selectedAmount === amount ? '#111' : '#FFD700',
                      transition: 'all 0.3s ease',
                      boxShadow: selectedAmount === amount
                        ? '0 4px 16px rgba(255, 215, 0, 0.3)'
                        : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedAmount !== amount && !loading) {
                        e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.5)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 215, 0, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedAmount !== amount) {
                        e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    {amount} RM
                    {selectedAmount === amount && (
                      <Text style={{ marginLeft: 8, fontSize: 14, color: '#111' }}>
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
                    color: '#111',
                    boxShadow: '0 4px 16px rgba(255, 215, 0, 0.4)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.5)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 215, 0, 0.4)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  确认充值 {selectedAmount} RM
                </Button>
              )}

              {/* 提示信息 */}
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Text style={{ 
                  fontSize: 12,
                  color: '#999999'
                }}>
                  * 充值请求提交后，请等待管理员验证到账
                </Text>
              </div>
            </>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default ReloadPage;

