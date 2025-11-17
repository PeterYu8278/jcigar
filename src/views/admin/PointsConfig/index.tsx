// 积分配置管理页面
import React, { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Button, Space, Typography, Row, Col, Divider, message, Spin, Tabs, Table, Tag } from 'antd';
import { SaveOutlined, ReloadOutlined, HistoryOutlined, SettingOutlined } from '@ant-design/icons';
import { getPointsConfig, updatePointsConfig, getDefaultPointsConfig } from '../../../services/firebase/pointsConfig';
import { getAllPointsRecords } from '../../../services/firebase/pointsRecords';
import { useAuthStore } from '../../../store/modules/auth';
import { useTranslation } from 'react-i18next';
import type { PointsConfig, PointsRecord } from '../../../types';
import { ReloadVerification } from '../../../components/admin/ReloadVerification';

const { Title, Text } = Typography;

const PointsConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'records' | 'reload'>('config');
  const [pointsRecords, setPointsRecords] = useState<PointsRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
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

  const loadConfig = async () => {
    setLoading(true);
    try {
      const config = await getPointsConfig();
      if (config) {
        form.setFieldsValue(config);
      } else {
        // 使用默认配置
        const defaultConfig = getDefaultPointsConfig();
        form.setFieldsValue(defaultConfig);
      }
    } catch (error) {
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
      const result = await updatePointsConfig(values, user.id);
      if (result.success) {
        message.success(t('pointsConfig.saveSuccess'));
      } else {
        message.error(result.error || t('pointsConfig.saveFailed'));
      }
    } catch (error) {
      message.error(t('pointsConfig.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // 重置为默认值
  const resetToDefault = () => {
    const defaultConfig = getDefaultPointsConfig();
    form.setFieldsValue(defaultConfig);
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

                    {/* 操作按钮 */}
                    <div style={{ textAlign: 'right' }}>
                      <Space>
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
              }
            ]}
          />
        </Space>
      </Card>
    </div>
  );
};

export default PointsConfigPage;

