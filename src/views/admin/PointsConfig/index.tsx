// 积分配置管理页面
import React, { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Button, Space, Typography, Row, Col, Divider, message, Spin, Tabs, Table, Tag, DatePicker, Select, Modal } from 'antd';
import { SaveOutlined, ReloadOutlined, HistoryOutlined, SettingOutlined, PlusOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { getPointsConfig, updatePointsConfig, getDefaultPointsConfig } from '../../../services/firebase/pointsConfig';
import { getAllPointsRecords } from '../../../services/firebase/pointsRecords';
import { getMembershipFeeConfig, updateMembershipFeeConfig, getDefaultMembershipFeeConfig, getAllMembershipFeeRecords, createMembershipFeeRecord } from '../../../services/firebase/membershipFee';
import { getUsers } from '../../../services/firebase/firestore';
import type { User } from '../../../types';
import type { MembershipFeeRecord } from '../../../types';
import { processPendingMembershipFees } from '../../../services/firebase/scheduledJobs';
import { useAuthStore } from '../../../store/modules/auth';
import { useTranslation } from 'react-i18next';
import type { PointsConfig, PointsRecord } from '../../../types';
import { ReloadVerification } from '../../../components/admin/ReloadVerification';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const PointsConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'records' | 'reload' | 'membershipFees'>('config');
  const [pointsRecords, setPointsRecords] = useState<PointsRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [processingFees, setProcessingFees] = useState(false);
  const [membershipFeeRecords, setMembershipFeeRecords] = useState<MembershipFeeRecord[]>([]);
  const [loadingMembershipFeeRecords, setLoadingMembershipFeeRecords] = useState(false);
  const [membershipFeeStatusFilter, setMembershipFeeStatusFilter] = useState<'all' | 'pending' | 'paid' | 'failed' | 'cancelled'>('all');
  const [creatingFeeRecord, setCreatingFeeRecord] = useState(false);
  const [feeRecordForm] = Form.useForm();
  const [users, setUsers] = useState<User[]>([]);
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false;

  // 加载积分配置
  useEffect(() => {
    loadConfig();
  }, []);

  // 加载积分记录
  useEffect(() => {
    if (activeTab === 'records') {
      loadPointsRecords();
    }
  }, [activeTab]);

  // 加载年费记录
  useEffect(() => {
    if (activeTab === 'membershipFees') {
      loadMembershipFeeRecords();
      loadUsers();
    }
  }, [activeTab, membershipFeeStatusFilter]);

  // 加载用户列表
  const loadUsers = async () => {
    try {
      const userList = await getUsers();
      setUsers(userList);
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  };

  // 自动执行扣除年费（管理员访问页面时自动执行，无需手动点击）
  useEffect(() => {
    if (!user?.id || user.role !== 'admin') {
      return;
    }

    // 页面加载时执行一次
    const executeAutoDeduction = async () => {
      try {
        const result = await processPendingMembershipFees();
        if (result.success && result.processed > 0) {
          // 静默执行，不显示消息（避免打扰管理员）
        }
      } catch (error: any) {
        console.error('[PointsConfigPage] 自动扣除年费失败:', error);
        // 静默失败，不显示错误消息
      }
    };

    // 立即执行一次
    executeAutoDeduction();

    // 设置定期检查（每天执行一次）
    const interval = setInterval(() => {
      executeAutoDeduction();
    }, 24 * 60 * 60 * 1000); // 24小时 = 24 * 60分钟 * 60秒 * 1000毫秒

    return () => {
      clearInterval(interval);
    };
  }, [user?.id, user?.role]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      // 加载积分配置
      const pointsConfig = await getPointsConfig();
      const defaultPointsConfig = getDefaultPointsConfig();
      
      // 加载会员年费配置
      const membershipFeeConfig = await getMembershipFeeConfig();
      const defaultMembershipFeeConfig = getDefaultMembershipFeeConfig();
      
      // 合并配置到表单
      const formValues: any = {
        ...(pointsConfig || defaultPointsConfig),
        // 会员年费配置
        membershipFee: {
          annualFees: (membershipFeeConfig?.annualFees || defaultMembershipFeeConfig.annualFees).map(fee => ({
            ...fee,
            startDate: dayjs(fee.startDate),
            endDate: fee.endDate ? dayjs(fee.endDate) : null
          }))
        }
      };
      
      form.setFieldsValue(formValues);
    } catch (error) {
      console.error('[PointsConfigPage] 加载配置失败:', error);
      message.error(t('pointsConfig.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const onFinish = async (values: any) => {
    if (!user?.id) {
      message.error(t('pointsConfig.userNotFound'));
      return;
    }

    setSaving(true);
    try {
      // 分离积分配置和会员年费配置
      const { membershipFee, ...pointsConfigValues } = values;
      
      // 保存积分配置
      const pointsResult = await updatePointsConfig(pointsConfigValues, user.id);
      
      // 保存会员年费配置
      if (membershipFee) {
        const membershipFeeConfigData = {
          annualFees: (membershipFee.annualFees || []).map((fee: any) => ({
            amount: fee.amount,
            rate: fee.rate,
            startDate: fee.startDate.toDate(),
            endDate: fee.endDate ? fee.endDate.toDate() : undefined
          }))
        };
        
        const membershipFeeResult = await updateMembershipFeeConfig({
          ...membershipFeeConfigData,
          updatedBy: user.id
        }, user.id);
        
        if (pointsResult.success && membershipFeeResult.success) {
          message.success('配置已保存');
        } else {
          message.error(pointsResult.error || membershipFeeResult.error || '保存失败');
        }
      } else {
        if (pointsResult.success) {
          message.success(t('pointsConfig.saveSuccess'));
        } else {
          message.error(pointsResult.error || t('pointsConfig.saveFailed'));
        }
      }
    } catch (error) {
      message.error(t('pointsConfig.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // 手动触发自动扣除会员费
  const handleProcessMembershipFees = async () => {
    if (!user?.id) {
      message.error('请先登录');
      return;
    }

    setProcessingFees(true);
    try {
      const result = await processPendingMembershipFees();
      if (result.success) {
        message.success(
          `处理完成：成功 ${result.paid} 条，失败 ${result.failed} 条，共处理 ${result.processed} 条`
        );
        if (result.errors.length > 0) {
          console.error('处理过程中的错误:', result.errors);
        }
      } else {
        message.error('处理失败');
      }
    } catch (error: any) {
      console.error('处理会员费失败:', error);
      message.error(error.message || '处理失败');
    } finally {
      setProcessingFees(false);
    }
  };

  // 重置为默认值
  const resetToDefault = () => {
    const defaultPointsConfig = getDefaultPointsConfig();
    const defaultMembershipFeeConfig = getDefaultMembershipFeeConfig();
    
    const formValues: any = {
      ...defaultPointsConfig,
      membershipFee: {
        annualFees: defaultMembershipFeeConfig.annualFees.map(fee => ({
          ...fee,
          startDate: dayjs(fee.startDate),
          endDate: fee.endDate ? dayjs(fee.endDate) : null
        }))
      }
    };
    
    form.setFieldsValue(formValues);
    message.info(t('pointsConfig.resetSuccess'));
  };

  // 加载积分记录
  const loadPointsRecords = async () => {
    setLoadingRecords(true);
    try {
      const records = await getAllPointsRecords(200);
      setPointsRecords(records);
    } catch (error) {
      message.error(t('pointsConfig.loadRecordsFailed'));
    } finally {
      setLoadingRecords(false);
    }
  };

  // 加载年费记录
  const loadMembershipFeeRecords = async () => {
    setLoadingMembershipFeeRecords(true);
    try {
      const filter = membershipFeeStatusFilter === 'all' ? undefined : membershipFeeStatusFilter;
      
      const records = await getAllMembershipFeeRecords(filter, 200);
      
      setMembershipFeeRecords(records);
    } catch (error) {
      console.error('[PointsConfigPage] 加载年费记录失败:', error);
      message.error('加载年费记录失败');
    } finally {
      setLoadingMembershipFeeRecords(false);
    }
  };

  // 创建年费记录
  const handleCreateFeeRecord = async (values: { userId: string; dueDate: dayjs.Dayjs }) => {
    if (!user?.id) {
      message.error('请先登录');
      return;
    }

    try {
      const dueDate = values.dueDate.toDate();
      const result = await createMembershipFeeRecord(
        values.userId,
        dueDate,
        'initial'
      );

      if (result.success) {
        message.success('年费记录创建成功');
        setCreatingFeeRecord(false);
        feeRecordForm.resetFields();
        loadMembershipFeeRecords();
      } else {
        message.error(result.error || '创建年费记录失败');
      }
    } catch (error: any) {
      message.error(error.message || '创建年费记录失败');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  // 积分记录表格列定义
  const columns = [
    {
      title: t('pointsConfig.records.time'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: Date) => new Date(date).toLocaleString('zh-CN')
    },
    {
      title: t('pointsConfig.records.user'),
      dataIndex: 'userName',
      key: 'userName',
      width: 150,
      render: (name: string, record: PointsRecord) => name || record.userId
    },
    {
      title: t('pointsConfig.records.type'),
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'earn' ? 'green' : 'red'}>
          {type === 'earn' ? t('pointsConfig.records.earn') : t('pointsConfig.records.spend')}
        </Tag>
      )
    },
    {
      title: t('pointsConfig.records.amount'),
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number, record: PointsRecord) => (
        <Text strong style={{ color: record.type === 'earn' ? '#52c41a' : '#ff4d4f' }}>
          {record.type === 'earn' ? '+' : '-'}{amount}
        </Text>
      )
    },
    {
      title: t('pointsConfig.records.source'),
      dataIndex: 'source',
      key: 'source',
      width: 120,
      render: (source: string) => {
        const sourceMap: Record<string, string> = {
          reload: '充值',
          membership_fee: '年费',
          visit: '驻店时长费用'
        };
        return sourceMap[source] || source;
      }
    },
    {
      title: t('pointsConfig.records.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: t('pointsConfig.records.balance'),
      dataIndex: 'balance',
      key: 'balance',
      width: 120,
      render: (balance: number) => balance || '-'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', color: '#FFFFFF' }}>
      {/* 标题 */}
      <h1 style={{ 
        fontSize: 22, 
        fontWeight: 800, 
        backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
        WebkitBackgroundClip: 'text', 
        color: 'transparent', 
        marginBottom: 12 
      }}>
        {t('pointsConfig.title')}
      </h1>
      <Text style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: 24 }}>
        {t('pointsConfig.description')}
      </Text>

      {/* 标签页 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(244,175,37,0.2)',
          marginBottom: 16
        }}>
          {(['config', 'records', 'reload', 'membershipFees'] as const).map((tabKey) => {
            const isActive = activeTab === tabKey
            const baseStyle: React.CSSProperties = {
              flex: 1,
              padding: '10px 0',
              fontWeight: 800,
              fontSize: 12,
              outline: 'none',
              borderBottom: isActive ? '2px solid transparent' : '2px solid transparent',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              position: 'relative' as const,
            }
            const activeStyle: React.CSSProperties = {
              color: 'transparent',
              backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
              WebkitBackgroundClip: 'text',
            }
            const inactiveStyle: React.CSSProperties = {
              color: '#A0A0A0',
            }

            const getTabLabel = (key: string) => {
              switch (key) {
                case 'config': return <><SettingOutlined style={{ marginRight: 4 }} />{t('pointsConfig.tabs.config')}</>
                case 'records': return <><HistoryOutlined style={{ marginRight: 4 }} />{t('pointsConfig.tabs.records')}</>
                case 'reload': return <><HistoryOutlined style={{ marginRight: 4 }} />充值验证</>
                case 'membershipFees': return <><HistoryOutlined style={{ marginRight: 4 }} />年费记录</>
                default: return ''
              }
            }

            return (
              <button
                key={tabKey}
                style={{
                  ...baseStyle,
                  ...(isActive ? activeStyle : inactiveStyle),
                }}
                onClick={() => setActiveTab(tabKey as 'config' | 'records' | 'reload' | 'membershipFees')}
              >
                {getTabLabel(tabKey)}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  }} />
                )}
              </button>
            )
          })}
        </div>
          </div>

      {/* 标签页内容 */}
      <div>
        {activeTab === 'config' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            padding: 24,
            border: '1px solid rgba(244, 175, 37, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={getDefaultPointsConfig()}
              className="points-config-form"
            >
            {/* 购买相关积分 */}
            {/* 基础积分规则 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{ 
                fontSize: 16, 
                fontWeight: 700, 
                marginBottom: 16,
                backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}>
                {t('pointsConfig.basicRules')}
              </h3>
              <Row gutter={16}>
                <Col xs={24} sm={6}>
                  <Form.Item
                    label={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{t('pointsConfig.purchase.perRinggit')}</span>}
                    name={['purchase', 'perRinggit']}
                    rules={[{ required: true, message: t('pointsConfig.validation.required') }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.1}
                      precision={1}
                      style={{ width: '100%' }}
                      addonAfter={t('pointsConfig.units.pointsPerRM')}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={6}>
                  <Form.Item
                    label={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{t('pointsConfig.reload.referrerFirstReload')}</span>}
                    name={['reload', 'referrerFirstReload']}
                    rules={[{ required: true, message: t('pointsConfig.validation.required') }]}
                  >
                    <InputNumber
                      min={0}
                      max={10000}
                      style={{ width: '100%' }}
                      addonAfter={t('pointsConfig.units.points')}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={6}>
                  <Form.Item
                    label={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{t('pointsConfig.reload.referredFirstReload')}</span>}
                    name={['reload', 'referredFirstReload']}
                    rules={[{ required: true, message: t('pointsConfig.validation.required') }]}
                  >
                    <InputNumber
                      min={0}
                      max={10000}
                      style={{ width: '100%' }}
                      addonAfter={t('pointsConfig.units.points')}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={6}>
                  <Form.Item
                    label={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{t('pointsConfig.event.registration')}</span>}
                    name={['event', 'registration']}
                    rules={[{ required: true, message: t('pointsConfig.validation.required') }]}
                  >
                    <InputNumber
                      min={0}
                      max={1000}
                      style={{ width: '100%' }}
                      addonAfter={t('pointsConfig.units.points')}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* 年费配置（按日期范围） */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{ 
                fontSize: 16, 
                fontWeight: 700, 
                marginBottom: 16,
                backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}>
                年费配置（按日期范围）
              </h3>
              
              <Form.List name={['membershipFee', 'annualFees']}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row key={key} gutter={16} style={{ marginBottom: 16 }}>
                        <Col xs={24} sm={6}>
                          <Form.Item
                            {...restField}
                            name={[name, 'startDate']}
                            label={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>生效开始日期</span>}
                            rules={[{ required: true, message: '请选择开始日期' }]}
                          >
                            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'endDate']}
                            label={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>生效结束日期（可选）</span>}
                          >
                            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'amount']}
                            label={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>年费金额（积分）</span>}
                            rules={[{ required: true, message: '请输入年费金额' }]}
                          >
                            <InputNumber
                              min={0}
                              max={100000}
                              style={{ width: '100%' }}
                              addonAfter="积分"
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'rate']}
                            label={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>每小时扣除积分</span>}
                            rules={[{ required: true, message: '请输入每小时扣除积分' }]}
                          >
                            <InputNumber
                              min={0}
                              max={1000}
                              style={{ width: '100%' }}
                              addonAfter="积分/小时"
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={2}>
                          <Form.Item label=" " style={{ marginBottom: 0 }}>
                            <Button
                              type="link"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                              disabled={fields.length === 1}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        添加年费配置
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </div>

                    {/* 操作按钮 */}
            <div style={{ textAlign: 'right', marginTop: 24 }}>
                      <Space>
                        <Button
                          icon={<PlayCircleOutlined />}
                          onClick={handleProcessMembershipFees}
                          loading={processingFees}
                          title="手动触发自动扣除到期的会员年费（系统已自动执行，此按钮用于手动触发）"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF'
                  }}
                        >
                          手动执行扣除年费
                        </Button>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={resetToDefault}
                          disabled={saving}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF'
                  }}
                        >
                          {t('pointsConfig.actions.resetToDefault')}
                        </Button>
                        <Button
                          icon={<SaveOutlined />}
                          htmlType="submit"
                          loading={saving}
                  style={{
                    background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                    border: 'none',
                    color: '#111',
                    fontWeight: 700,
                    boxShadow: '0 4px 15px rgba(244,175,37,0.35)'
                  }}
                        >
                          {t('pointsConfig.actions.saveConfig')}
                        </Button>
                      </Space>
                    </div>
                  </Form>
          </div>
        )}

        {activeTab === 'records' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            padding: 24,
            border: '1px solid rgba(244, 175, 37, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
                    <div style={{ marginBottom: 16, textAlign: 'right' }}>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={loadPointsRecords}
                        loading={loadingRecords}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF'
                }}
                      >
                        {t('common.refresh')}
                      </Button>
                    </div>
            {!isMobile ? (
              <div className="points-config-form">
                    <Table
                      columns={columns}
                      dataSource={pointsRecords}
                      rowKey="id"
                      loading={loadingRecords}
                      pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        showTotal: (total) => t('common.paginationTotal', {
                          start: 1,
                          end: Math.min(20, total),
                          total
                        })
                      }}
                      locale={{
                        emptyText: t('pointsConfig.records.noRecords')
                      }}
                  style={{
                    background: 'transparent'
                  }}
                    />
                  </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loadingRecords ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    <Spin />
                  </div>
                ) : pointsRecords.length === 0 ? (
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', padding: '24px 0' }}>
                    {t('pointsConfig.records.noRecords')}
                  </div>
                ) : (
                  pointsRecords.map((record) => {
                    const getSourceText = (source: string) => {
                      const sourceMap: Record<string, string> = {
                        reload: '充值',
                        membership_fee: '年费',
                        visit: '驻店时长费用'
                      };
                      return sourceMap[source] || source;
                    };

                    const recordDate = record.createdAt instanceof Date
                      ? record.createdAt
                      : (record.createdAt as any)?.toDate
                        ? (record.createdAt as any).toDate()
                        : new Date(record.createdAt);

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
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                              {recordDate.toLocaleString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>
                              {record.description || '-'}
                            </div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                              {getSourceText(record.source)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', marginLeft: 12 }}>
                            <div style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: record.type === 'earn' ? '#52c41a' : '#ff4d4f',
                              marginBottom: 4
                            }}>
                              {record.type === 'earn' ? '+' : '-'}{record.amount}
                            </div>
                            {record.balance && (
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                                余额: {record.balance}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reload' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            padding: 24,
            border: '1px solid rgba(244, 175, 37, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
                    <ReloadVerification onRefresh={loadPointsRecords} />
                  </div>
        )}

        {activeTab === 'membershipFees' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            padding: 24,
            border: '1px solid rgba(244, 175, 37, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Select
                        value={membershipFeeStatusFilter}
                        onChange={(value: 'all' | 'pending' | 'paid' | 'failed' | 'cancelled') => setMembershipFeeStatusFilter(value)}
                        style={{ width: 150 }}
                        options={[
                          { label: '全部', value: 'all' },
                          { label: '待支付', value: 'pending' },
                          { label: '已支付', value: 'paid' },
                          { label: '失败', value: 'failed' },
                          { label: '已取消', value: 'cancelled' }
                        ]}
                className="points-config-form"
                      />
                      <Space>
                        <Button 
                          icon={<PlusOutlined />}
                          onClick={() => setCreatingFeeRecord(true)}
                  style={{
                    background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                    border: 'none',
                    color: '#111',
                    fontWeight: 700,
                    boxShadow: '0 4px 15px rgba(244,175,37,0.35)'
                  }}
                        >
                          创建年费记录
                        </Button>
                <Button 
                  onClick={loadMembershipFeeRecords} 
                  loading={loadingMembershipFeeRecords}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF'
                  }}
                >
                          刷新
                        </Button>
                      </Space>
                    </div>
            {!isMobile ? (
              <div className="points-config-form">
                    <Table
                      columns={[
                        {
                          title: '用户',
                          dataIndex: 'userName',
                          key: 'userName',
                          width: 150,
                          render: (name: string, record: MembershipFeeRecord) => name || record.userId
                        },
                        {
                          title: '类型',
                          dataIndex: 'renewalType',
                          key: 'renewalType',
                          width: 100,
                          render: (type: string) => (
                            <Tag color={type === 'initial' ? 'blue' : 'green'}>
                              {type === 'initial' ? '首次开通' : '续费'}
                            </Tag>
                          )
                        },
                        {
                          title: '金额',
                          dataIndex: 'amount',
                          key: 'amount',
                          width: 120,
                          render: (amount: number) => (
                            <Text strong style={{ color: '#ff4d4f' }}>
                              -{amount} 积分
                            </Text>
                          )
                        },
                        {
                          title: '应扣费日期',
                          dataIndex: 'dueDate',
                          key: 'dueDate',
                          width: 180,
                          render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
                        },
                        {
                          title: '实际扣费时间',
                          dataIndex: 'deductedAt',
                          key: 'deductedAt',
                          width: 180,
                          render: (date: Date | undefined) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
                        },
                        {
                          title: '状态',
                          dataIndex: 'status',
                          key: 'status',
                          width: 100,
                          render: (status: string) => {
                            const statusMap: Record<string, { color: string; text: string }> = {
                              pending: { color: 'orange', text: '待支付' },
                              paid: { color: 'green', text: '已支付' },
                              failed: { color: 'red', text: '失败' },
                              cancelled: { color: 'default', text: '已取消' }
                            };
                            const statusInfo = statusMap[status] || { color: 'default', text: status };
                            return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
                          }
                        },
                        {
                          title: '创建时间',
                          dataIndex: 'createdAt',
                          key: 'createdAt',
                          width: 180,
                          render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
                        }
                      ]}
                      dataSource={membershipFeeRecords}
                      rowKey="id"
                      loading={loadingMembershipFeeRecords}
                      pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条记录`
                      }}
                      locale={{
                        emptyText: '暂无年费记录'
                      }}
                  style={{
                    background: 'transparent'
                  }}
                    />
                  </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loadingMembershipFeeRecords ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    <Spin />
                  </div>
                ) : membershipFeeRecords.length === 0 ? (
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', padding: '24px 0' }}>
                    暂无年费记录
                  </div>
                ) : (
                  membershipFeeRecords.map((record) => {
                    const statusMap: Record<string, { color: string; text: string }> = {
                      pending: { color: '#fb923c', text: '待支付' },
                      paid: { color: '#34d399', text: '已支付' },
                      failed: { color: '#f87171', text: '失败' },
                      cancelled: { color: '#9ca3af', text: '已取消' }
                    };
                    const statusInfo = statusMap[record.status] || { color: '#9ca3af', text: record.status };

                    const dueDate = record.dueDate instanceof Date
                      ? record.dueDate
                      : (record.dueDate as any)?.toDate
                        ? (record.dueDate as any).toDate()
                        : new Date(record.dueDate);

                    const deductedDate = record.deductedAt instanceof Date
                      ? record.deductedAt
                      : (record.deductedAt as any)?.toDate
                        ? (record.deductedAt as any).toDate()
                        : record.deductedAt
                          ? new Date(record.deductedAt)
                          : null;

                    const createdDate = record.createdAt instanceof Date
                      ? record.createdAt
                      : (record.createdAt as any)?.toDate
                        ? (record.createdAt as any).toDate()
                        : new Date(record.createdAt);

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
                              应扣费: {dayjs(dueDate).format('YYYY-MM-DD HH:mm')}
                            </div>
                            {deductedDate && (
                              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                                实际扣费: {dayjs(deductedDate).format('YYYY-MM-DD HH:mm')}
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                              创建: {dayjs(createdDate).format('YYYY-MM-DD HH:mm')}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', marginLeft: 12 }}>
                            <div style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: '#ff4d4f',
                              marginBottom: 4
                            }}>
                              -{record.amount} 积分
                            </div>
                            <span style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: statusInfo.color === '#fb923c' ? 'rgba(251,146,60,0.2)' :
                                statusInfo.color === '#34d399' ? 'rgba(52,211,153,0.2)' :
                                statusInfo.color === '#f87171' ? 'rgba(248,113,113,0.2)' :
                                'rgba(156,163,175,0.2)',
                              color: statusInfo.color,
                              fontWeight: 600
                            }}>
                              {statusInfo.text}
                            </span>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                              {record.renewalType === 'initial' ? '首次开通' : '续费'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 创建年费记录Modal */}
      <Modal
        title={<span style={{ color: '#FFFFFF' }}>创建年费记录</span>}
        open={creatingFeeRecord}
        onCancel={() => {
          setCreatingFeeRecord(false);
          feeRecordForm.resetFields();
        }}
        onOk={() => feeRecordForm.submit()}
        okText="创建"
        cancelText="取消"
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
            border: '1px solid rgba(244, 175, 37, 0.3)'
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(244, 175, 37, 0.2)'
          },
          body: {
            background: 'transparent'
          },
          footer: {
            background: 'transparent',
            borderTop: '1px solid rgba(244, 175, 37, 0.2)'
          }
        }}
      >
        <Form
          form={feeRecordForm}
          layout="vertical"
          onFinish={handleCreateFeeRecord}
          initialValues={{
            dueDate: dayjs().add(1, 'year')
          }}
        >
          <Form.Item
            label="选择用户"
            name="userId"
            rules={[{ required: true, message: '请选择用户' }]}
          >
            <Select
              showSearch
              placeholder="搜索用户（姓名、邮箱、手机号）"
              filterOption={(input, option) => {
                const kw = (input || '').toLowerCase();
                const uid = option?.value as string;
                const u = users.find(x => x.id === uid);
                const name = (u?.displayName || '').toLowerCase();
                const email = (u?.email || '').toLowerCase();
                const phone = ((u as any)?.profile?.phone || '').toLowerCase();
                return !!kw && (name.includes(kw) || email.includes(kw) || phone.includes(kw));
              }}
            >
              {users
                .sort((a, b) => {
                  const nameA = (a.displayName || a.email || a.id).toLowerCase();
                  const nameB = (b.displayName || b.email || b.id).toLowerCase();
                  return nameA.localeCompare(nameB);
                })
                .map(u => (
                  <Select.Option key={u.id} value={u.id}>
                    {u.displayName || u.email || u.id} {((u as any)?.profile?.phone ? `(${(u as any).profile.phone})` : '')}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>应扣费日期</span>}
            name="dueDate"
            rules={[{ required: true, message: '请选择应扣费日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              年费金额将根据配置自动计算。创建后，系统会在应扣费日期自动尝试扣除。
            </Text>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PointsConfigPage;

