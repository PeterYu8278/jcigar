// 积分配置管理页面
import React, { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Button, Space, Typography, Row, Col, Divider, message, Spin } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { getPointsConfig, updatePointsConfig, getDefaultPointsConfig } from '../../../services/firebase/pointsConfig';
import { useAuthStore } from '../../../store/modules/auth';
import { useTranslation } from 'react-i18next';
import type { PointsConfig } from '../../../types';

const { Title, Text } = Typography;

const PointsConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();
  const { t } = useTranslation();

  // 加载积分配置
  useEffect(() => {
    loadConfig();
  }, []);

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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>{t('pointsConfig.title')}</Title>
            <Text type="secondary">{t('pointsConfig.description')}</Text>
          </div>

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
        </Space>
      </Card>
    </div>
  );
};

export default PointsConfigPage;

