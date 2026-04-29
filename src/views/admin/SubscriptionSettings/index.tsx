import React, { useState, useEffect } from 'react';
import { Card, Form, Switch, Select, DatePicker, Button, message, Spin, Alert, Tabs, Input, InputNumber, Space, Table, Tag } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { getAppConfig, updateAppConfig } from '../../../services/firebase/appConfig';
import { useAuthStore } from '../../../store/modules/auth';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { GLOBAL_COLLECTIONS } from '../../../config/globalCollections';
import type { AppConfig, SubscriptionRequest } from '../../../types';

const { Option } = Select;
const { TabPane } = Tabs;

export const SubscriptionSettings: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    loadConfig();
    loadRequests();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const config = await getAppConfig();
      if (config) {
        setAppConfig(config);
        
        // Default plans if none exist
        const defaultPlans = config.subscription?.plans || [
          { id: 'basic', name: 'Basic', fee: 2400, maxMembers: 50, validPeriodMonth: 12 },
          { id: 'pro', name: 'Pro', fee: 4500, maxMembers: 150, validPeriodMonth: 12 },
          { id: 'premium', name: 'Premium', fee: 6000, maxMembers: 300, validPeriodMonth: 12 }
        ];

        form.setFieldsValue({
          isActive: config.subscription?.isActive || false,
          planId: config.subscription?.planId || config.subscription?.plan || 'basic',
          plans: defaultPlans
        });
      }
    } catch (error) {
      message.error('Failed to load subscription settings');
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      setLoadingRequests(true);
      const q = query(collection(db, GLOBAL_COLLECTIONS.SUBSCRIPTION_REQUESTS), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data: SubscriptionRequest[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as SubscriptionRequest);
      });
      setRequests(data);
    } catch (error) {
      console.error('Failed to load subscription requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSaveConfig = async (values: any) => {
    try {
      setSaving(true);
      
      const updateData: any = {
        subscription: {
          ...appConfig?.subscription,
          isActive: values.isActive,
          planId: values.planId,
          plan: values.planId as 'basic' | 'pro' | 'premium', // Legacy sync
          plans: values.plans,
          expiryDate: appConfig?.subscription?.expiryDate || new Date()
        }
      };

      await updateAppConfig(updateData, user?.id || 'system');
      message.success('Subscription settings updated successfully');
      loadConfig(); // Reload to get fresh state
    } catch (error) {
      message.error('Failed to update subscription settings');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveRequest = async (request: SubscriptionRequest) => {
    try {
      setLoadingRequests(true);
      // Update AppConfig
      const plan = appConfig?.subscription?.plans?.find(p => p.id === request.planId);
      const validMonths = plan?.validPeriodMonth || 12;
      const newExpiry = dayjs().add(validMonths, 'month').toDate();

      // Update request status and save the resulting expiry date
      const requestRef = doc(db, GLOBAL_COLLECTIONS.SUBSCRIPTION_REQUESTS, request.id);
      await updateDoc(requestRef, {
        status: 'approved',
        updatedAt: new Date(),
        verifiedBy: user?.id,
        expiryDate: newExpiry
      });

      const updateData: any = {
        subscription: {
          ...appConfig?.subscription,
          isActive: true,
          planId: request.planId,
          plan: request.planId as 'basic' | 'pro' | 'premium', // Legacy sync
          expiryDate: newExpiry
        }
      };
      await updateAppConfig(updateData, user?.id || 'system');

      message.success('Subscription request approved and activated');
      loadRequests();
      loadConfig();
    } catch (error) {
      message.error('Failed to approve request');
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleRejectRequest = async (request: SubscriptionRequest) => {
    try {
      setLoadingRequests(true);
      const requestRef = doc(db, GLOBAL_COLLECTIONS.SUBSCRIPTION_REQUESTS, request.id);
      await updateDoc(requestRef, {
        status: 'rejected',
        updatedAt: new Date(),
        verifiedBy: user?.id
      });
      message.success('Subscription request rejected');
      loadRequests();
    } catch (error) {
      message.error('Failed to reject request');
    } finally {
      setLoadingRequests(false);
    }
  };

  const requestColumns = [
    {
      title: 'Requested By',
      dataIndex: 'requestedBy',
      key: 'requestedBy',
    },
    {
      title: 'Plan',
      dataIndex: 'planName',
      key: 'planName',
    },
    {
      title: 'Validity',
      dataIndex: 'validPeriodMonth',
      key: 'validPeriodMonth',
      render: (months: number) => months ? `${months} Months` : '-'
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: any) => date?.toDate ? dayjs(date.toDate()).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'orange';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (date: any) => date?.toDate ? dayjs(date.toDate()).format('YYYY-MM-DD') : (date ? dayjs(date).format('YYYY-MM-DD') : '-')
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: SubscriptionRequest) => (
        record.status === 'pending' ? (
          <Space>
            <Button type="primary" size="small" onClick={() => handleApproveRequest(record)}>Approve</Button>
            <Button danger size="small" onClick={() => handleRejectRequest(record)}>Reject</Button>
          </Space>
        ) : null
      )
    }
  ];

  if (loading && !appConfig) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px', maxWidth: 1200, margin: '0 auto', marginBottom: 100 }}>
      <h1 style={{ 
        fontSize: 'calc(20px + 1vw)', 
        fontWeight: 800, 
        marginBottom: 24, 
        backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
        WebkitBackgroundClip: 'text', 
        color: 'transparent' 
      }}>
        Subscription Management
      </h1>

      <Tabs 
        defaultActiveKey="1" 
        type="card"
        className="custom-tabs"
        style={{ color: '#fff' }}
      >
        <TabPane tab="Subscription Settings" key="1">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveConfig}
          >
            <div style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', gap: 24 }}>
              {/* Left Column: Status & Current Plan */}
              <div style={{ flex: 1 }}>
                <Card 
                  title={<span style={{ color: '#FDE08D' }}>General Status</span>}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 24 }}
                >
                  <Form.Item
                    name="isActive"
                    label={<span style={{ color: '#ccc' }}>Enable Subscription Mode</span>}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    name="planId"
                    label={<span style={{ color: '#ccc' }}>Current Active Plan</span>}
                  >
                    <Select style={{ width: '100%' }} dropdownStyle={{ background: '#1a1a1a', border: '1px solid #444' }}>
                      {appConfig?.subscription?.plans?.map((p: any) => (
                        <Option key={p.id} value={p.id}>
                          {p.name} - RM {p.fee} ({p.maxMembers} members)
                        </Option>
                      )) || (
                        <>
                          <Option value="basic">Basic</Option>
                          <Option value="pro">Pro</Option>
                          <Option value="premium">Premium</Option>
                        </>
                      )}
                    </Select>
                  </Form.Item>
                  
                  {appConfig?.subscription?.expiryDate && (() => {
                    let dateStr = '';
                    try {
                      const exp = (appConfig.subscription.expiryDate as any).toDate 
                        ? (appConfig.subscription.expiryDate as any).toDate() 
                        : new Date(appConfig.subscription.expiryDate as any);
                      if (!isNaN(exp.getTime())) {
                        dateStr = dayjs(exp).format('YYYY-MM-DD');
                      }
                    } catch (e) {
                      console.warn('Invalid expiry date in settings', e);
                    }
                    
                    if (!dateStr) return null;

                    return (
                      <div style={{ 
                        color: '#FDE08D', 
                        fontSize: '14px', 
                        padding: '12px', 
                        background: 'rgba(253,224,141,0.1)', 
                        borderRadius: 8,
                        border: '1px solid rgba(253,224,141,0.2)'
                      }}>
                        <span style={{ color: '#aaa', marginRight: 8 }}>Current Expiry:</span>
                        {dateStr}
                      </div>
                    );
                  })()}
                </Card>
              </div>
              
              {/* Right Column: Plans Configuration */}
              <div style={{ flex: 2 }}>
                <Card 
                  title={<span style={{ color: '#FDE08D' }}>Available Plans Configuration</span>}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Form.List name="plans">
                    {(fields, { add, remove }) => (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {fields.map(({ key, name, ...restField }) => (
                          <div 
                            key={key} 
                            style={{ 
                              padding: 16, 
                              background: 'rgba(255,255,255,0.03)', 
                              borderRadius: 12, 
                              border: '1px solid rgba(255,255,255,0.05)',
                              position: 'relative'
                            }}
                          >
                            <MinusCircleOutlined 
                              onClick={() => remove(name)} 
                              style={{ 
                                position: 'absolute', 
                                right: 12, 
                                top: 12, 
                                color: '#ff4d4f', 
                                fontSize: 18,
                                zIndex: 1
                              }} 
                            />
                            
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(auto-fit, minmax(120px, 1fr))', 
                              gap: '12px 16px' 
                            }}>
                              <Form.Item
                                {...restField}
                                name={[name, 'id']}
                                label={<span style={{ color: '#888', fontSize: 12 }}>ID</span>}
                                rules={[{ required: true, message: 'Missing ID' }]}
                              >
                                <Input placeholder="basic" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, 'name']}
                                label={<span style={{ color: '#888', fontSize: 12 }}>Name</span>}
                                rules={[{ required: true, message: 'Missing Name' }]}
                              >
                                <Input placeholder="Plan Name" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, 'fee']}
                                label={<span style={{ color: '#888', fontSize: 12 }}>Annual Fee</span>}
                                rules={[{ required: true, message: 'Missing Fee' }]}
                              >
                                <InputNumber placeholder="0" min={0} addonBefore="RM" style={{ width: '100%' }} />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, 'maxMembers']}
                                label={<span style={{ color: '#888', fontSize: 12 }}>Max Members</span>}
                                rules={[{ required: true, message: 'Missing Limit' }]}
                              >
                                <InputNumber placeholder="50" min={1} style={{ width: '100%' }} />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, 'validPeriodMonth']}
                                label={<span style={{ color: '#888', fontSize: 12 }}>Validity (Months)</span>}
                                rules={[{ required: true, message: 'Missing Period' }]}
                              >
                                <InputNumber placeholder="12" min={1} addonAfter="Mon" style={{ width: '100%' }} />
                              </Form.Item>
                            </div>
                          </div>
                        ))}
                        <Form.Item>
                          <Button 
                            type="dashed" 
                            onClick={() => add({ validPeriodMonth: 12 })} 
                            block 
                            icon={<PlusOutlined />} 
                            style={{ 
                              color: '#FDE08D', 
                              borderColor: 'rgba(253,224,141,0.3)', 
                              background: 'transparent',
                              height: 45,
                              borderRadius: 8
                            }}
                          >
                            Add New Plan Package
                          </Button>
                        </Form.Item>
                      </div>
                    )}
                  </Form.List>
                </Card>
              </div>
            </div>

            <div style={{ 
              marginTop: 32, 
              textAlign: 'right',
              position: window.innerWidth < 768 ? 'fixed' : 'static',
              bottom: window.innerWidth < 768 ? 80 : 'auto',
              right: window.innerWidth < 768 ? 16 : 'auto',
              left: window.innerWidth < 768 ? 16 : 'auto',
              zIndex: 10
            }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={saving}
                style={{ 
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
                  color: '#111', 
                  border: 'none', 
                  fontWeight: 800,
                  height: 45,
                  padding: '0 32px',
                  borderRadius: 22,
                  boxShadow: '0 4px 15px rgba(196,141,58,0.3)',
                  width: window.innerWidth < 768 ? '100%' : 'auto'
                }}
              >
                Save All Settings
              </Button>
            </div>
          </Form>
        </TabPane>

        <TabPane tab="Payment Records" key="2">
          <Card style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: 0 }}>
            <Table
              dataSource={requests}
              columns={requestColumns}
              rowKey="id"
              loading={loadingRequests}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 'max-content' }}
              className="custom-table"
              style={{ background: 'transparent' }}
            />
          </Card>
        </TabPane>
      </Tabs>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-tabs .ant-tabs-nav-list {
          border-bottom: none !important;
        }
        .custom-tabs .ant-tabs-tab {
          background: rgba(255,255,255,0.03) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-bottom: none !important;
          color: #888 !important;
          transition: all 0.3s;
        }
        .custom-tabs .ant-tabs-tab-active {
          background: rgba(244,175,37,0.1) !important;
          border-top: 2px solid #f4af25 !important;
        }
        .custom-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #f4af25 !important;
          font-weight: 800;
        }
        .custom-table .ant-table {
          background: transparent !important;
          color: #fff !important;
        }
        .custom-table .ant-table-thead > tr > th {
          background: rgba(255,255,255,0.05) !important;
          color: #FDE08D !important;
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
        }
        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }
        .custom-table .ant-table-tbody > tr:hover > td {
          background: rgba(255,255,255,0.02) !important;
        }
        .ant-select-selector, .ant-input, .ant-input-number {
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #fff !important;
        }
        .ant-input-number-handler-wrap {
          background: rgba(255,255,255,0.1) !important;
        }
        .ant-select-selection-item {
          color: #fff !important;
        }
        .ant-card-head {
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
        }
        .ant-table-pagination.ant-pagination {
          margin: 16px !important;
        }
        .ant-pagination-item a, .ant-pagination-item-link {
          color: #888 !important;
        }
        .ant-pagination-item-active a {
          color: #f4af25 !important;
        }
      `}} />
    </div>
  );
};
export default SubscriptionSettings;
