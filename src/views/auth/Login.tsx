// 登录页面
import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Typography, Space, message, Divider } from 'antd'
import { UserOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { loginWithEmailOrPhone, loginWithGoogle, handleGoogleRedirectResult } from '../../services/firebase/auth'
import { useAuthStore } from '../../store/modules/auth'
import { useTranslation } from 'react-i18next'
import { identifyInputType, normalizePhoneNumber, isValidEmail } from '../../utils/phoneNormalization'

const { Title, Text } = Typography

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useAuthStore()
  const { t } = useTranslation()

  const from = location.state?.from?.pathname || '/'

  // 检查 Google 重定向登录结果
  useEffect(() => {
    console.log('🔵 [Login.tsx] useEffect: 检查重定向结果');
    const checkRedirectResult = async () => {
      console.log('🔵 [Login.tsx] checkRedirectResult 开始');
      setLoading(true)
      try {
        console.log('🔵 [Login.tsx] 调用 handleGoogleRedirectResult');
        const result = await handleGoogleRedirectResult()
        console.log('🔵 [Login.tsx] handleGoogleRedirectResult 返回:', result);
        
        if (result.success) {
          console.log('✅ [Login.tsx] 重定向登录成功');
          if (result.needsProfile) {
            console.log('📝 [Login.tsx] 需要完善信息');
            message.info('请完善您的账户信息')
            navigate('/auth/complete-profile', { replace: true })
          } else {
            console.log('🎉 [Login.tsx] 信息已完善，跳转到:', from);
            message.success(t('auth.loginSuccess'))
            navigate(from, { replace: true })
          }
        } else if (!result.noResult) {
          console.error('❌ [Login.tsx] 重定向登录失败:', result.error);
          // 有错误但不是 noResult
          message.error(result.error?.message || t('auth.loginFailed'))
        } else {
          console.log('⚪ [Login.tsx] 无重定向结果（正常情况）');
        }
      } catch (error) {
        console.error('💥 [Login.tsx] checkRedirectResult 捕获异常:', error)
      } finally {
        console.log('🔵 [Login.tsx] checkRedirectResult 结束');
        setLoading(false)
      }
    }
    
    checkRedirectResult()
  }, [navigate, from, t])

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
    console.log('🔵 [Login.tsx] onGoogle 开始执行')
    setLoading(true)
    try {
      console.log('🔵 [Login.tsx] 调用 loginWithGoogle()')
      const res = await loginWithGoogle()
      console.log('🔵 [Login.tsx] loginWithGoogle 返回结果:', res)
      
      if (res.success) {
        console.log('✅ [Login.tsx] 登录成功')
        // 检查是否正在重定向
        if ((res as any).isRedirecting) {
          console.log('🔄 [Login.tsx] 正在重定向到 Google')
          // 重定向中，页面即将刷新，保持 loading 状态
          message.loading('正在跳转到 Google 登录...', 0)
          return
        }
        
        // 检查是否需要完善信息
        if ((res as any).needsProfile) {
          console.log('📝 [Login.tsx] 需要完善信息，跳转到 complete-profile')
          message.info('请完善您的账户信息')
          navigate('/auth/complete-profile', { replace: true })
        } else {
          console.log('🎉 [Login.tsx] 用户已完善信息，跳转到:', from)
        message.success(t('auth.loginSuccess'))
        navigate(from, { replace: true })
        }
      } else {
        console.error('❌ [Login.tsx] 登录失败:', (res as any).error)
        message.error((res as any).error?.message || t('auth.loginFailed'))
        setLoading(false)
      }
    } catch (error) {
      console.error('💥 [Login.tsx] Google login 捕获异常:', error)
      message.error(t('auth.loginFailed'))
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
      {/* 背景装饰 */}
     
      
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
                { required: true, message: '请输入邮箱或手机号' },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve()
                    
                    // 检查中文字符
                    if (/[\u4e00-\u9fa5]/.test(value)) {
                      return Promise.reject(new Error('不允许输入中文字符'))
                    }
                    
                    const type = identifyInputType(value)
                    
                    if (type === 'unknown') {
                      return Promise.reject(new Error('请输入有效的邮箱或手机号'))
                    }
                    
                    // 邮箱验证：必须包含 @ 和 .
                    if (type === 'email') {
                      if (!isValidEmail(value)) {
                        return Promise.reject(new Error('邮箱格式无效'))
                  }
                }
                    
                    // 手机号额外验证标准化
                    if (type === 'phone') {
                      const normalized = normalizePhoneNumber(value)
                      if (!normalized) {
                        return Promise.reject(new Error('手机号格式无效（需10-15位数字）'))
                      }
                    }
                    
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#ffd700' }} />}
                placeholder="邮箱 / 手机号 (例: admin@example.com 或 01157288278)"
                onInput={(e) => {
                  const input = e.currentTarget
                  // 禁止输入中文字符
                  input.value = input.value.replace(/[\u4e00-\u9fa5]/g, '')
                  // 如果不是邮箱（不含@），自动清理空格
                  if (!input.value.includes('@')) {
                    input.value = input.value.replace(/\s/g, '')
                  }
                }}
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
