// 会员费配置管理页面
import React, { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Button, Space, Typography, Row, Col, message, Spin, DatePicker } from 'antd';
import { SaveOutlined, ReloadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getMembershipFeeConfig, updateMembershipFeeConfig, getDefaultMembershipFeeConfig } from '../../../services/firebase/membershipFee';
import { useAuthStore } from '../../../store/modules/auth';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const MembershipFeeConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();
  const { t } = useTranslation();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const config = await getMembershipFeeConfig();
      if (config) {
        // 转换日期为dayjs
        const formValues = {
          hourlyRate: config.hourlyRate,
          annualFees: config.annualFees.map(fee => ({
            ...fee,
            startDate: dayjs(fee.startDate),
            endDate: fee.endDate ? dayjs(fee.endDate) : null
          }))
        };
        form.setFieldsValue(formValues);
      } else {
        const defaultConfig = getDefaultMembershipFeeConfig();
        const formValues = {
          hourlyRate: defaultConfig.hourlyRate,
          annualFees: defaultConfig.annualFees.map(fee => ({
            ...fee,
            startDate: dayjs(fee.startDate),
            endDate: fee.endDate ? dayjs(fee.endDate) : null
          }))
        };
        form.setFieldsValue(formValues);
      }
    } catch (error) {
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    if (!user?.id) {
      message.error('用户信息不存在');
      return;
    }

    setSaving(true);
    try {
      // 转换dayjs为Date
      const configData = {
        hourlyRate: values.hourlyRate,
        annualFees: (values.annualFees || []).map((fee: any) => ({
          amount: fee.amount,
          startDate: fee.startDate.toDate(),
          endDate: fee.endDate ? fee.endDate.toDate() : undefined
        }))
      };

      const result = await updateMembershipFeeConfig(configData, user.id);
      if (result.success) {
        message.success('会员费配置已更新');
      } else {
        message.error(result.error || '保存失败');
      }
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    const defaultConfig = getDefaultMembershipFeeConfig();
    const formValues = {
      hourlyRate: defaultConfig.hourlyRate,
      annualFees: defaultConfig.annualFees.map(fee => ({
        ...fee,
        startDate: dayjs(fee.startDate),
        endDate: fee.endDate ? dayjs(fee.endDate) : null
      }))
    };
    form.setFieldsValue(formValues);
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
            <Title level={4}>会员费配置管理</Title>
            <Text type="secondary">配置会员每小时驻店时长扣除积分和每年年费扣除积分</Text>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
          >
            {/* 每小时时长扣除积分 */}
            <Card type="inner" title="驻店时长费用" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="每小时扣除积分"
                    name="hourlyRate"
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
              </Row>
            </Card>

            {/* 年费配置（按日期范围） */}
            <Card type="inner" title="年费配置（按日期范围）" style={{ marginBottom: 16 }}>
              <Form.List name="annualFees">
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

export default MembershipFeeConfigPage;

