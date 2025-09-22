// 登录页面
import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, Space, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { loginUser } from '../../services/firebase/auth'
import { useAuthStore } from '../../store/modules/auth'

const { Title, Text } = Typography

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useAuthStore()

  const from = location.state?.from?.pathname || '/'

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const result = await loginUser(values.email, values.password)
      if (result.success) {
        message.success('登录成功！')
        navigate(from, { replace: true })
      } else {
        message.error((result as any).error?.message || '登录失败')
      }
    } catch (error) {
      message.error('登录失败，请重试')
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
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2d2d2d 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 20%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(255, 215, 0, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.03) 0%, transparent 70%)
        `,
        pointerEvents: 'none'
      }} />
      
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
              background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 700,
              letterSpacing: '2px'
            }}>
              雪茄客
            </Title>
            <Text style={{ color: '#c0c0c0', fontSize: '16px' }}>
              欢迎回来，请登录您的账户
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
                { required: true, message: '请输入邮箱地址!' },
                { type: 'email', message: '请输入有效的邮箱地址!' }
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#ffd700' }} />}
                placeholder="邮箱地址"
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
              rules={[{ required: true, message: '请输入密码!' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#ffd700' }} />}
                placeholder="密码"
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
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#0a0a0a',
                  fontSize: '16px',
                  fontWeight: 600,
                  boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)'
                }}
                className="login-button"
              >
                登录
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', paddingBottom: '20px' }}>
            <Text style={{ color: '#999999' }}>
              还没有账户？{' '}
              <Button 
                type="link" 
                onClick={() => navigate('/register')}
                style={{
                  color: '#ffd700',
                  fontWeight: 600,
                  padding: 0
                }}
              >
                立即注册
              </Button>
            </Text>
          </div>
        </Space>
      </Card>
      
    </div>
  )
}

export default Login
