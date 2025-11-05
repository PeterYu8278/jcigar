// Google 登录后完善用户信息页面
import React, { useState, useEffect, useRef } from 'react'
import { Form, Input, Button, Card, Typography, Space, App, Spin } from 'antd'
import { UserOutlined, LockOutlined, PhoneOutlined, LoadingOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { normalizePhoneNumber } from '../../utils/phoneNormalization'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db, auth } from '../../config/firebase'

const { Title, Text } = Typography

const CompleteProfile: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [form] = Form.useForm()
  
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { message } = App.useApp() // ✅ 使用 App.useApp() 获取 message 实例
  
  // 获取用户原本想访问的页面
  const from = location.state?.from?.pathname || '/'
  
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

  // 如果用户未登录或已完善信息，重定向
  useEffect(() => {
    const checkAndSetup = async () => {
      // 等待 Firebase Auth 状态同步（最多 2 秒）
      let currentUser = auth.currentUser;
      let attempts = 0;
      const maxAttempts = 4;
      
      while (!currentUser && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        currentUser = auth.currentUser;
        attempts++;
      }
      
      if (!currentUser) {
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
        
        // 检查完整资料：名字、电邮、手机号
        const isProfileComplete = userData?.displayName && userData?.email && userData?.profile?.phone
        if (isProfileComplete) {
          // 用户已完善信息，重定向到原页面或首页
          navigate(from, { replace: true })
        }
      }
      
      checkUserProfile()
    }
    
    checkAndSetup()
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
      // 标准化手机号
      const normalizedPhone = normalizePhoneNumber(values.phone)
      
      if (!normalizedPhone) {
        setLoading(false)
        return
      }

      // 调用完善用户信息的服务函数
      const { completeGoogleUserProfile } = await import('../../services/firebase/auth')
      const result = await completeGoogleUserProfile(
        currentUser.uid,
        values.displayName,
        normalizedPhone,
        values.password
      )

      if (result.success) {
        message.success('账户信息已完善，欢迎加入 Gentleman Club！')
        navigate(from, { replace: true })
      } else {
        message.error((result as any).error?.message || '信息保存失败，请重试')
      }
    } catch (error) {
      console.error('Complete profile error:', error)
      message.error('信息保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          padding: '0 25px',
          position: 'relative',
          boxSizing: 'border-box',
          transform: `translateY(${pullDistance}px)`,
          transition: isRefreshing ? 'transform 0.3s ease' : pullDistance > 0 ? 'none' : 'transform 0.3s ease'
        }}>
      {/* 下拉刷新指示器 */}
      {pullDistance > 0 && (
        <div style={{
          position: 'absolute',
          top: `-${Math.min(pullDistance, 80)}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          color: '#ffd700',
          fontSize: '14px',
          opacity: pullDistance / 80,
          transition: 'opacity 0.2s ease'
        }}>
          <Spin 
            indicator={<LoadingOutlined style={{ fontSize: 24, color: '#ffd700' }} spin />}
            spinning={isRefreshing}
          />
          <span>{isRefreshing ? '正在刷新...' : pullDistance > 80 ? '释放刷新' : '下拉刷新'}</span>
        </div>
      )}
      
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
                    
                    // 1. 检查格式
                    const normalized = normalizePhoneNumber(value)
                    if (!normalized) {
                      return Promise.reject(new Error('手机号格式无效（需10-15位数字）'))
                    }
                    
                    // 2. 检查是否已被使用
                    try {
                      const phoneQuery = query(
                        collection(db, 'users'), 
                        where('profile.phone', '==', normalized),
                        limit(1)
                      )
                      const phoneSnap = await getDocs(phoneQuery)
                      
                      if (!phoneSnap.empty) {
                        return Promise.reject(new Error('该手机号已被其他用户使用'))
                      }
                    } catch (error) {
                      console.error('检查手机号唯一性失败:', error)
                      // 如果查询失败，允许通过（不阻止用户提交）
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

