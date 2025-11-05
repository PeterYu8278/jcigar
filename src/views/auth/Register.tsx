// 注册页面
import React, { useState, useEffect, useRef } from 'react'
import { Form, Input, Button, Card, Typography, Space, message, Spin } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, LoadingOutlined, GiftOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { registerUser } from '../../services/firebase/auth'
import { useAuthStore } from '../../store/modules/auth'
import { useTranslation } from 'react-i18next'
import { getUserByMemberId } from '../../utils/memberId'

const { Title, Text } = Typography

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [form] = Form.useForm()  // ✅ 创建表单实例
  
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const { t } = useTranslation()

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

  // 自动填充 URL 中的引荐码
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref');
    if (refCode) {
      form.setFieldsValue({ referralCode: refCode.toUpperCase() });
      message.info('已自动填写引荐码');
    }
  }, [location, form]);

  const onFinish = async (values: { 
    email: string;  // ✅ 邮箱改为必填
    password: string; 
    confirmPassword: string;
    displayName: string;
    phone: string;
    referralCode?: string;  // ✅ 新增引荐码字段
  }) => {
    console.log('📝 [Register] 表单提交:', { 
      email: values.email, 
      displayName: values.displayName, 
      phone: values.phone,
      hasPassword: !!values.password,
      hasReferralCode: !!values.referralCode,
      referralCode: values.referralCode
    });
    
    // ✅ 密码匹配验证已由表单验证器处理，不需要在这里重复检查

    setLoading(true)
    try {
      const result = await registerUser(
        values.email,  // ✅ 邮箱必填，不需要 fallback
        values.password, 
        values.displayName, 
        values.phone,
        values.referralCode  // ✅ 传递引荐码
      )
      if (result.success) {
        console.log('🎉 [Register] 注册成功');
        message.success(t('auth.registerSuccess'))
        
        // ✅ 注册成功后，等待状态同步（500ms），然后导航到首页
        setTimeout(() => {
          console.log('🎯 [Register] 导航到首页');
          navigate(from, { replace: true })
        }, 500)
      } else {
        console.error('❌ [Register] 注册失败:', (result as any).error?.message);
        message.error((result as any).error?.message || t('auth.registerFailed'))
      }
    } catch (error) {
      console.error('❌ [Register] 注册异常:', error);
      message.error(t('auth.registerFailedRetry'))
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
              Gentleman Club
            </Title>
            <Text style={{ color: '#c0c0c0', fontSize: '16px' }}>
              创建您的账户，加入Gentleman Club社区
            </Text>
          </div>

          <Form
            form={form}
            name="register"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
            style={{ padding: '0 20px' }}
          >
            <Form.Item
              name="displayName"
              rules={[{ required: true, message: t('auth.nameRequired') }]}
              style={{ marginBottom: '12px' }}
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
              style={{ marginBottom: '12px' }}
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
                { required: true, message: t('auth.emailRequired') },
                { type: 'email', message: t('auth.emailInvalid') }
              ]}
              style={{ marginBottom: '12px' }}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#ffd700' }} />}
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
              rules={[
                { required: true, message: t('auth.passwordRequired') },
                { min: 6, message: t('auth.passwordMinLength') }
              ]}
              style={{ marginBottom: '12px' }}
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
              dependencies={['password']}
              rules={[
                { required: true, message: t('auth.confirmPasswordRequired') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('auth.passwordsDoNotMatch')));
                  },
                }),
              ]}
              style={{ marginBottom: '12px' }}
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

            {/* 引荐码（可选） */}
            <Form.Item
              name="referralCode"
              style={{ marginBottom: '12px' }}
              rules={[
                {
                  validator: async (_, value) => {
                    // 如果没有输入引荐码，跳过验证（可选字段）
                    if (!value || value.trim() === '') {
                      return Promise.resolve();
                    }
                    
                    // ✅ 只验证引荐码是否存在（不验证格式）
                    const normalized = value.trim().toUpperCase();
                    
                    try {
                      const result = await getUserByMemberId(normalized);
                      if (!result.success) {
                        return Promise.reject(new Error(result.error || '引荐码不存在'));
                      }
                      
                      // 验证成功
                      return Promise.resolve();
                    } catch (error) {
                      return Promise.reject(new Error('验证引荐码失败，请重试'));
                    }
                  }
                }
              ]}
              validateTrigger={['onBlur', 'onChange']}
              validateDebounce={500}
            >
              <Input
                prefix={<GiftOutlined style={{ color: '#ffd700' }} />}
                placeholder="引荐码"
                maxLength={20}
                onInput={(e) => {
                  const input = e.currentTarget;
                  // ✅ 自动转大写，允许所有字母和数字
                  input.value = input.value.toUpperCase();
                }}
                style={{
                  background: 'rgba(45, 45, 45, 0.8)',
                  border: '1px solid #444444',
                  borderRadius: '8px',
                  color: '#f8f8f8'
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: '0px' }}>
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
