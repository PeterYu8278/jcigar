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
      // 优先使用MembershipFeeConfig的hourlyRate，如果没有则使用PointsConfig的visit.hourlyRate（向后兼容）
      const hourlyRate = membershipFeeConfig?.hourlyRate 
        || (pointsConfig as any)?.visit?.hourlyRate 
        || defaultMembershipFeeConfig.hourlyRate;
      
      const formValues: any = {
        ...(pointsConfig || defaultPointsConfig),
        // 会员年费配置
        membershipFee: {
          hourlyRate: hourlyRate,
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
      
      // 如果存在会员年费配置的hourlyRate，同步到PointsConfig的visit字段（向后兼容）
      if (membershipFee?.hourlyRate !== undefined) {
        pointsConfigValues.visit = {
          hourlyRate: membershipFee.hourlyRate
        };
      }
      
      // 保存积分配置
      const pointsResult = await updatePointsConfig(pointsConfigValues, user.id);
      
      // 保存会员年费配置
      if (membershipFee) {
        const membershipFeeConfigData = {
          hourlyRate: membershipFee.hourlyRate,
          annualFees: (membershipFee.annualFees || []).map((fee: any) => ({
            amount: fee.amount,
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
        hourlyRate: defaultMembershipFeeConfig.hourlyRate,
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
          registration: t('pointsConfig.records.sources.registration'),
          referral: t('pointsConfig.records.sources.referral'),
          purchase: t('pointsConfig.records.sources.purchase'),
          event: t('pointsConfig.records.sources.event'),
          profile: t('pointsConfig.records.sources.profile'),
          checkin: t('pointsConfig.records.sources.checkin'),
          visit: '驻店时长费用',
          membership_fee: '年费',
          reload: '充值',
          admin: t('pointsConfig.records.sources.admin'),
          other: t('pointsConfig.records.sources.other')
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
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>{t('pointsConfig.title')}</Title>
            <Text type="secondary">{t('pointsConfig.description')}</Text>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'config' | 'records' | 'reload')}
            items={[
              {
                key: 'config',
                label: (
                  <span>
                    <SettingOutlined />
                    {t('pointsConfig.tabs.config')}
                  </span>
                ),
                children: (
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={getDefaultPointsConfig()}
                  >
            {/* 注册相关积分 */}
            <Card type="inner" title={t('pointsConfig.registration.title')} style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label={t('pointsConfig.registration.base')}
                    name={['registration', 'base']}
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
                <Col xs={24} sm={8}>
                  <Form.Item
                    label={t('pointsConfig.registration.withReferral')}
                    name={['registration', 'withReferral']}
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
                <Col xs={24} sm={8}>
                  <Form.Item
                    label={t('pointsConfig.registration.referrerReward')}
                    name={['registration', 'referrerReward']}
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
              </Row>
            </Card>

            {/* 购买相关积分 */}
            <Card type="inner" title={t('pointsConfig.purchase.title')} style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label={t('pointsConfig.purchase.firstOrder')}
                    name={['purchase', 'firstOrder']}
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
                <Col xs={24} sm={8}>
                  <Form.Item
                    label={t('pointsConfig.purchase.perRinggit')}
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
                <Col xs={24} sm={8}>
                  <Form.Item
                    label={t('pointsConfig.purchase.referrerFirstOrder')}
                    name={['purchase', 'referrerFirstOrder']}
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
              </Row>
            </Card>

            {/* 活动相关积分 */}
            <Card type="inner" title={t('pointsConfig.event.title')} style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label={t('pointsConfig.event.registration')}
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
                <Col xs={24} sm={8}>
                  <Form.Item
                    label={t('pointsConfig.event.checkIn')}
                    name={['event', 'checkIn']}
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
                <Col xs={24} sm={8}>
                  <Form.Item
                    label={t('pointsConfig.event.completion')}
                    name={['event', 'completion']}
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
            </Card>

            {/* 其他积分 */}
            <Card type="inner" title={t('pointsConfig.other.title')} style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label={t('pointsConfig.other.profileComplete')}
                    name={['other', 'profileComplete']}
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
                <Col xs={24} sm={8}>
                  <Form.Item
                    label={t('pointsConfig.other.firstLogin')}
                    name={['other', 'firstLogin']}
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
                <Col xs={24} sm={8}>
                  <Form.Item
                    label={t('pointsConfig.other.dailyCheckIn')}
                    name={['other', 'dailyCheckIn']}
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
            </Card>

            {/* 驻店时长费用 */}
            <Card type="inner" title="驻店时长费用" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label="每小时扣除积分"
                    name={['membershipFee', 'hourlyRate']}
                    rules={[{ required: true, message: '请输入每小时扣除积分' }]}
                    tooltip="会员驻店时，每小时扣除的积分数"
                  >
                    <InputNumber
                      min={0}
                      max={1000}
                      style={{ width: '100%' }}
                      addonAfter="积分/小时"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 年费配置（按日期范围） */}
            <Card type="inner" title="年费配置（按日期范围）" style={{ marginBottom: 16 }}>
              <Form.List name={['membershipFee', 'annualFees']}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row key={key} gutter={16} style={{ marginBottom: 16 }}>
                        <Col xs={24} sm={8}>
                          <Form.Item
                            {...restField}
                            name={[name, 'startDate']}
                            label="生效开始日期"
                            rules={[{ required: true, message: '请选择开始日期' }]}
                          >
                            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={6}>
                          <Form.Item
                            {...restField}
                            name={[name, 'endDate']}
                            label="生效结束日期（可选）"
                          >
                            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={6}>
                          <Form.Item
                            {...restField}
                            name={[name, 'amount']}
                            label="年费金额（积分）"
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
            </Card>

                    {/* 操作按钮 */}
                    <div style={{ textAlign: 'right' }}>
                      <Space>
                        <Button
                          type="default"
                          icon={<PlayCircleOutlined />}
                          onClick={handleProcessMembershipFees}
                          loading={processingFees}
                          title="手动触发自动扣除到期的会员年费（系统已自动执行，此按钮用于手动触发）"
                        >
                          手动执行扣除年费
                        </Button>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={resetToDefault}
                          disabled={saving}
                        >
                          {t('pointsConfig.actions.resetToDefault')}
                        </Button>
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          htmlType="submit"
                          loading={saving}
                        >
                          {t('pointsConfig.actions.saveConfig')}
                        </Button>
                      </Space>
                    </div>
                  </Form>
                )
              },
              {
                key: 'records',
                label: (
                  <span>
                    <HistoryOutlined />
                    {t('pointsConfig.tabs.records')}
                  </span>
                ),
                children: (
                  <div>
                    <div style={{ marginBottom: 16, textAlign: 'right' }}>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={loadPointsRecords}
                        loading={loadingRecords}
                      >
                        {t('common.refresh')}
                      </Button>
                    </div>
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
                    />
                  </div>
                )
              },
              {
                key: 'reload',
                label: (
                  <span>
                    <HistoryOutlined />
                    充值验证
                  </span>
                ),
                children: (
                  <div>
                    <ReloadVerification onRefresh={loadPointsRecords} />
                  </div>
                )
              },
              {
                key: 'membershipFees',
                label: (
                  <span>
                    <HistoryOutlined />
                    年费记录
                  </span>
                ),
                children: (
                  <div>
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
                      />
                      <Space>
                        <Button 
                          type="primary" 
                          icon={<PlusOutlined />}
                          onClick={() => setCreatingFeeRecord(true)}
                        >
                          创建年费记录
                        </Button>
                        <Button onClick={loadMembershipFeeRecords} loading={loadingMembershipFeeRecords}>
                          刷新
                        </Button>
                      </Space>
                    </div>
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
                    />
                  </div>
                )
              }
            ]}
          />
        </Space>
      </Card>

      {/* 创建年费记录Modal */}
      <Modal
        title="创建年费记录"
        open={creatingFeeRecord}
        onCancel={() => {
          setCreatingFeeRecord(false);
          feeRecordForm.resetFields();
        }}
        onOk={() => feeRecordForm.submit()}
        okText="创建"
        cancelText="取消"
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
            label="应扣费日期"
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
            <Text type="secondary">
              年费金额将根据配置自动计算。创建后，系统会在应扣费日期自动尝试扣除。
            </Text>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PointsConfigPage;

