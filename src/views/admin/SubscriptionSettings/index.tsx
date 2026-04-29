import React, { useState, useEffect } from 'react';
import { Card, Form, Switch, Select, DatePicker, Button, message, Spin, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { getAppConfig, updateAppConfig } from '../../../services/firebase/appConfig';
import { useAuthStore } from '../../../store/modules/auth';

const { Option } = Select;

export const SubscriptionSettings: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const config = await getAppConfig();
      if (config?.subscription) {
        form.setFieldsValue({
          isActive: config.subscription.isActive,
          plan: config.subscription.plan,
          expiryDate: config.subscription.expiryDate ? dayjs(config.subscription.expiryDate) : undefined,
        });
      } else {
        form.setFieldsValue({
          isActive: false,
          plan: 'basic',
        });
      }
    } catch (error) {
      message.error('Failed to load subscription settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    try {
      setSaving(true);
      
      const updateData = {
        subscription: {
          isActive: values.isActive,
          plan: values.plan,
          expiryDate: values.expiryDate ? values.expiryDate.toDate() : new Date(),
        }
      };

      await updateAppConfig(updateData, user?.id || 'system');
      message.success('Subscription settings updated successfully');
    } catch (error) {
      message.error('Failed to update subscription settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, color: '#f4af25' }}>
        Subscription Settings
      </h1>

      <Alert 
        message="Subscription Mode Overview"
        description={
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li><b>RM 2400/year (Basic):</b> View up to the first 50 members. Login prohibited after expiry.</li>
            <li><b>RM 4500/year (Pro):</b> View up to the first 150 members. Login prohibited after expiry.</li>
            <li><b>RM 6000/year (Premium):</b> View up to the first 300 members. Login prohibited after expiry.</li>
          </ul>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(244,175,37,0.3)' }}
      />

      <Card style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="isActive"
            label={<span style={{ color: '#fff' }}>Enable Subscription Mode</span>}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="plan"
            label={<span style={{ color: '#fff' }}>Subscription Plan</span>}
            rules={[{ required: true, message: 'Please select a plan' }]}
          >
            <Select style={{ width: '100%' }}>
              <Option value="basic">Basic - RM 2400/year (Up to 50 members)</Option>
              <Option value="pro">Pro - RM 4500/year (Up to 150 members)</Option>
              <Option value="premium">Premium - RM 6000/year (Up to 300 members)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="expiryDate"
            label={<span style={{ color: '#fff' }}>Expiry Date</span>}
            rules={[{ required: true, message: 'Please select an expiry date' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={saving}
              style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', border: 'none', fontWeight: 600 }}
            >
              Save Settings
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
export default SubscriptionSettings;
