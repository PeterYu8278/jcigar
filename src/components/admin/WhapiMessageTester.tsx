/**
 * Whapi 消息发送测试组件
 */
import React, { useState } from 'react';
import { Card, Form, Input, Button, Space, message, Typography, Divider, Tag, Switch, Radio } from 'antd';
import { SendOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { sendTextMessage, sendEventReminder, sendVipExpiryReminder, sendPasswordReset, checkWhapiHealth, formatPhoneNumber } from '../../services/whapi';
import type { SendMessageResponse } from '../../types/whapi';
import { getAppConfig } from '../../services/firebase/appConfig';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface WhapiMessageTesterProps {
  whapiConfig?: {
    apiToken?: string;
    channelId?: string;
    baseUrl?: string;
    enabled?: boolean;
  };
}

const WhapiMessageTester: React.FC<WhapiMessageTesterProps> = ({ whapiConfig }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{ success: boolean; error?: string; data?: any } | null>(null);
  const [lastResult, setLastResult] = useState<SendMessageResponse | null>(null);
  const [appName, setAppName] = useState<string>('Gentlemen Club');
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

  // 加载应用名称
  React.useEffect(() => {
    const loadAppName = async () => {
      const config = await getAppConfig();
      if (config?.appName) {
        setAppName(config.appName);
      }
    };
    loadAppName();
  }, []);

  // 检查连接状态
  const handleCheckHealth = async () => {
    setLoading(true);
    try {
      const result = await checkWhapiHealth();
      setHealthStatus(result);
      if (result.success) {
        message.success('Whapi 连接正常');
      } else {
        message.error(result.error || '连接失败');
      }
    } catch (error: any) {
      message.error('检查连接失败: ' + error.message);
      setHealthStatus({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  // 发送测试消息
  const handleSendMessage = async (values: any) => {
    setLoading(true);
    try {
      const { phone, messageType, customMessage, eventName, eventDate, eventLocation, userName, expiryDate, resetLink } = values;
      const formattedPhone = formatPhoneNumber(phone);
      let result: SendMessageResponse;

      switch (messageType) {
        case 'event_reminder':
          result = await sendEventReminder(
            formattedPhone,
            userName || '用户',
            eventName || '测试活动',
            eventDate || new Date().toLocaleString('zh-CN'),
            eventLocation || '测试地点'
          );
          break;
        case 'vip_expiry':
          result = await sendVipExpiryReminder(
            formattedPhone,
            userName || '用户',
            expiryDate || new Date().toLocaleString('zh-CN')
          );
          break;
        case 'password_reset':
          result = await sendPasswordReset(
            formattedPhone,
            userName || '用户',
            resetLink || 'https://example.com/reset-password'
          );
          break;
        case 'custom':
        default:
          result = await sendTextMessage(formattedPhone, customMessage);
          break;
      }

      setLastResult(result);
      if (result.success) {
        message.success('消息发送成功');
        form.resetFields(['customMessage', 'eventName', 'eventDate', 'eventLocation', 'expiryDate', 'resetLink']);
      } else {
        message.error('消息发送失败: ' + result.error);
      }
    } catch (error: any) {
      message.error('发送失败: ' + error.message);
      setLastResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <style>{`
        .whapi-message-type-group .ant-radio-button-wrapper {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(244, 175, 37, 0.6) !important;
          color: #f8f8f8 !important;
          transition: all 0.3s ease !important;
        }
        .whapi-message-type-group .ant-radio-button-wrapper-checked {
          background: linear-gradient(to right, #FDE08D, #C48D3A) !important;
          border-color: rgba(244, 175, 37, 0.8) !important;
          color: #111 !important;
          font-weight: 600 !important;
          box-shadow: 0 4px 14px rgba(196, 141, 58, 0.35) !important;
        }
        .whapi-message-type-group .ant-radio-button-wrapper-checked:hover {
          filter: brightness(1.05) !important;
          box-shadow: 0 6px 18px rgba(196, 141, 58, 0.45) !important;
        }
        .whapi-message-type-group .ant-radio-button-wrapper:first-child {
          border-radius: 8px 0 0 8px !important;
        }
        .whapi-message-type-group .ant-radio-button-wrapper:last-child {
          border-radius: 0 8px 8px 0 !important;
        }
        @media (max-width: 768px) {
          .whapi-message-type-group {
            display: flex !important;
            width: 100% !important;
          }
          .whapi-message-type-group .ant-radio-button-wrapper {
            flex: 1 !important;
            font-size: 12px !important;
            padding: 4px 6px !important;
            white-space: nowrap !important;
            text-align: center !important;
            min-width: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .whapi-message-type-group .ant-radio-button-wrapper:first-child {
            border-radius: 6px 0 0 6px !important;
          }
          .whapi-message-type-group .ant-radio-button-wrapper:last-child {
            border-radius: 0 6px 6px 0 !important;
          }
        }
      `}</style>
      <Card
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          border: '1px solid rgba(244, 175, 37, 0.6)',
          backdropFilter: 'blur(10px)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ color: '#f8f8f8', margin: 0, fontSize: '16px' }}>
            连接状态
          </Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleCheckHealth}
              loading={loading}
              size="small"
            >
              检查连接
            </Button>
            {healthStatus && (
              <Tag
                icon={healthStatus.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                color={healthStatus.success ? 'success' : 'error'}
              >
                {healthStatus.success ? '已连接' : '连接失败'}
              </Tag>
            )}
          </Space>
        </div>
        {healthStatus?.error && (
          <Text type="danger" style={{ fontSize: '12px' }}>
            {healthStatus.error}
          </Text>
        )}
        {!whapiConfig?.enabled && (
          <Text type="warning" style={{ fontSize: '12px' }}>
            WhatsApp 功能未启用，请在配置中启用
          </Text>
        )}
      </Card>

      <Card
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          border: '1px solid rgba(244, 175, 37, 0.6)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Title level={4} style={{ color: '#f8f8f8', marginBottom: 16, fontSize: '16px' }}>
          发送测试消息
        </Title>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSendMessage}
          initialValues={{
            messageType: 'custom',
            phone: '601157288278',
          }}
        >
          <Form.Item
            label={<span style={{ color: '#f8f8f8', fontSize: '16px' }}>接收号码</span>}
            name="phone"
            rules={[{ required: true, message: '请输入接收号码' }]}
          >
            <Input
              placeholder="例如: 60123456789 或 +60123456789"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8f8f8',
              }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: '#f8f8f8', fontSize: '16px' }}>消息类型</span>}
            name="messageType"
            rules={[{ required: true }]}
          >
            <Radio.Group
              style={{ width: '100%' }}
              optionType="button"
              buttonStyle="solid"
              size={isMobile ? 'middle' : 'large'}
              className="whapi-message-type-group"
            >
              <Radio.Button value="custom" style={isMobile ? { fontSize: '12px', padding: '4px 8px' } : {}}>自定义消息</Radio.Button>
              <Radio.Button value="event_reminder" style={isMobile ? { fontSize: '12px', padding: '4px 8px' } : {}}>活动提醒</Radio.Button>
              <Radio.Button value="vip_expiry" style={isMobile ? { fontSize: '12px', padding: '4px 8px' } : {}}>VIP到期提醒</Radio.Button>
              <Radio.Button value="password_reset" style={isMobile ? { fontSize: '12px', padding: '4px 8px' } : {}}>重置密码</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.messageType !== curr.messageType}>
            {({ getFieldValue }) => {
              const messageType = getFieldValue('messageType');
              
              if (messageType === 'custom') {
                return (
                  <Form.Item
                    label={<span style={{ color: '#f8f8f8', fontSize: '16px' }}>消息内容</span>}
                    name="customMessage"
                    rules={[{ required: true, message: '请输入消息内容' }]}
                  >
                    <TextArea
                      rows={4}
                      placeholder="输入要发送的消息内容"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#f8f8f8',
                      }}
                    />
                  </Form.Item>
                );
              }

              if (messageType === 'event_reminder') {
                return (
                  <>
                    <Form.Item
                      label={<span style={{ color: '#f8f8f8', fontSize: '16px' }}>用户名称</span>}
                      name="userName"
                    >
                      <Input
                        placeholder="用户名称"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#f8f8f8',
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      label={<span style={{ color: '#f8f8f8', fontSize: '16px' }}>活动名称</span>}
                      name="eventName"
                    >
                      <Input
                        placeholder="活动名称"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#f8f8f8',
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      label={<span style={{ color: '#f8f8f8', fontSize: '16px' }}>活动日期</span>}
                      name="eventDate"
                    >
                      <Input
                        placeholder="活动日期"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#f8f8f8',
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      label={<span style={{ color: '#f8f8f8', fontSize: '16px' }}>活动地点</span>}
                      name="eventLocation"
                    >
                      <Input
                        placeholder="活动地点"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#f8f8f8',
                        }}
                      />
                    </Form.Item>
                  </>
                );
              }

              if (messageType === 'vip_expiry') {
                return (
                  <>
                    <Form.Item
                      label={<span style={{ color: '#f8f8f8', fontSize: '16px' }}>用户名称</span>}
                      name="userName"
                    >
                      <Input
                        placeholder="用户名称"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#f8f8f8',
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      label={<span style={{ color: '#f8f8f8', fontSize: '16px' }}>到期日期</span>}
                      name="expiryDate"
                    >
                      <Input
                        placeholder="到期日期"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#f8f8f8',
                        }}
                      />
                    </Form.Item>
                  </>
                );
              }

              if (messageType === 'password_reset') {
                return (
                  <>
                    <Form.Item
                      label={<span style={{ color: '#f8f8f8', fontSize: '16px' }}>用户名称</span>}
                      name="userName"
                    >
                      <Input
                        placeholder="用户名称"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#f8f8f8',
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      label={<span style={{ color: '#f8f8f8', fontSize: '16px' }}>重置链接</span>}
                      name="resetLink"
                    >
                      <Input
                        placeholder="重置链接"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#f8f8f8',
                        }}
                      />
                    </Form.Item>
                  </>
                );
              }

              return null;
            }}
          </Form.Item>

          {/* 消息预览 */}
          <Form.Item noStyle shouldUpdate={(prev, curr) => {
            return prev.messageType !== curr.messageType ||
                   prev.customMessage !== curr.customMessage ||
                   prev.userName !== curr.userName ||
                   prev.eventName !== curr.eventName ||
                   prev.eventDate !== curr.eventDate ||
                   prev.eventLocation !== curr.eventLocation ||
                   prev.expiryDate !== curr.expiryDate ||
                   prev.resetLink !== curr.resetLink;
          }}>
            {({ getFieldValue }) => {
              const messageType = getFieldValue('messageType') || 'custom';
              const customMessage = getFieldValue('customMessage') || '';
              const userName = getFieldValue('userName') || '用户';
              const eventName = getFieldValue('eventName') || '测试活动';
              const eventDate = getFieldValue('eventDate') || new Date().toLocaleString('zh-CN');
              const eventLocation = getFieldValue('eventLocation') || '测试地点';
              const expiryDate = getFieldValue('expiryDate') || new Date().toLocaleString('zh-CN');
              const resetLink = getFieldValue('resetLink') || 'https://example.com/reset-password';

              let previewMessage = '';

              switch (messageType) {
                case 'custom':
                  previewMessage = customMessage;
                  break;
                case 'event_reminder': {
                  // 解析日期和时间
                  let dateStr = '';
                  let timeStr = '';
                  
                  try {
                    const dateObj = new Date(eventDate);
                    if (!isNaN(dateObj.getTime())) {
                      // 格式化日期：YYYY/MM/DD
                      const year = dateObj.getFullYear();
                      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                      const day = String(dateObj.getDate()).padStart(2, '0');
                      dateStr = `${year}/${month}/${day}`;
                      
                      // 格式化时间：HH:mm:ss
                      const hours = String(dateObj.getHours()).padStart(2, '0');
                      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                      const seconds = String(dateObj.getSeconds()).padStart(2, '0');
                      timeStr = `${hours}:${minutes}:${seconds}`;
                    } else {
                      // 如果无法解析，使用原始字符串
                      dateStr = eventDate;
                      timeStr = '';
                    }
                  } catch {
                    dateStr = eventDate;
                    timeStr = '';
                  }

                  previewMessage = `[${appName}] 活动温馨提醒：
您好 ${userName}，您已报名"${appName}"的"${eventName}"，期待您的参与!

日期: ${dateStr}${timeStr ? `
时间: ${timeStr}` : ''}
地点: ${eventLocation}`;
                  break;
                }
                case 'vip_expiry':
                  previewMessage = `[${appName}] VIP到期温馨提醒
您好 ${userName}，您的VIP会员资格将于 ${expiryDate} 到期。
请及时续费以继续享受会员权益。`;
                  break;
                case 'password_reset':
                  previewMessage = `[${appName}] 重置密码
您好 ${userName}，您已申请重置密码。如非本人操作，请忽略此消息。
重置链接：${resetLink} (有效期24小时)`;
                  break;
                default:
                  previewMessage = '';
              }

              if (!previewMessage) {
                return null;
              }

              return (
                <Form.Item
                  label={<span style={{ color: '#f8f8f8', fontSize: '16px' }}>消息预览</span>}
                >
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      minHeight: '60px',
                      color: '#f8f8f8',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {previewMessage}
                  </div>
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                icon={<SendOutlined />}
                htmlType="submit"
                loading={loading}
                disabled={!whapiConfig?.enabled}
                style={{
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  border: 'none',
                  color: '#000',
                }}
              >
                发送消息
              </Button>
            </div>
          </Form.Item>
        </Form>

        {lastResult && (
          <>
            <Divider style={{ margin: '16px 0', borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            <div>
            <Text style={{ color: '#f8f8f8', fontSize: '14px', fontWeight: 600 }}>发送结果：</Text>
            <div style={{ marginTop: 8 }}>
              {lastResult.success ? (
                <Tag icon={<CheckCircleOutlined />} color="success">
                  成功
                </Tag>
              ) : (
                <Tag icon={<CloseCircleOutlined />} color="error">
                  失败
                </Tag>
              )}
              {lastResult.messageId && (
                <Text style={{ color: '#c0c0c0', fontSize: '12px', marginLeft: 8 }}>
                  消息ID: {lastResult.messageId}
                </Text>
              )}
              {lastResult.error && (
                <Text type="danger" style={{ fontSize: '12px', display: 'block', marginTop: 4 }}>
                  错误: {lastResult.error}
                </Text>
              )}
            </div>
          </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default WhapiMessageTester;

