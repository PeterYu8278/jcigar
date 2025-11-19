// 驻店记录管理页面
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Modal, message, Input, Typography, App, Form, Select, InputNumber } from 'antd';
import { ReloadOutlined, CheckOutlined, ClockCircleOutlined, QrcodeOutlined, LoginOutlined, LogoutOutlined, GiftOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { 
  getUserVisitSessions, 
  getAllPendingVisitSessions,
  getAllVisitSessions,
  getExpiredVisitSessions, 
  completeVisitSession,
  addRedemptionToSession
} from '../../../services/firebase/visitSessions';
import { getCigars } from '../../../services/firebase/firestore';
import { createRedemptionRecord, updateRedemptionRecord, getRedemptionRecordsBySession } from '../../../services/firebase/redemption';
import { useAuthStore } from '../../../store/modules/auth';
import type { VisitSession, Cigar } from '../../../types';
import dayjs from 'dayjs';
import { QRScanner } from '../../../components/admin/QRScanner';

const { Title, Text } = Typography;
const { Search } = Input;

const VisitSessionsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { modal } = App.useApp(); // 使用 App.useApp() 获取 modal 实例以支持 React 19
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<VisitSession[]>([]);
  const [searchUserId, setSearchUserId] = useState<string>('');
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

  useEffect(() => {
    loadAllSessions();
    loadCigars();
  }, [statusFilter]);

  const loadCigars = async () => {
    try {
      const cigarList = await getCigars();
      setCigars(cigarList);
    } catch (error) {
      console.error('加载雪茄列表失败:', error);
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
      console.error('加载兑换记录失败:', error);
    }
  };

  const loadAllSessions = async () => {
    setLoading(true);
    try {
      let allSessions: VisitSession[] = [];
      
      if (statusFilter === 'pending') {
        // 只加载待处理的记录
        allSessions = await getAllPendingVisitSessions();
      } else {
        // 加载所有记录，然后根据筛选器过滤
        allSessions = await getAllVisitSessions(200);
        if (statusFilter !== 'all') {
          allSessions = allSessions.filter(session => session.status === statusFilter);
        }
      }
      
      setSessions(allSessions);
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

    const content = forceHours 
      ? `是否按 ${forceHours} 小时强制结算此驻店记录？`
      : '是否结算此驻店记录？';

    try {
      
      modal.confirm({
        title: '确认结算',
        content: content,
        okText: '确认',
        cancelText: '取消',
        centered: true,
        maskClosable: false,
        onOk: async () => {
          try {
            setLoading(true);
            const result = await completeVisitSession(sessionId, user.id, forceHours);
            if (result.success) {
              message.success(`结算成功，扣除积分: ${result.pointsDeducted || 0}`);
              await loadAllSessions();
            } else {
              message.error(result.error || '结算失败');
            }
          } catch (error: any) {
            console.error('[handleManualCheckout] 结算异常', error);
            message.error(error.message || '结算失败');
          } finally {
            setLoading(false);
          }
        },
        onCancel: () => {
        }
      });
      
    } catch (error: any) {
      console.error('[handleManualCheckout] modal.confirm 异常', error);
      message.error('无法打开确认对话框: ' + (error.message || '未知错误'));
    }
  };

  const handleBatchProcessExpired = async () => {
    if (!user?.id) {
      message.error('请先登录');
      return;
    }

    modal.confirm({
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
      render: (_: any, record: VisitSession) => {
        if (record.status !== 'pending') {
          return null;
        }
        
        return (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleManualCheckout(record.id);
              }}
            >
              结算
            </Button>
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSession(record);
                forceCheckoutForm.setFieldsValue({ forceHours: 5 });
                setForceCheckoutModalVisible(true);
              }}
            >
              强制结算
            </Button>
          </Space>
        );
      }
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

          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <Search
              placeholder="输入用户ID或会员ID搜索"
              allowClear
              enterButton="搜索"
              size="large"
              style={{ flex: 1 }}
              onSearch={(value) => {
                if (value) {
                  setSearchUserId(value);
                  loadUserSessions(value);
                } else {
                  setSearchUserId('');
                  loadAllSessions();
                }
              }}
            />
            <Space>
              <Text>状态筛选：</Text>
              <Button 
                type={statusFilter === 'all' ? 'primary' : 'default'}
                onClick={() => setStatusFilter('all')}
              >
                全部
              </Button>
              <Button 
                type={statusFilter === 'pending' ? 'primary' : 'default'}
                onClick={() => setStatusFilter('pending')}
              >
                待处理
              </Button>
              <Button 
                type={statusFilter === 'completed' ? 'primary' : 'default'}
                onClick={() => setStatusFilter('completed')}
              >
                已完成
              </Button>
              <Button 
                type={statusFilter === 'expired' ? 'primary' : 'default'}
                onClick={() => setStatusFilter('expired')}
              >
                已过期
              </Button>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={sessions}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true
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
                  <div style={{ padding: '16px', background: '#fafafa', marginLeft: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, color: '#1890ff' }}>
                        <GiftOutlined style={{ marginRight: 8 }} />
                        兑换记录 ({allRedemptionRecords.length} 项)
                      </div>
                      {record.status === 'pending' && (
                        <Button
                          type="primary"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            setSelectedSession(record);
                            form.setFieldsValue({ items: [{ cigarId: undefined, quantity: 1 }] });
                            setAddRedemptionModalVisible(true);
                          }}
                        >
                          添加兑换记录
                        </Button>
                      )}
                    </div>
                    
                    {allRedemptionRecords.length === 0 ? (
                      <Text type="secondary">暂无兑换记录</Text>
                    ) : (
                      <Table
                        dataSource={allRedemptionRecords}
                        rowKey={(item) => item.id || `${record.id}-${item.createdAt}`}
                        pagination={false}
                        size="small"
                        columns={[
                          {
                            title: '状态',
                            dataIndex: 'status',
                            key: 'status',
                            width: 100,
                            render: (status: string) => {
                              if (status === 'pending') {
                                return <Tag color="orange">待选择</Tag>;
                              }
                              return <Tag color="green">已完成</Tag>;
                            }
                          },
                          {
                            title: '雪茄名称',
                            dataIndex: 'cigarName',
                            key: 'cigarName',
                            width: 200,
                            render: (name: string, record: any) => {
                              if (record.status === 'pending') {
                                return <Text type="secondary">待选择</Text>;
                              }
                              return <Text strong>{name}</Text>;
                            }
                          },
                          {
                            title: '数量',
                            dataIndex: 'quantity',
                            key: 'quantity',
                            width: 100,
                            align: 'center' as const,
                            render: (quantity: number) => (
                              <Tag color="blue">{quantity} 支</Tag>
                            )
                          },
                          {
                            title: '兑换时间',
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
                            title: '操作人',
                            dataIndex: 'redeemedBy',
                            key: 'redeemedBy',
                            width: 150,
                            render: (userId: string) => userId || '-'
                          },
                          {
                            title: '操作',
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
                                  编辑
                                </Button>
                              );
                            }
                          }
                        ]}
                      />
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

      {/* 添加兑换记录弹窗 */}
      <Modal
        title="添加兑换记录"
        open={addRedemptionModalVisible}
        onCancel={() => {
          setAddRedemptionModalVisible(false);
          setSelectedSession(null);
          form.resetFields();
        }}
        onOk={async () => {
          if (!selectedSession || !user?.id) {
            message.error('缺少必要信息');
            return;
          }

          try {
            const values = await form.validateFields();
            const items = values.items || [];
            
            if (items.length === 0) {
              message.warning('请至少添加一项兑换记录');
              return;
            }

            setAddingRedemption(true);

            // 为每个项目创建兑换记录
            for (const item of items) {
              const cigar = cigars.find(c => c.id === item.cigarId);
              if (!cigar) {
                message.error(`雪茄 ${item.cigarId} 不存在`);
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
                message.error(`添加兑换记录失败: ${result.error}`);
                continue;
              }
            }

            message.success('兑换记录添加成功');
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
            console.error('添加兑换记录失败:', error);
            if (error.errorFields) {
              // 表单验证错误
              return;
            }
            message.error(error.message || '添加兑换记录失败');
          } finally {
            setAddingRedemption(false);
          }
        }}
        confirmLoading={addingRedemption}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'cigarId']}
                      label="雪茄"
                      rules={[{ required: true, message: '请选择雪茄' }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Select
                        placeholder="选择雪茄"
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
                      label="数量"
                      rules={[{ required: true, message: '请输入数量' }]}
                      style={{ width: 100, marginBottom: 0 }}
                    >
                      <InputNumber min={1} max={100} placeholder="数量" />
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
                    添加雪茄
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* 编辑兑换记录弹窗 */}
      <Modal
        title="编辑兑换记录"
        open={editRedemptionModalVisible}
        onCancel={() => {
          setEditRedemptionModalVisible(false);
          setSelectedRedemptionRecord(null);
          setSelectedSession(null);
          form.resetFields();
        }}
        onOk={async () => {
          if (!selectedRedemptionRecord || !selectedSession || !user?.id) {
            message.error('缺少必要信息');
            return;
          }

          try {
            const values = await form.validateFields();
            const cigar = cigars.find(c => c.id === values.cigarId);
            if (!cigar) {
              message.error('请选择雪茄');
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
              message.error(result.error || '更新兑换记录失败');
              return;
            }

            message.success('兑换记录已更新');
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
            message.error(error.message || '更新兑换记录失败');
          } finally {
            setAddingRedemption(false);
          }
        }}
        confirmLoading={addingRedemption}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="cigarId"
            label="雪茄"
            rules={[{ required: true, message: '请选择雪茄' }]}
          >
            <Select
              placeholder="选择雪茄"
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
            label="数量"
            rules={[{ required: true, message: '请输入数量' }]}
          >
            <InputNumber min={1} max={100} placeholder="数量" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 强制结算弹窗 */}
      <Modal
        title="强制结算"
        open={forceCheckoutModalVisible}
        onCancel={() => {
          setForceCheckoutModalVisible(false);
          setSelectedSession(null);
          forceCheckoutForm.resetFields();
        }}
        onOk={async () => {
          if (!selectedSession || !user?.id) {
            message.error('缺少必要信息');
            return;
          }

          try {
            const values = await forceCheckoutForm.validateFields();
            const forceHours = values.forceHours;
            
            if (forceHours <= 0) {
              message.error('结算时长必须大于0');
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
            message.error(error.message || '验证失败');
          }
        }}
        width={400}
      >
        <Form form={forceCheckoutForm} layout="vertical">
          <Form.Item
            name="forceHours"
            label="结算时长（小时）"
            rules={[
              { required: true, message: '请输入结算时长' },
              { type: 'number', min: 0.5, message: '结算时长必须大于等于0.5小时' }
            ]}
            initialValue={5}
          >
            <InputNumber
              min={0.5}
              max={24}
              step={0.5}
              style={{ width: '100%' }}
              placeholder="请输入结算时长"
              addonAfter="小时"
            />
          </Form.Item>
          <div style={{ color: '#999', fontSize: 12, marginTop: -8 }}>
            提示：忘记check-out时，将按此时长进行强制结算
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default VisitSessionsPage;

