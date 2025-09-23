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
              雪茄客
            </Title>
            <Text type="secondary">创建您的账户，加入雪茄客社区</Text>
          </div>

          <Form
            name="register"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="displayName"
              rules={[{ required: true, message: '请输入您的姓名!' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="姓名"
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
                prefix={<UserOutlined />}
                placeholder="手机号码"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { type: 'email', message: '请输入有效的邮箱地址!' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="邮箱地址（选填）"
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
                prefix={<LockOutlined />}
                placeholder="密码"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              rules={[{ required: true, message: '请确认密码!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="确认密码"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{ width: '100%' }}
              >
                注册
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              已有账户？{' '}
              <Button type="link" onClick={() => navigate('/login')}>
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
