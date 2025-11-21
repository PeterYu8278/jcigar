// Google 账户绑定页面（输入手机号）
import React, { useState, useEffect, useRef } from 'react'
import { Form, Input, Button, Card, Typography, Space, App, Spin } from 'antd'
import { PhoneOutlined, LockOutlined, LoadingOutlined, ArrowLeftOutlined, GoogleOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { normalizePhoneNumber } from '../../utils/phoneNormalization'
import { linkGoogleToPhoneAccount, getStoredGoogleData, clearStoredGoogleData } from '../../services/firebase/googleAuth'
import { useAuthStore } from '../../store/modules/auth'

const { Title, Text } = Typography

const LinkGoogle: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [form] = Form.useForm()
  
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { setUser } = useAuthStore()
  
  // 获取用户原本想访问的页面
  const from = location.state?.from?.pathname || '/'
  
  // Google 登录信息
  const [googleData, setGoogleData] = useState<{ email: string; displayName: string } | null>(null)
  
  // 下拉刷新处理
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRefreshing) return
    
    const touchY = e.touches[0].clientY
    const pullDelta = touchY - touchStartY.current
    
    if (pullDelta > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(pullDelta, 150))
      if (pullDelta > 10) {
        e.preventDefault()
      }
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(80)
      setTimeout(() => {
        window.location.reload()
      }, 300)
    } else {
      setPullDistance(0)
    }
  }

  // 检查是否有 Google 登录信息
  useEffect(() => {
    const data = getStoredGoogleData()
    if (!data || !data.email) {
      message.error('Google 登录信息已过期，请重新登录')
      navigate('/login', { replace: true })
      return
    }
    
    setGoogleData(data)
  }, [navigate])

  const onFinish = async (values: { 
    phone: string
    password: string
  }) => {
    setLoading(true)
    try {
      // 标准化手机号
      const normalizedPhone = normalizePhoneNumber(values.phone)
      
      if (!normalizedPhone) {
        message.error('手机号格式无效')
        setLoading(false)
        return
      }

      // 调用绑定服务
      const result = await linkGoogleToPhoneAccount(
        normalizedPhone,
        values.password
      )

      if (result.success && result.user) {
        message.success('Google 账户绑定成功！')
        
        // 设置用户状态
        setUser(result.user)
        
        // 跳转到目标页面
        setTimeout(() => {
          navigate(from, { replace: true })
        }, 500)
      } else if (result.needsRegistration) {
        message.warning('该手机号未注册，请先注册账户')
        navigate('/register', { state: { phone: values.phone } })
      } else {
        message.error(result.error?.message || '绑定失败，请重试')
      }
    } catch (error) {
      message.error('绑定失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 返回登录页
  const handleBack = () => {
    clearStoredGoogleData()
    navigate('/login', { replace: true })
  }

  if (!googleData) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
      }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        padding: '20px',
        position: 'relative'
      }}
    >
      {/* 下拉刷新指示器 */}
      {pullDistance > 0 && (
        <div style={{
          position: 'absolute',
          top: `${pullDistance - 40}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          transition: isRefreshing ? 'top 0.3s ease' : 'none'
        }}>
          {isRefreshing ? (
            <LoadingOutlined style={{ fontSize: '24px', color: '#ffd700' }} spin />
          ) : (
            <span style={{ color: '#ffd700', fontSize: '14px' }}>
              {pullDistance > 80 ? '释放刷新' : '下拉刷新'}
            </span>
          )}
        </div>
      )}

      <Card style={{
        width: '100%',
        maxWidth: '500px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        background: 'rgba(45, 45, 45, 0.95)',
        border: '1px solid rgba(255, 215, 0, 0.2)',
        backdropFilter: 'blur(10px)'
      }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 返回按钮 */}
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            style={{
              color: '#ffd700',
              padding: 0
            }}
          >
            返回登录
          </Button>

          {/* Logo and Title */}
          <div style={{ textAlign: 'center' }}>
            <GoogleOutlined style={{ fontSize: '48px', color: '#ffd700', marginBottom: '16px' }} />
            <Title level={2} style={{
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 700,
              margin: '0 0 8px 0'
            }}>
              绑定 Google 账户
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              请输入您的手机号以绑定 Google 账户
            </Text>
          </div>

          {/* Google 账户信息 */}
          <div style={{
            padding: '16px',
            background: 'rgba(255, 215, 0, 0.1)',
            border: '1px solid rgba(255, 215, 0, 0.2)',
            borderRadius: '8px'
          }}>
            <Text style={{ color: '#ffd700', fontWeight: 600 }}>Google 账户</Text>
            <div style={{ marginTop: '8px' }}>
              <Text style={{ color: '#fff' }}>{googleData.displayName}</Text>
              <br />
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                {googleData.email}
              </Text>
            </div>
          </div>

          {/* 表单 */}
          <Form
            form={form}
            name="link_google"
            onFinish={onFinish}
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              name="phone"
              rules={[
                { required: true, message: '请输入手机号' },
                { 
                  pattern: /^((\+?60[1-9]\d{8,9})|(0[1-9]\d{8,9}))$/, 
                  message: '手机号格式无效（需10-12位数字）' 
                },
                {
                  validator: async (_, value) => {
                    if (!value) return Promise.resolve()
                    
                    const normalized = normalizePhoneNumber(value)
                    if (!normalized) {
                      return Promise.reject(new Error('手机号格式无效'))
                    }
                    
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <Input
                prefix={<PhoneOutlined style={{ color: '#ffd700' }} />}
                placeholder="手机号 (例: 0123456789)"
                onInput={(e) => {
                  const input = e.currentTarget
                  input.value = input.value.replace(/[^\d+\s-]/g, '')
                }}
                style={{
                  background: 'rgba(45, 45, 45, 0.8)',
                  border: '1px solid #444444',
                  borderRadius: '8px',
                  color: '#f8f8f8',
                  height: '48px'
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6位' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#ffd700' }} />}
                placeholder="密码（至少6位）"
                style={{
                  background: 'rgba(45, 45, 45, 0.8)',
                  border: '1px solid #444444',
                  borderRadius: '8px',
                  color: '#f8f8f8',
                  height: '48px'
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: '8px' }}>
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
                绑定账户
              </Button>
            </Form.Item>
          </Form>

          {/* 提示信息 */}
          <div style={{
            padding: '12px',
            background: 'rgba(255, 215, 0, 0.05)',
            border: '1px solid rgba(255, 215, 0, 0.1)',
            borderRadius: '8px'
          }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
              💡 提示：
              <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                <li>如果您的手机号已注册，Google 邮箱将绑定到该账户</li>
                <li>如果您的手机号未注册，请先注册账户</li>
                <li>密码将用于日后登录（邮箱+密码 或 手机号+密码）</li>
              </ul>
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default LinkGoogle

