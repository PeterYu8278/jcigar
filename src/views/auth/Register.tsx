// 注册页面
import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, Space, message } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '../../services/firebase/auth'

const { Title, Text } = Typography

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values: { 
    email?: string; 
    password: string; 
    confirmPassword: string;
    displayName: string;
    phone: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const result = await registerUser(values.email || '', values.password, values.displayName, values.phone)
      if (result.success) {
        message.success('Registration successful! Please log in')
        navigate('/login')
      } else {
        message.error((result as any).error?.message || 'Registration failed')
      }
    } catch (error) {
      message.error('Registration failed, please try again')
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>
              Gentleman Club
            </Title>
            <Text type="secondary">Create your account and join the Gentleman Club community</Text>
          </div>

          <Form
            name="register"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="displayName"
              rules={[{ required: true, message: 'Please enter your name!' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Full Name"
              />
            </Form.Item>

            <Form.Item
              name="phone"
              rules={[
                { required: true, message: 'Please enter phone number!' },
                { pattern: /^\+?\d{7,15}$/, message: 'Please enter a valid phone number (7-15 digits, + allowed)' }
              ]}
              getValueFromEvent={(e) => e.target.value.replace(/[^\d+]/g, '')}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Phone Number"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { type: 'email', message: 'Please enter a valid email address!' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Email Address (Optional)"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please enter password!' },
                { min: 6, message: 'Password must be at least 6 characters!' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              rules={[{ required: true, message: 'Please confirm password!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm Password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{ width: '100%' }}
              >
                Register
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              Already have an account?{' '}
              <Button type="link" onClick={() => navigate('/login')}>
                Login Now
              </Button>
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default Register
