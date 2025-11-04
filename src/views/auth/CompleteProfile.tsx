// Google 登录后完善用户信息页面
import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Typography, Space, message } from 'antd'
import { UserOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { normalizePhoneNumber } from '../../utils/phoneNormalization'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db, auth } from '../../config/firebase'

const { Title, Text } = Typography

const CompleteProfile: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { t } = useTranslation()

  // 如果用户未登录或已完善信息，重定向
  useEffect(() => {
    const currentUser = auth.currentUser
    
    if (!currentUser) {
      // 未登录，重定向到登录页
      navigate('/login', { replace: true })
      return
    }
    
    // 预填 Google 用户的显示名称
    if (currentUser.displayName) {
      form.setFieldsValue({ displayName: currentUser.displayName })
    }
    
    // 检查用户是否已有完整信息
    const checkUserProfile = async () => {
      const { getUserData } = await import('../../services/firebase/auth')
      const userData = await getUserData(currentUser.uid)
      if (userData?.profile?.phone) {
        // 用户已完善信息，重定向到首页
        navigate('/', { replace: true })
      }
    }
    
    checkUserProfile()
  }, [navigate, form])

  const onFinish = async (values: { 
    displayName: string
    phone: string
    password: string
  }) => {
    const currentUser = auth.currentUser
    
    if (!currentUser) {
      message.error('用户信息不存在，请重新登录')
      navigate('/login')
      return
    }

    setLoading(true)
    try {
      // 1. 标准化手机号
      const normalizedPhone = normalizePhoneNumber(values.phone)
      if (!normalizedPhone) {
        message.error('手机号格式无效（需10-15位数字）')
        setLoading(false)
        return
      }

      // 2. 检查手机号唯一性
      const phoneQuery = query(
        collection(db, 'users'), 
        where('profile.phone', '==', normalizedPhone),
        limit(1)
      )
      const phoneSnap = await getDocs(phoneQuery)
      if (!phoneSnap.empty) {
        message.error('该手机号已被其他用户使用')
        setLoading(false)
        return
      }

      // 3. 调用完善用户信息的服务函数
      const { completeGoogleUserProfile } = await import('../../services/firebase/auth')
      const result = await completeGoogleUserProfile(
        currentUser.uid,
        values.displayName,
        normalizedPhone,
        values.password
      )

      if (result.success) {
        message.success('账户信息已完善，欢迎加入 Gentleman Club！')
        navigate('/', { replace: true })
      } else {
        message.error(result.error?.message || '信息保存失败，请重试')
      }
    } catch (error) {
      console.error('Complete profile error:', error)
      message.error('信息保存失败，请重试')
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
              完善您的信息
            </Title>
            <Text style={{ color: '#c0c0c0', fontSize: '14px' }}>
              为了更好地为您服务，请完善以下信息
            </Text>
          </div>

          <Form
            form={form}
            name="complete-profile"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
            style={{ padding: '0 20px' }}
          >
            {/* 姓名 */}
            <Form.Item
              name="displayName"
              rules={[
                { required: true, message: '请输入您的姓名' },
                { min: 2, message: '姓名至少2个字符' }
              ]}
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

            {/* 手机号 */}
            <Form.Item
              name="phone"
              rules={[
                { required: true, message: '请输入手机号' },
                {
                  validator: async (_, value) => {
                    if (!value) return Promise.resolve()
                    
                    const normalized = normalizePhoneNumber(value)
                    if (!normalized) {
                      return Promise.reject(new Error('手机号格式无效（需10-15位数字）'))
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <Input
                prefix={<PhoneOutlined style={{ color: '#ffd700' }} />}
                placeholder="手机号 (例: 01157288278)"
                onInput={(e) => {
                  const input = e.currentTarget
                  // 只保留数字、加号和空格
                  input.value = input.value.replace(/[^\d+\s-]/g, '')
                }}
                style={{
                  background: 'rgba(45, 45, 45, 0.8)',
                  border: '1px solid #444444',
                  borderRadius: '8px',
                  color: '#f8f8f8'
                }}
              />
            </Form.Item>

            {/* 密码 */}
            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请设置密码' },
                { min: 6, message: '密码至少6位' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#ffd700' }} />}
                placeholder="设置密码（至少6位）"
                style={{
                  background: 'rgba(45, 45, 45, 0.8)',
                  border: '1px solid #444444',
                  borderRadius: '8px',
                  color: '#f8f8f8'
                }}
              />
            </Form.Item>

            {/* 提交按钮 */}
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
                完成注册
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', paddingBottom: '20px' }}>
            <Text style={{ color: '#999999', fontSize: '12px' }}>
              完善信息后，您可以使用 Google 或邮箱+密码登录
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default CompleteProfile

