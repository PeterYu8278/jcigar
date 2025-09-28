// 注册页面
import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, Space, message } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '../../services/firebase/auth'
import { useTranslation } from 'react-i18next'

const { Title, Text } = Typography

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const onFinish = async (values: { 
    email?: string; 
    password: string; 
    confirmPassword: string;
    displayName: string;
    phone: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      const result = await registerUser(values.email || '', values.password, values.displayName, values.phone)
      if (result.success) {
        message.success('注册成功！请登录')
        navigate('/login')
      } else {
        message.error((result as any).error?.message || '注册失败')
      }
    } catch (error) {
      message.error('注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
    }}>
      <Card style={{ 
        width: 400, 
        background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.9) 0%, rgba(45, 45, 45, 0.8) 100%)',
        border: '1px solid rgba(255, 215, 0, 0.2)',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(255, 215, 0, 0.1)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        zIndex: 1
      }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', paddingTop: '20px' }}>
            <Title level={2} style={{ 
              marginBottom: 8,
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 700,
              letterSpacing: '2px'
            }}>
              Gentleman Club
            </Title>
            <Text style={{ color: '#c0c0c0', fontSize: '16px' }}>
              创建您的账户，加入Gentleman Club社区
            </Text>
          </div>

          <Form
            name="register"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
            style={{ padding: '0 20px' }}
          >
            <Form.Item
              name="displayName"
              rules={[{ required: true, message: '请输入您的姓名!' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#ffd700' }} />}
                placeholder="姓名"
                style={{
                  background: 'rgba(45, 45, 45, 0.8)',
                  border: '1px solid #444444',
                  borderRadius: '8px',
                  color: '#f8f8f8'
                }}
              />
            </Form.Item>

            <Form.Item
              name="phone"
              rules={[
                { required: true, message: '请输入手机号码!' },
                { pattern: /^\+?\d{7,15}$/, message: '请输入有效的手机号(7-15位数字，可含+)' }
              ]}
              getValueFromEvent={(e) => e.target.value.replace(/[^\d+]/g, '')}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#ffd700' }} />}
                placeholder="手机号码"
                style={{
                  background: 'rgba(45, 45, 45, 0.8)',
                  border: '1px solid #444444',
                  borderRadius: '8px',
                  color: '#f8f8f8'
                }}
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { type: 'email', message: '请输入有效的邮箱地址!' }
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#ffd700' }} />}
                placeholder="邮箱地址（选填）"
                style={{
                  background: 'rgba(45, 45, 45, 0.8)',
                  border: '1px solid #444444',
                  borderRadius: '8px',
                  color: '#f8f8f8'
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码!' },
                { min: 6, message: '密码至少6位!' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#ffd700' }} />}
                placeholder={t('auth.password')}
                style={{
                  background: 'rgba(45, 45, 45, 0.8)',
                  border: '1px solid #444444',
                  borderRadius: '8px',
                  color: '#f8f8f8'
                }}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              rules={[{ required: true, message: t('auth.confirmPasswordRequired') }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#ffd700' }} />}
                placeholder={t('auth.confirmPassword')}
                style={{
                  background: 'rgba(45, 45, 45, 0.8)',
                  border: '1px solid #444444',
                  borderRadius: '8px',
                  color: '#f8f8f8'
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: '24px' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{ 
                  width: '100%',
                  height: '48px',
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#221c10',
                  fontSize: '16px',
                  fontWeight: 600,
                  boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)'
                }}
              >
                {t('auth.register')}
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', paddingBottom: '20px' }}>
            <Text style={{ color: '#999999' }}>
              已有账户？{' '}
              <Button 
                type="link" 
                onClick={() => navigate('/login')}
                style={{
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 700,
                  padding: 0
                }}
              >
                立即登录
              </Button>
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default Register
