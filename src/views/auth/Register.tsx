// 注册页面
import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Typography, Space, message } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { registerUser } from '../../services/firebase/auth'
import { useAuthStore } from '../../store/modules/auth'
import { useTranslation } from 'react-i18next'

const { Title, Text } = Typography

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const { t } = useTranslation()

  const from = location.state?.from?.pathname || '/'

  // 如果用户已登录，根据资料完整性重定向
  useEffect(() => {
    if (user) {
      const isProfileIncomplete = !user.displayName || !user.email || !user.profile?.phone
      if (isProfileIncomplete) {
        // 资料不完整，重定向到完善资料页面
        navigate('/auth/complete-profile', { replace: true })
      } else {
        // 资料完整，重定向到首页或原页面
        navigate(from, { replace: true })
      }
    }
  }, [user, navigate, from])

  const onFinish = async (values: { 
    email?: string; 
    password: string; 
    confirmPassword: string;
    displayName: string;
    phone: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error(t('auth.passwordsDoNotMatch'))
      return
    }

    setLoading(true)
    try {
      const result = await registerUser(values.email || '', values.password, values.displayName, values.phone)
      if (result.success) {
        message.success(t('auth.registerSuccess'))
        navigate('/login')
      } else {
        message.error((result as any).error?.message || t('auth.registerFailed'))
      }
    } catch (error) {
      message.error(t('auth.registerFailedRetry'))
    } finally {
      setLoading(false)
    }
  }

  return (
      <div style={{
        width: '100%',
        padding: '0 25px',
        position: 'relative',
        boxSizing: 'border-box'
      }}>
      <Card style={{ 
        width: '100%',
        maxWidth: 400,
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
              rules={[{ required: true, message: t('auth.nameRequired') }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#ffd700' }} />}
                placeholder={t('auth.name')}
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
                { required: true, message: t('auth.phoneRequired') },
                { pattern: /^\+?\d{7,15}$/, message: t('auth.phoneInvalid') }
              ]}
              getValueFromEvent={(e) => e.target.value.replace(/[^\d+]/g, '')}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#ffd700' }} />}
                placeholder={t('auth.phone')}
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
                { type: 'email', message: t('auth.emailInvalid') }
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#ffd700' }} />}
                placeholder={t('auth.emailOptional')}
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
                { required: true, message: t('auth.passwordRequired') },
                { min: 6, message: t('auth.passwordMinLength') }
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
              {t('auth.noAccount')}{' '}
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
                {t('auth.login')}
              </Button>
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default Register
