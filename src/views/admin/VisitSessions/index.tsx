// 驻店记录管理页面
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Modal, message, Input, Typography, App, Form, Select, InputNumber, Spin } from 'antd';
import { ReloadOutlined, CheckOutlined, ClockCircleOutlined, QrcodeOutlined, LoginOutlined, LogoutOutlined, GiftOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  getUserVisitSessions,
  getAllPendingVisitSessions,
  getAllVisitSessions,
  getExpiredVisitSessions,
  completeVisitSession,
  addRedemptionToSession
} from '../../../services/firebase/visitSessions';
// 不再使用服务端分页，改为加载所有数据并使用客户端分页
import { getCigars } from '../../../services/firebase/firestore';
import { createRedemptionRecord, updateRedemptionRecord, getRedemptionRecordsBySession } from '../../../services/firebase/redemption';
import { useAuthStore } from '../../../store/modules/auth';
import type { VisitSession, Cigar } from '../../../types';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { QRScanner } from '../../../components/admin/QRScanner';

const { Title, Text } = Typography;
const { Search } = Input;

const VisitSessionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isSuperAdmin } = useAuthStore();
  const { modal } = App.useApp(); // 使用 App.useApp() 获取 modal 实例以支持 React 19
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<VisitSession[]>([]); // 保留用于搜索
  const [searchUserId, setSearchUserId] = useState<string>('');
  const [stores, setStores] = useState<any[]>([]);

  // 不再使用服务端分页，改为加载所有数据并使用客户端分页
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [qrScannerMode, setQrScannerMode] = useState<'checkin' | 'checkout'>('checkin');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'expired'>('all');
  const [addRedemptionModalVisible, setAddRedemptionModalVisible] = useState(false);
  const [editRedemptionModalVisible, setEditRedemptionModalVisible] = useState(false);
  const [forceCheckoutModalVisible, setForceCheckoutModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<VisitSession | null>(null);
  const [selectedRedemptionRecord, setSelectedRedemptionRecord] = useState<any>(null);
  const [cigars, setCigars] = useState<Cigar[]>([]);
  const [addingRedemption, setAddingRedemption] = useState(false);
  const [redemptionRecords, setRedemptionRecords] = useState<Map<string, any[]>>(new Map());
  const [forceCheckoutForm] = Form.useForm();
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false;

  useEffect(() => {
    loadCigars();
    loadStores();
    // 初始加载所有数据
    loadAllSessions();
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadStores = async () => {
    const { getAllStores } = await import('../../../services/firebase/stores');
    const data = await getAllStores();
    setStores(data);
  };

  // 监听筛选条件变化，重新加载数据
  useEffect(() => {
    if (searchUserId) {
      // 如果搜索用户ID，加载该用户的记录
      loadUserSessions(searchUserId);
    } else {
      // 否则加载所有记录
      loadAllSessions();
    }
  }, [statusFilter, searchUserId, isSuperAdmin, user?.storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadCigars = async () => {
    try {
      const cigarList = await getCigars();
      setCigars(cigarList);
    } catch (error) {
      console.error(t('visitSessions.loadCigarsFailed') + ':', error);
    }
  };

  // 加载指定 session 的所有兑换记录（包括待处理和已完成）
  const loadRedemptionRecords = async (sessionId: string) => {
    try {
      const records = await getRedemptionRecordsBySession(sessionId);
      setRedemptionRecords(prev => {
        const newMap = new Map(prev);
        newMap.set(sessionId, records);
        return newMap;
      });
    } catch (error) {
      console.error(t('visitSessions.loadRedemptionRecordsFailed') + ':', error);
    }
  };

  const loadAllSessions = async () => {
    setLoading(true);
    try {
      let allSessions: VisitSession[] = [];

      if (statusFilter === 'pending') {
        // 只加载待处理的记录
        allSessions = await getAllPendingVisitSessions(isSuperAdmin ? undefined : user?.storeId);
      } else {
        // 加载所有记录，然后根据筛选器过滤
        // 移除数量限制，加载所有数据
        allSessions = await getAllVisitSessions(undefined, isSuperAdmin ? undefined : user?.storeId);
        if (statusFilter !== 'all') {
          allSessions = allSessions.filter(session => session.status === statusFilter);
        }
      }

      setSessions(allSessions);
    } catch (error) {
      console.error(t('visitSessions.loadVisitSessionsFailed') + ':', error);
      message.error(t('visitSessions.loadVisitSessionsFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadUserSessions = async (userId: string) => {
    setLoading(true);
    try {
      const storeId = isSuperAdmin ? undefined : user?.storeId;
      // 移除数量限制，加载该用户的所有记录
      const userSessions = await getUserVisitSessions(userId, undefined, storeId);
      // 根据状态筛选
      let filteredSessions = userSessions;
      if (statusFilter !== 'all') {
        filteredSessions = userSessions.filter(session => session.status === statusFilter);
      }
      setSessions(filteredSessions);
    } catch (error) {
      message.error(t('visitSessions.loadUserVisitSessionsFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckout = async (sessionId: string, forceHours?: number) => {

    if (!user?.id) {
      message.error(t('visitSessions.pleaseLogin'));
      return;
    }

    const content = forceHours
      ? t('visitSessions.forceCheckoutConfirmContent', { hours: forceHours })
      : t('visitSessions.confirmCheckoutContent');

    try {

      modal.confirm({
        title: t('visitSessions.confirmCheckout'),
        content: content,
        okText: t('common.confirm'),
        cancelText: t('common.cancel'),
        centered: true,
        maskClosable: false,
        onOk: async () => {
          try {
            setLoading(true);
            const result = await completeVisitSession(sessionId, user.id, user.storeId, forceHours);
            if (result.success) {
              message.success(t('visitSessions.checkoutSuccess', { points: result.pointsDeducted || 0 }));
              // 重新加载所有数据
              await loadAllSessions();
            } else {
              message.error(result.error || t('visitSessions.checkoutFailed'));
            }
          } catch (error: any) {
            console.error('[handleManualCheckout] 结算异常', error);
            message.error(error.message || t('visitSessions.checkoutFailed'));
          } finally {
            setLoading(false);
          }
        },
        onCancel: () => {
        }
      });

    } catch (error: any) {
      console.error('[handleManualCheckout] modal.confirm 异常', error);
      message.error(t('visitSessions.modalOpenFailed') + ': ' + (error.message || t('common.unknownError')));
    }
  };

  const handleBatchProcessExpired = async () => {
    if (!user?.id) {
      message.error(t('visitSessions.pleaseLogin'));
      return;
    }

    modal.confirm({
      title: t('visitSessions.batchProcessExpired'),
      content: t('visitSessions.batchProcessExpiredConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        setLoading(true);
        try {
          const { processExpiredVisitSessions } = await import('../../../services/firebase/scheduledJobs');
          const result = await processExpiredVisitSessions();
          if (result.success) {
            message.success(t('visitSessions.batchProcessSuccess', { count: result.processed }));
            loadAllSessions();
          } else {
            message.error(t('visitSessions.batchProcessFailed'));
          }
        } catch (error: any) {
          message.error(error.message || t('visitSessions.batchProcessFailed'));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const columns = [
    {
      title: t('visitSessions.checkInTime'),
      dataIndex: 'checkInAt',
      key: 'checkInAt',
      width: 180,
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: t('visitSessions.user'),
      dataIndex: 'userName',
      key: 'userName',
      width: 150,
      render: (name: string, record: VisitSession) => name || record.userId
    },
    {
      title: t('visitSessions.store'),
      dataIndex: 'storeId',
      key: 'storeId',
      width: 150,
      render: (storeId: string, record: VisitSession) => {
        if (!storeId) return '-';
        const store = stores.find(s => s.id === storeId);
        return store?.name || record.storeName || storeId;
      }
    },
    {
      title: t('visitSessions.type'),
      dataIndex: 'checkInType',
      key: 'checkInType',
      width: 120,
      render: (type: string, record: VisitSession) => {
        if (type === 'daypass' || record.dayPass?.isPurchased) {
          return <Tag color="gold">Day Pass</Tag>;
        }
        return <Tag color="blue">{t('visitSessions.memberCheckIn')}</Tag>;
      }
    },
    {
      title: t('visitSessions.checkOutTime'),
      dataIndex: 'checkOutAt',
      key: 'checkOutAt',
      width: 180,
      render: (date: Date | undefined) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: t('visitSessions.duration'),
      key: 'duration',
      width: 120,
      render: (_: any, record: VisitSession) => {
        if (record.durationHours !== undefined) {
          return `${record.durationHours} ${t('visitSessions.hours')}`;
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
      title: t('visitSessions.pointsDeducted'),
      dataIndex: 'pointsDeducted',
      key: 'pointsDeducted',
      width: 100,
      render: (points: number | undefined) => points !== undefined ? `-${points}` : '-'
    },
    {
      title: t('visitSessions.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: VisitSession) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: t('visitSessions.statusPending') },
          completed: { color: 'green', text: t('visitSessions.statusCompleted') },
          expired: { color: 'red', text: t('visitSessions.statusExpired') }
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status };

        // 检查是否超过24小时
        if (status === 'pending') {
          const now = new Date();
          const diffMs = now.getTime() - record.checkInAt.getTime();
          const hours = diffMs / (1000 * 60 * 60);
          if (hours >= 24) {
            return <Tag color="red">{t('visitSessions.expiredPending')}</Tag>;
          }
        }

        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    {
      title: t('visitSessions.actions'),
      key: 'action',
      width: 200,
      render: (_: any, record: VisitSession) => {
        if (record.status !== 'pending') {
          return null;
        }

        return (
          <Space>
            <Button
              size="small"
              icon={<CheckOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleManualCheckout(record.id);
              }}
              style={{
                background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                border: 'none',
                color: '#111',
                fontWeight: 700
              }}
            >
              {t('visitSessions.checkout')}
            </Button>
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSession(record);
                forceCheckoutForm.setFieldsValue({ forceHours: 5 });
                setForceCheckoutModalVisible(true);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF'
              }}
            >
              {t('visitSessions.forceCheckout')}
            </Button>
          </Space>
        );
      }
    }
  ];

  return (
    <div style={{ paddingBottom: isMobile ? '80px' : '0' }}>
      {/* 标题 */}
      <h1 style={{
        fontSize: 22,
        fontWeight: 800,
        backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        marginBottom: 12
      }}>
        {t('visitSessions.title')}
      </h1>
      <Text style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block' }}>
        {t('visitSessions.subtitle')}
      </Text>
      <div>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: 1 }} />
            <Space wrap>
              <Button
                icon={<LoginOutlined />}
                onClick={() => {
                  setQrScannerMode('checkin');
                  setQrScannerVisible(true);
                }}
                style={{
                  background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                  border: 'none',
                  color: '#111',
                  fontWeight: 700,
                  boxShadow: '0 4px 15px rgba(244,175,37,0.35)'
                }}
              >
                Check-in
              </Button>
              <Button
                icon={<LogoutOutlined />}
                onClick={() => {
                  setQrScannerMode('checkout');
                  setQrScannerVisible(true);
                }}
                style={{
                  background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                  border: 'none',
                  color: '#111',
                  fontWeight: 700,
                  boxShadow: '0 4px 15px rgba(244,175,37,0.35)'
                }}
              >
                Check-out
              </Button>

              <Button
                icon={<ReloadOutlined />}
                onClick={async () => {
                  // 重新加载所有数据
                  await loadAllSessions()
                }}
                loading={loading}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF'
                }}
              >
                {t('visitSessions.refresh')}
              </Button>
            </Space>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <Search
              placeholder={t('visitSessions.searchPlaceholder')}
              allowClear
              enterButton={t('common.search')}
              size="large"
              style={{ flex: 1, minWidth: 300 }}
              onSearch={(value) => {
                setSearchUserId(value || '');
                // useEffect会自动处理数据加载
              }}
              className="points-config-form"
            />
            <Space wrap>
              <Text style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{t('visitSessions.statusFilter')}</Text>
              <Button
                onClick={() => setStatusFilter('all')}
                style={statusFilter === 'all' ? {
                  background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                  border: 'none',
                  color: '#111',
                  fontWeight: 700
                } : {
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF'
                }}
              >
                {t('visitSessions.all')}
              </Button>
              <Button
                onClick={() => setStatusFilter('pending')}
                style={statusFilter === 'pending' ? {
                  background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                  border: 'none',
                  color: '#111',
                  fontWeight: 700
                } : {
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF'
                }}
              >
                {t('visitSessions.pending')}
              </Button>
              <Button
                onClick={() => setStatusFilter('completed')}
                style={statusFilter === 'completed' ? {
                  background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                  border: 'none',
                  color: '#111',
                  fontWeight: 700
                } : {
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF'
                }}
              >
                {t('visitSessions.completed')}
              </Button>

            </Space>
          </div>

          {!isMobile ? (
            <div className="points-config-form">
              <Table
                columns={columns}
                dataSource={sessions}
                rowKey="id"
                loading={loading}
                scroll={{
                  y: 'calc(100vh - 350px)', // 启用虚拟滚动
                  x: 'max-content'
                }}
                pagination={{
                  pageSize: isMobile ? 10 : 20,
                  total: sessions.length,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => t('common.paginationTotal', { start: range[0], end: range[1], total }),
                  pageSizeOptions: ['10', '20', '50', '100'],
                }}
                style={{
                  background: 'transparent'
                }}
                expandable={{
                  expandedRowRender: (record: VisitSession) => {
                    // 从 redemptionRecords state 中获取该 session 的所有兑换记录（包括待处理和已完成）
                    const allRedemptionRecords = redemptionRecords.get(record.id) || [];

                    // 如果还没有加载，则加载
                    if (allRedemptionRecords.length === 0 && record.status === 'pending') {
                      loadRedemptionRecords(record.id);
                    }

                    return (
                      <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', marginLeft: 24, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div style={{ fontWeight: 600, color: '#FFD700' }}>
                            <GiftOutlined style={{ marginRight: 8 }} />
                            {t('visitSessions.redemptionRecords')} ({allRedemptionRecords.length})
                          </div>
                          {record.status === 'pending' && (
                            <Button
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => {
                                setSelectedSession(record);
                                form.setFieldsValue({ items: [{ cigarId: undefined, quantity: 1 }] });
                                setAddRedemptionModalVisible(true);
                              }}
                              style={{
                                background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                                border: 'none',
                                color: '#111',
                                fontWeight: 700
                              }}
                            >
                              {t('visitSessions.addRedemption')}
                            </Button>
                          )}
                        </div>

                        {allRedemptionRecords.length === 0 ? (
                          <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{t('visitSessions.noRedemptionRecords')}</Text>
                        ) : (
                          <div className="points-config-form">
                            <Table
                              dataSource={allRedemptionRecords}
                              rowKey={(item) => item.id || `${record.id}-${item.createdAt}`}
                              pagination={false}
                              size="small"
                              style={{
                                background: 'transparent'
                              }}
                              columns={[
                                {
                                  title: t('visitSessions.status'),
                                  dataIndex: 'status',
                                  key: 'status',
                                  width: 100,
                                  render: (status: string) => {
                                    if (status === 'pending') {
                                      return <Tag color="orange">{t('visitSessions.statusToSelect')}</Tag>;
                                    }
                                    return <Tag color="green">{t('visitSessions.statusCompleted')}</Tag>;
                                  }
                                },
                                {
                                  title: t('visitSessions.cigarName'),
                                  dataIndex: 'cigarName',
                                  key: 'cigarName',
                                  width: 200,
                                  render: (name: string, record: any) => {
                                    if (record.status === 'pending') {
                                      return <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{t('visitSessions.statusToSelect')}</Text>;
                                    }
                                    return <Text strong style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{name}</Text>;
                                  }
                                },
                                {
                                  title: t('visitSessions.quantity'),
                                  dataIndex: 'quantity',
                                  key: 'quantity',
                                  width: 100,
                                  align: 'center' as const,
                                  render: (quantity: number) => (
                                    <Tag color="blue">{quantity} {t('visitSessions.sticks')}</Tag>
                                  )
                                },
                                {
                                  title: t('visitSessions.redemptionTime'),
                                  dataIndex: 'redeemedAt',
                                  key: 'redeemedAt',
                                  width: 180,
                                  render: (date: Date) => {
                                    if (!date) return '-';
                                    // 处理 Firestore Timestamp 或 Date
                                    const dateObj = date instanceof Date ? date : (date as any)?.toDate?.() || new Date(date);
                                    return dayjs(dateObj).format('YYYY-MM-DD HH:mm:ss');
                                  }
                                },
                                {
                                  title: t('visitSessions.operator'),
                                  dataIndex: 'redeemedBy',
                                  key: 'redeemedBy',
                                  width: 150,
                                  render: (userId: string) => userId || '-'
                                },
                                {
                                  title: t('visitSessions.actions'),
                                  key: 'action',
                                  width: 100,
                                  render: (_: any, redemptionRecord: any) => {
                                    // 允许管理员编辑所有兑换记录（无论状态如何）
                                    return (
                                      <Button
                                        type="link"
                                        size="small"
                                        icon={<EditOutlined />}
                                        onClick={() => {
                                          setSelectedRedemptionRecord(redemptionRecord);
                                          setSelectedSession(record);
                                          form.setFieldsValue({
                                            cigarId: redemptionRecord.cigarId || undefined,
                                            quantity: redemptionRecord.quantity || 1
                                          });
                                          setEditRedemptionModalVisible(true);
                                        }}
                                      >
                                        {t('common.edit')}
                                      </Button>
                                    );
                                  }
                                }
                              ]}
                            />
                          </div>
                        )}
                      </div>
                    );
                  },
                  onExpand: (expanded, record) => {
                    if (expanded) {
                      // 展开时加载兑换记录
                      loadRedemptionRecords(record.id);
                    }
                  },
                  rowExpandable: (record: VisitSession) => {
                    // 如果有兑换记录或状态为pending，可以展开
                    return true; // 总是可以展开，以便查看是否有待处理的记录
                  }
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  <Spin />
                </div>
              ) : sessions.length === 0 ? (
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', padding: '24px 0' }}>
                  {t('visitSessions.noVisitSessions')}
                </div>
              ) : (
                sessions.map((record) => {
                  const statusMap: Record<string, { color: string; text: string }> = {
                    pending: { color: '#fb923c', text: t('visitSessions.statusPending') },
                    completed: { color: '#34d399', text: t('visitSessions.statusCompleted') },
                    expired: { color: '#f87171', text: t('visitSessions.statusExpired') }
                  };
                  const statusInfo = statusMap[record.status] || { color: '#9ca3af', text: record.status };

                  const checkInDate = record.checkInAt instanceof Date
                    ? record.checkInAt
                    : (record.checkInAt as any)?.toDate
                      ? (record.checkInAt as any).toDate()
                      : new Date(record.checkInAt);

                  const checkOutDate = record.checkOutAt instanceof Date
                    ? record.checkOutAt
                    : (record.checkOutAt as any)?.toDate
                      ? (record.checkOutAt as any).toDate()
                      : record.checkOutAt
                        ? new Date(record.checkOutAt)
                        : null;

                  const calculateDuration = () => {
                    if (record.durationHours !== undefined) {
                      return `${record.durationHours} ${t('visitSessions.hours')}`;
                    }
                    if (record.status === 'pending') {
                      const now = new Date();
                      const diffMs = now.getTime() - checkInDate.getTime();
                      const hours = Math.floor(diffMs / (1000 * 60 * 60));
                      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                      return `${hours}:${String(minutes).padStart(2, '0')}`;
                    }
                    return '-';
                  };

                  const allRedemptionRecords = redemptionRecords.get(record.id) || [];
                  const expanded = expandedSessions.has(record.id);

                  // 展开时自动加载兑换记录
                  if (expanded && allRedemptionRecords.length === 0) {
                    loadRedemptionRecords(record.id);
                  }

                  return (
                    <div
                      key={record.id}
                      style={{
                        border: '1px solid rgba(244,175,37,0.2)',
                        borderRadius: 12,
                        padding: 12,
                        background: 'rgba(34,28,16,0.5)',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>
                            {record.userName || record.userId.substring(0, 20)}
                          </div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                            Check-in: {dayjs(checkInDate).format('YYYY-MM-DD HH:mm')}
                          </div>
                          {checkOutDate && (
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                              Check-out: {dayjs(checkOutDate).format('YYYY-MM-DD HH:mm')}
                            </div>
                          )}
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                            {t('visitSessions.duration')}: {calculateDuration()}
                            {record.pointsDeducted !== undefined && (
                              <span style={{ marginLeft: 8 }}>
                                • {t('visitSessions.pointsDeducted')}: -{record.pointsDeducted}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: 12 }}>
                          <div style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: statusInfo.color === '#fb923c' ? 'rgba(251,146,60,0.2)' :
                              statusInfo.color === '#34d399' ? 'rgba(52,211,153,0.2)' :
                                'rgba(248,113,113,0.2)',
                            color: statusInfo.color,
                            fontWeight: 600,
                            marginBottom: 8
                          }}>
                            {statusInfo.text}
                          </div>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => {
                              const newExpanded = !expanded;
                              if (newExpanded) {
                                setExpandedSessions(prev => new Set(prev).add(record.id));
                                loadRedemptionRecords(record.id);
                              } else {
                                setExpandedSessions(prev => {
                                  const next = new Set(prev);
                                  next.delete(record.id);
                                  return next;
                                });
                              }
                            }}
                            style={{
                              color: '#FFD700',
                              padding: 0,
                              fontSize: 11
                            }}
                          >
                            {expanded ? t('visitSessions.collapse') : `${t('visitSessions.redemptionRecords')}${allRedemptionRecords.length > 0 ? ` (${allRedemptionRecords.length})` : ''}`}
                          </Button>
                        </div>
                      </div>
                      {record.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(244,175,37,0.1)' }}>
                          <Button
                            size="small"
                            icon={<CheckOutlined />}
                            onClick={() => handleManualCheckout(record.id)}
                            style={{
                              flex: 1,
                              background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                              border: 'none',
                              color: '#111',
                              fontWeight: 700
                            }}
                          >
                            {t('visitSessions.checkout')}
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedSession(record);
                              forceCheckoutForm.setFieldsValue({ forceHours: 5 });
                              setForceCheckoutModalVisible(true);
                            }}
                            style={{
                              flex: 1,
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: '#FFFFFF'
                            }}
                          >
                            {t('visitSessions.forceCheckout')}
                          </Button>
                        </div>
                      )}
                      {expanded && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(244,175,37,0.1)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#FFD700' }}>
                              <GiftOutlined style={{ marginRight: 4 }} />
                              {t('visitSessions.redemptionRecords')} {allRedemptionRecords.length > 0 && `(${allRedemptionRecords.length})`}
                            </div>
                            {record.status === 'pending' && (
                              <Button
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  setSelectedSession(record);
                                  form.setFieldsValue({ items: [{ cigarId: undefined, quantity: 1 }] });
                                  setAddRedemptionModalVisible(true);
                                }}
                                style={{
                                  background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                                  border: 'none',
                                  color: '#111',
                                  fontWeight: 700,
                                  fontSize: 11,
                                  height: 24,
                                  padding: '0 8px'
                                }}
                              >
                                {t('common.add')}
                              </Button>
                            )}
                          </div>
                          {allRedemptionRecords.length === 0 ? (
                            <div style={{
                              padding: 16,
                              textAlign: 'center',
                              color: 'rgba(255, 255, 255, 0.5)',
                              fontSize: 12
                            }}>
                              {t('visitSessions.noRedemptionRecords')}
                            </div>
                          ) : (
                            allRedemptionRecords.map((redemptionRecord) => {
                              const redeemedAt = redemptionRecord.redeemedAt
                                ? (redemptionRecord.redeemedAt instanceof Date
                                  ? redemptionRecord.redeemedAt
                                  : (redemptionRecord.redeemedAt as any)?.toDate?.() || new Date(redemptionRecord.redeemedAt))
                                : null;

                              return (
                                <div
                                  key={redemptionRecord.id || `${record.id}-${redemptionRecord.createdAt}`}
                                  style={{
                                    padding: 10,
                                    marginBottom: 8,
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: 6,
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: 12 }}>
                                          {redemptionRecord.status === 'pending' ? t('visitSessions.statusToSelect') : (redemptionRecord.cigarName || '-')}
                                        </span>
                                        <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                                          {redemptionRecord.quantity || 1} {t('visitSessions.sticks')}
                                        </Tag>
                                        <Tag color={redemptionRecord.status === 'pending' ? 'orange' : 'green'} style={{ fontSize: 10, margin: 0 }}>
                                          {redemptionRecord.status === 'pending' ? t('visitSessions.statusToSelect') : t('visitSessions.statusCompleted')}
                                        </Tag>
                                      </div>
                                      {redeemedAt && (
                                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>
                                          {t('visitSessions.redemptionTime')}: {dayjs(redeemedAt).format('YYYY-MM-DD HH:mm')}
                                        </div>
                                      )}
                                      {redemptionRecord.redeemedBy && (
                                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                                          {t('visitSessions.operator')}: {redemptionRecord.redeemedBy}
                                        </div>
                                      )}
                                    </div>
                                    {record.status === 'pending' && (
                                      <Button
                                        type="link"
                                        size="small"
                                        icon={<EditOutlined />}
                                        onClick={() => {
                                          setSelectedRedemptionRecord(redemptionRecord);
                                          setSelectedSession(record);
                                          form.setFieldsValue({
                                            cigarId: redemptionRecord.cigarId || undefined,
                                            quantity: redemptionRecord.quantity || 1
                                          });
                                          setEditRedemptionModalVisible(true);
                                        }}
                                        style={{
                                          color: '#FFD700',
                                          padding: 0,
                                          fontSize: 11,
                                          height: 'auto'
                                        }}
                                      >
                                        {t('common.edit')}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </Space>
      </div>

      {/* QR扫描器 */}
      <QRScanner
        visible={qrScannerVisible}
        onClose={() => setQrScannerVisible(false)}
        mode={qrScannerMode}
        onSuccess={() => {
          loadAllSessions();
        }}
      />

      {/* 添加兑换记录弹窗 */}
      <Modal
        title={<span style={{ color: '#FFFFFF' }}>{t('visitSessions.addRedemption')}</span>}
        open={addRedemptionModalVisible}
        onCancel={() => {
          setAddRedemptionModalVisible(false);
          setSelectedSession(null);
          form.resetFields();
        }}
        okButtonProps={{
          style: {
            background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
            border: 'none',
            color: '#111',
            fontWeight: 700
          }
        }}
        cancelButtonProps={{
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF'
          }
        }}
        styles={{
          content: {
            background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
            border: '1px solid rgba(244, 175, 37, 0.6)'
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(244, 175, 37, 0.6)'
          },
          body: {
            background: 'transparent'
          },
          footer: {
            background: 'transparent',
            borderTop: '1px solid rgba(244, 175, 37, 0.6)'
          }
        }}
        onOk={async () => {
          if (!selectedSession || !user?.id) {
            message.error(t('visitSessions.missingRequiredInfo'));
            return;
          }

          try {
            const values = await form.validateFields();
            const items = values.items || [];

            if (items.length === 0) {
              message.warning(t('visitSessions.addAtLeastOneRedemption'));
              return;
            }

            setAddingRedemption(true);

            // 为每个项目创建兑换记录
            for (const item of items) {
              const cigar = cigars.find(c => c.id === item.cigarId);
              if (!cigar) {
                message.error(t('visitSessions.cigarNotFound', { id: item.cigarId }));
                continue;
              }

              // 创建兑换记录
              const result = await createRedemptionRecord(
                selectedSession.userId,
                selectedSession.id,
                cigar.id,
                cigar.name,
                item.quantity,
                user.id
              );

              if (!result.success) {
                message.error(t('visitSessions.addRedemptionFailed', { error: result.error }));
                continue;
              }
            }

            message.success(t('visitSessions.saveSuccess'));
            setAddRedemptionModalVisible(false);
            setSelectedSession(null);
            form.resetFields();
            await loadAllSessions();

            // 如果选中的 session 有展开，刷新其兑换记录
            if (selectedSession) {
              await loadRedemptionRecords(selectedSession.id);
            }

            // 提示：用户端数据会在下次自动刷新时更新（每10秒）
          } catch (error: any) {
            if (error.errorFields) {
              // 表单验证错误 - Ant Design 会自动显示字段错误，这里不需要额外处理
              // 只显示一个友好的提示
              const errorMessages = error.errorFields.map((field: any) => field.errors?.[0]).filter(Boolean);
              if (errorMessages.length > 0) {
                message.warning(t('visitSessions.pleaseCompleteForm', { errors: errorMessages.join(', ') }));
              }
              return;
            }
            // 其他错误才记录到控制台
            console.error('添加兑换记录失败:', error);
            message.error(error.message || t('visitSessions.addRedemptionError'));
          } finally {
            setAddingRedemption(false);
          }
        }}
        confirmLoading={addingRedemption}
        width={600}
      >
        <Form form={form} layout="vertical" className="points-config-form">
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'cigarId']}
                      label={t('visitSessions.cigarName')}
                      rules={[{ required: true, message: t('visitSessions.selectCigar') }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Select
                        placeholder={t('visitSessions.selectCigar')}
                        showSearch
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={cigars.map(cigar => ({
                          value: cigar.id,
                          label: `${cigar.name} - RM${cigar.price}`
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'quantity']}
                      label={t('visitSessions.quantity')}
                      rules={[
                        { required: true, message: t('visitSessions.enterQuantity') },
                        { type: 'number', min: 1, message: t('visitSessions.quantityGreaterThanZero') }
                      ]}
                      style={{ width: 100, marginBottom: 0 }}
                    >
                      <InputNumber min={1} max={100} placeholder={t('visitSessions.quantity')} />
                    </Form.Item>
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(name)}
                      disabled={fields.length === 1}
                    />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    {t('visitSessions.addRedemption')}
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* 编辑兑换记录弹窗 */}
      <Modal
        title={<span style={{ color: '#FFFFFF' }}>{t('visitSessions.editRedemption')}</span>}
        open={editRedemptionModalVisible}
        onCancel={() => {
          setEditRedemptionModalVisible(false);
          setSelectedRedemptionRecord(null);
          setSelectedSession(null);
          form.resetFields();
        }}
        okButtonProps={{
          style: {
            background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
            border: 'none',
            color: '#111',
            fontWeight: 700
          }
        }}
        cancelButtonProps={{
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF'
          }
        }}
        styles={{
          content: {
            background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
            border: '1px solid rgba(244, 175, 37, 0.6)'
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(244, 175, 37, 0.6)'
          },
          body: {
            background: 'transparent'
          },
          footer: {
            background: 'transparent',
            borderTop: '1px solid rgba(244, 175, 37, 0.6)'
          }
        }}
        onOk={async () => {
          if (!selectedRedemptionRecord || !selectedSession || !user?.id) {
            message.error(t('visitSessions.missingRequiredInfo'));
            return;
          }

          try {
            const values = await form.validateFields();
            const cigar = cigars.find(c => c.id === values.cigarId);
            if (!cigar) {
              message.error(t('visitSessions.pleaseSelectCigar'));
              return;
            }

            setAddingRedemption(true);

            // 更新兑换记录
            const result = await updateRedemptionRecord(
              selectedRedemptionRecord.id,
              cigar.id,
              cigar.name,
              values.quantity,
              user.id
            );

            if (!result.success) {
              message.error(result.error || t('visitSessions.updateRedemptionFailed'));
              return;
            }

            message.success(t('visitSessions.saveSuccess'));
            setEditRedemptionModalVisible(false);
            setSelectedRedemptionRecord(null);
            setSelectedSession(null);
            form.resetFields();

            // 刷新兑换记录
            if (selectedSession) {
              await loadRedemptionRecords(selectedSession.id);
            }
            await loadAllSessions();
          } catch (error: any) {
            console.error('更新兑换记录失败:', error);
            if (error.errorFields) {
              // 表单验证错误
              return;
            }
            message.error(error.message || t('visitSessions.updateRedemptionError'));
          } finally {
            setAddingRedemption(false);
          }
        }}
        confirmLoading={addingRedemption}
        width={500}
      >
        <Form form={form} layout="vertical" className="points-config-form">
          <Form.Item
            name="cigarId"
            label={t('visitSessions.cigarName')}
            rules={[{ required: true, message: t('visitSessions.selectCigar') }]}
          >
            <Select
              placeholder={t('visitSessions.selectCigar')}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={cigars.map(cigar => ({
                value: cigar.id,
                label: `${cigar.name} - RM${cigar.price}`
              }))}
            />
          </Form.Item>
          <Form.Item
            name="quantity"
            label={t('visitSessions.quantity')}
            rules={[{ required: true, message: t('visitSessions.enterQuantity') }]}
          >
            <InputNumber min={1} max={100} placeholder={t('visitSessions.quantity')} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 强制结算弹窗 */}
      <Modal
        title={<span style={{ color: '#FFFFFF' }}>{t('visitSessions.forceCheckout')}</span>}
        open={forceCheckoutModalVisible}
        onCancel={() => {
          setForceCheckoutModalVisible(false);
          setSelectedSession(null);
          forceCheckoutForm.resetFields();
        }}
        okButtonProps={{
          style: {
            background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
            border: 'none',
            color: '#111',
            fontWeight: 700
          }
        }}
        cancelButtonProps={{
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF'
          }
        }}
        styles={{
          content: {
            background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
            border: '1px solid rgba(244, 175, 37, 0.6)'
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(244, 175, 37, 0.6)'
          },
          body: {
            background: 'transparent'
          },
          footer: {
            background: 'transparent',
            borderTop: '1px solid rgba(244, 175, 37, 0.6)'
          }
        }}
        onOk={async () => {
          if (!selectedSession || !user?.id) {
            message.error(t('visitSessions.missingRequiredInfo'));
            return;
          }

          try {
            const values = await forceCheckoutForm.validateFields();
            const forceHours = values.forceHours;

            if (forceHours <= 0) {
              message.error(t('visitSessions.durationGreaterThanZero'));
              return;
            }

            setForceCheckoutModalVisible(false);
            const sessionId = selectedSession.id;
            setSelectedSession(null);
            forceCheckoutForm.resetFields();

            // 调用结算函数
            await handleManualCheckout(sessionId, forceHours);
          } catch (error: any) {
            console.error('强制结算验证失败:', error);
            if (error.errorFields) {
              // 表单验证错误
              return;
            }
            message.error(error.message || t('visitSessions.validationFailed'));
          }
        }}
        width={400}
      >
        <Form form={forceCheckoutForm} layout="vertical" className="points-config-form">
          <Form.Item
            name="forceHours"
            label={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{t('visitSessions.forceHours')}</span>}
            rules={[
              { required: true, message: t('visitSessions.enterForceHours') },
              { type: 'number', min: 0.5, message: t('visitSessions.minForceHours') }
            ]}
            initialValue={5}
          >
            <InputNumber
              min={0.5}
              max={24}
              step={0.5}
              style={{ width: '100%' }}
              placeholder={t('visitSessions.enterForceHours')}
              addonAfter={t('visitSessions.hours')}
            />
          </Form.Item>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, marginTop: -8 }}>
            {t('visitSessions.forceCheckoutHint')}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default VisitSessionsPage;

