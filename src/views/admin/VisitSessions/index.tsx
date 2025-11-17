// 驻店记录管理页面
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Modal, message, Input, Typography } from 'antd';
import { ReloadOutlined, CheckOutlined, ClockCircleOutlined, QrcodeOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import { 
  getUserVisitSessions, 
  getAllPendingVisitSessions,
  getExpiredVisitSessions, 
  completeVisitSession 
} from '../../../services/firebase/visitSessions';
import { useAuthStore } from '../../../store/modules/auth';
import type { VisitSession } from '../../../types';
import dayjs from 'dayjs';
import { QRScanner } from '../../../components/admin/QRScanner';

const { Title, Text } = Typography;
const { Search } = Input;

const VisitSessionsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<VisitSession[]>([]);
  const [searchUserId, setSearchUserId] = useState<string>('');
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [qrScannerMode, setQrScannerMode] = useState<'checkin' | 'checkout'>('checkin');

  useEffect(() => {
    loadAllSessions();
  }, []);

  const loadAllSessions = async () => {
    // 加载所有待处理的session（包括所有pending状态的记录）
    setLoading(true);
    try {
      const allPendingSessions = await getAllPendingVisitSessions();
      setSessions(allPendingSessions);
    } catch (error) {
      console.error('加载驻店记录失败:', error);
      message.error('加载驻店记录失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUserSessions = async (userId: string) => {
    setLoading(true);
    try {
      const userSessions = await getUserVisitSessions(userId, 100);
      setSessions(userSessions);
    } catch (error) {
      message.error('加载用户驻店记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckout = async (sessionId: string, forceHours?: number) => {
    if (!user?.id) {
      message.error('请先登录');
      return;
    }

    Modal.confirm({
      title: '确认结算',
      content: forceHours 
        ? `是否按 ${forceHours} 小时强制结算此驻店记录？`
        : '是否结算此驻店记录？',
      onOk: async () => {
        try {
          const result = await completeVisitSession(sessionId, user.id, forceHours);
          if (result.success) {
            message.success('结算成功');
            loadAllSessions();
          } else {
            message.error(result.error || '结算失败');
          }
        } catch (error: any) {
          message.error(error.message || '结算失败');
        }
      }
    });
  };

  const handleBatchProcessExpired = async () => {
    if (!user?.id) {
      message.error('请先登录');
      return;
    }

    Modal.confirm({
      title: '批量处理过期记录',
      content: '是否批量处理所有超过24小时未check-out的驻店记录（按5小时强制结算）？',
      onOk: async () => {
        setLoading(true);
        try {
          const { processExpiredVisitSessions } = await import('../../../services/firebase/scheduledJobs');
          const result = await processExpiredVisitSessions();
          if (result.success) {
            message.success(`已处理 ${result.processed} 条记录`);
            loadAllSessions();
          } else {
            message.error('批量处理失败');
          }
        } catch (error: any) {
          message.error(error.message || '批量处理失败');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const columns = [
    {
      title: 'Check-in时间',
      dataIndex: 'checkInAt',
      key: 'checkInAt',
      width: 180,
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '用户',
      dataIndex: 'userName',
      key: 'userName',
      width: 150,
      render: (name: string, record: VisitSession) => name || record.userId
    },
    {
      title: 'Check-out时间',
      dataIndex: 'checkOutAt',
      key: 'checkOutAt',
      width: 180,
      render: (date: Date | undefined) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '驻店时长',
      key: 'duration',
      width: 120,
      render: (_: any, record: VisitSession) => {
        if (record.durationHours !== undefined) {
          return `${record.durationHours} 小时`;
        }
        if (record.status === 'pending') {
          const now = new Date();
          const diffMs = now.getTime() - record.checkInAt.getTime();
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          return `${hours}:${String(minutes).padStart(2, '0')}`;
        }
        return '-';
      }
    },
    {
      title: '扣除积分',
      dataIndex: 'pointsDeducted',
      key: 'pointsDeducted',
      width: 100,
      render: (points: number | undefined) => points !== undefined ? `-${points}` : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: VisitSession) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: '待处理' },
          completed: { color: 'green', text: '已完成' },
          expired: { color: 'red', text: '已过期' }
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status };
        
        // 检查是否超过24小时
        if (status === 'pending') {
          const now = new Date();
          const diffMs = now.getTime() - record.checkInAt.getTime();
          const hours = diffMs / (1000 * 60 * 60);
          if (hours >= 24) {
            return <Tag color="red">过期待处理</Tag>;
          }
        }
        
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: VisitSession) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleManualCheckout(record.id)}
              >
                结算
              </Button>
              <Button
                size="small"
                onClick={() => handleManualCheckout(record.id, 5)}
              >
                强制结算(5h)
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={4}>驻店记录管理</Title>
              <Text type="secondary">查看和管理所有驻店记录</Text>
            </div>
            <Space>
              <Button
                type="primary"
                icon={<LoginOutlined />}
                onClick={() => {
                  setQrScannerMode('checkin');
                  setQrScannerVisible(true);
                }}
              >
                QR Check-in
              </Button>
              <Button
                type="primary"
                icon={<LogoutOutlined />}
                onClick={() => {
                  setQrScannerMode('checkout');
                  setQrScannerVisible(true);
                }}
              >
                QR Check-out
              </Button>
              <Button
                icon={<ClockCircleOutlined />}
                onClick={handleBatchProcessExpired}
                loading={loading}
              >
                批量处理过期记录
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadAllSessions}
                loading={loading}
              >
                刷新
              </Button>
            </Space>
          </div>

          <Search
            placeholder="输入用户ID或会员ID搜索"
            allowClear
            enterButton="搜索"
            size="large"
            onSearch={(value) => {
              if (value) {
                setSearchUserId(value);
                loadUserSessions(value);
              } else {
                setSearchUserId('');
                loadAllSessions();
              }
            }}
            style={{ marginBottom: 16 }}
          />

          <Table
            columns={columns}
            dataSource={sessions}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true
            }}
          />
        </Space>
      </Card>

      {/* QR扫描器 */}
      <QRScanner
        visible={qrScannerVisible}
        onClose={() => setQrScannerVisible(false)}
        mode={qrScannerMode}
        onSuccess={() => {
          loadAllSessions();
        }}
      />
    </div>
  );
};

export default VisitSessionsPage;

