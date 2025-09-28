// 登录页面
import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, Space, message, Divider } from 'antd'
import { UserOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { loginWithEmailOrPhone, loginWithGoogle } from '../../services/firebase/auth'
import { useAuthStore } from '../../store/modules/auth'
import { useTranslation } from 'react-i18next'

const { Title, Text } = Typography

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useAuthStore()
  const { t } = useTranslation()

  const from = location.state?.from?.pathname || '/'

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const result = await loginWithEmailOrPhone(values.email, values.password)
      if (result.success) {
        message.success(t('auth.loginSuccess'))
        navigate(from, { replace: true })
      } else {
        message.error((result as any).error?.message || t('auth.loginFailed'))
      }
    } catch (error) {
      message.error(t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  const onGoogle = async () => {
    setLoading(true)
    try {
      const res = await loginWithGoogle()
      if (res.success) {
        message.success('已使用 Google 登录')
        navigate(from, { replace: true })
      } else {
        message.error((res as any).error?.message || 'Google 登录失败')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景装饰 */}
     
      
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
              {t('auth.welcomeBack')}
            </Text>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
            style={{ padding: '0 20px' }}
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: t('auth.emailRequired') },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve()
                    const v = String(value).trim()
                    const isEmail = /.+@.+\..+/.test(v)
                    const isPhone = /^\+?\d{7,15}$/.test(v)
                    return (isEmail || isPhone) ? Promise.resolve() : Promise.reject(new Error(t('auth.emailInvalid')))
                  }
                }
              ]}
              getValueFromEvent={(e) => {
                const raw = e?.target?.value ?? ''
                // 如果不包含字母和 @，按手机号输入处理，保留数字和+
                if (!/[a-zA-Z@]/.test(raw)) {
                  return String(raw).replace(/[^\d+]/g, '')
                }
                return raw
              }}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#ffd700' }} />}
                placeholder={t('auth.email')}
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
              rules={[{ required: true, message: t('auth.passwordRequired') }]}
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
                className="login-button"
              >
                {t('auth.login')}
              </Button>
            </Form.Item>

            <Divider style={{ color: '#c0c0c0' }}>{t('common.or')}</Divider>
            <Button
              icon={<GoogleOutlined />}
              onClick={onGoogle}
              loading={loading}
              style={{ width: '100%' }}
            >
              {t('auth.loginWithGoogle')}
            </Button>
          </Form>

          <div style={{ textAlign: 'center', paddingBottom: '20px' }}>
            <Text style={{ color: '#999999' }}>
              {t('auth.noAccount')}{' '}
              <Button 
                type="link" 
                onClick={() => navigate('/register')}
                style={{
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 700,
                  padding: 0
                }}
              >
                {t('auth.registerNow')}
              </Button>
            </Text>
          </div>
        </Space>
      </Card>
      
    </div>
  )
}

export default Login
