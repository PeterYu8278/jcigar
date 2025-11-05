// 积分配置管理页面
import React, { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Button, Space, Typography, Row, Col, Divider, message, Spin } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { getPointsConfig, updatePointsConfig, getDefaultPointsConfig } from '../../../services/firebase/pointsConfig';
import { useAuthStore } from '../../../store/modules/auth';
import type { PointsConfig } from '../../../types';

const { Title, Text } = Typography;

const PointsConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();

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
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const onFinish = async (values: any) => {
    if (!user?.id) {
      message.error('用户信息不存在');
      return;
    }

    setSaving(true);
    try {
      const result = await updatePointsConfig(values, user.id);
      if (result.success) {
        message.success('积分配置已更新');
      } else {
        message.error(result.error || '更新失败');
      }
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 重置为默认值
  const resetToDefault = () => {
    const defaultConfig = getDefaultPointsConfig();
    form.setFieldsValue(defaultConfig);
    message.info('已重置为默认值');
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
            <Title level={4}>积分配置管理</Title>
            <Text type="secondary">配置系统中各项操作获得的积分奖励</Text>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={getDefaultPointsConfig()}
          >
            {/* 注册相关积分 */}
            <Card type="inner" title="注册相关积分" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label="基础注册积分"
                    name={['registration', 'base']}
                    rules={[{ required: true, message: '请输入积分值' }]}
                  >
                    <InputNumber
                      min={0}
                      max={10000}
                      style={{ width: '100%' }}
                      addonAfter="积分"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label="被引荐注册积分"
                    name={['registration', 'withReferral']}
                    rules={[{ required: true, message: '请输入积分值' }]}
                  >
                    <InputNumber
                      min={0}
                      max={10000}
                      style={{ width: '100%' }}
                      addonAfter="积分"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label="引荐人奖励积分"
                    name={['registration', 'referrerReward']}
                    rules={[{ required: true, message: '请输入积分值' }]}
                  >
                    <InputNumber
                      min={0}
                      max={10000}
                      style={{ width: '100%' }}
                      addonAfter="积分"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 购买相关积分 */}
            <Card type="inner" title="购买相关积分" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label="首次购买奖励"
                    name={['purchase', 'firstOrder']}
                    rules={[{ required: true, message: '请输入积分值' }]}
                  >
                    <InputNumber
                      min={0}
                      max={10000}
                      style={{ width: '100%' }}
                      addonAfter="积分"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label="每消费1马币积分"
                    name={['purchase', 'perRinggit']}
                    rules={[{ required: true, message: '请输入积分值' }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.1}
                      precision={1}
                      style={{ width: '100%' }}
                      addonAfter="积分/RM"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label="被引荐人首购，引荐人奖励"
                    name={['purchase', 'referrerFirstOrder']}
                    rules={[{ required: true, message: '请输入积分值' }]}
                  >
                    <InputNumber
                      min={0}
                      max={10000}
                      style={{ width: '100%' }}
                      addonAfter="积分"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 活动相关积分 */}
            <Card type="inner" title="活动相关积分" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label="活动报名积分"
                    name={['event', 'registration']}
                    rules={[{ required: true, message: '请输入积分值' }]}
                  >
                    <InputNumber
                      min={0}
                      max={1000}
                      style={{ width: '100%' }}
                      addonAfter="积分"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label="活动签到积分"
                    name={['event', 'checkIn']}
                    rules={[{ required: true, message: '请输入积分值' }]}
                  >
                    <InputNumber
                      min={0}
                      max={1000}
                      style={{ width: '100%' }}
                      addonAfter="积分"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label="完成活动积分"
                    name={['event', 'completion']}
                    rules={[{ required: true, message: '请输入积分值' }]}
                  >
                    <InputNumber
                      min={0}
                      max={1000}
                      style={{ width: '100%' }}
                      addonAfter="积分"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 其他积分 */}
            <Card type="inner" title="其他积分" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label="完善资料积分"
                    name={['other', 'profileComplete']}
                    rules={[{ required: true, message: '请输入积分值' }]}
                  >
                    <InputNumber
                      min={0}
                      max={1000}
                      style={{ width: '100%' }}
                      addonAfter="积分"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label="首次登录积分"
                    name={['other', 'firstLogin']}
                    rules={[{ required: true, message: '请输入积分值' }]}
                  >
                    <InputNumber
                      min={0}
                      max={1000}
                      style={{ width: '100%' }}
                      addonAfter="积分"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    label="每日签到积分"
                    name={['other', 'dailyCheckIn']}
                    rules={[{ required: true, message: '请输入积分值' }]}
                  >
                    <InputNumber
                      min={0}
                      max={1000}
                      style={{ width: '100%' }}
                      addonAfter="积分"
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
                  重置为默认值
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  htmlType="submit"
                  loading={saving}
                >
                  保存配置
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

