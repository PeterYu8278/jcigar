// 登录页面
import React, { useState, useEffect, useRef } from 'react'
import { Form, Input, Button, Card, Typography, Space, message, Divider, Spin, Modal } from 'antd'
import { UserOutlined, LockOutlined, GoogleOutlined, LoadingOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { loginWithEmailOrPhone, loginWithGoogle, handleGoogleRedirectResult, sendPasswordResetEmailFor, resetPasswordByPhone } from '../../services/firebase/auth'
import { useAuthStore } from '../../store/modules/auth'
import { useTranslation } from 'react-i18next'
import { identifyInputType, normalizePhoneNumber, isValidEmail } from '../../utils/phoneNormalization'
import { getAppConfig } from '../../services/firebase/appConfig'
import type { AppConfig } from '../../types'

const { Title, Text } = Typography

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState<string>('')
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false)
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)
  const [resetPasswordForm] = Form.useForm()
  const touchStartY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const navigate = useNavigate()
  const location = useLocation()
  const { user, setUser } = useAuthStore()
  const { t } = useTranslation()
  const hasCheckedRedirect = useRef(false) // 防止 StrictMode 重复调用
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const lastResetPasswordTime = useRef<number | null>(null) // 记录上次发送重置密码的时间

  const from = location.state?.from?.pathname || '/'

  // 加载应用配置
  useEffect(() => {
    const loadAppConfig = async () => {
      setConfigLoading(true)
      try {
        const config = await getAppConfig()
        if (config) {
          setAppConfig(config)
        } else {
          // 如果配置加载失败，使用默认禁用状态
          setAppConfig({
            id: 'default',
            auth: {
              disableGoogleLogin: true,
              disableEmailLogin: true,
            },
          } as AppConfig)
        }
      } finally {
        setConfigLoading(false)
      }
    }
    loadAppConfig()
  }, [])
  
  // 下拉刷新处理
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRefreshing) return
    
    const touchY = e.touches[0].clientY
    const pullDelta = touchY - touchStartY.current
    
    // 只在页面顶部且向下拖动时才触发
    if (pullDelta > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(pullDelta, 150))
      // 阻止默认滚动行为
      if (pullDelta > 10) {
        e.preventDefault()
      }
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance > 80 && !isRefreshing) {
      // 触发刷新
      setIsRefreshing(true)
      setPullDistance(80)
      
      // 延迟刷新以显示动画
      setTimeout(() => {
        window.location.reload()
      }, 300)
    } else {
      // 回弹
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
        // 资料完整，重定向到首页
        navigate('/', { replace: true })
      }
    }
  }, [user, navigate])

  // 检查 Google 重定向登录结果
  useEffect(() => {
    // 防止 StrictMode 导致的重复调用
    if (hasCheckedRedirect.current) {
      return;
    }
    
    const checkRedirectResult = async () => {
      hasCheckedRedirect.current = true;
      setLoading(true)
      try {
        const result = await handleGoogleRedirectResult()
        
        if (result.success) {
          if ((result as any).needsProfile) {
            message.info('请完善您的账户信息')
            navigate('/auth/complete-profile', { replace: true })
          } else {
            message.success(t('auth.loginSuccess'))
            navigate('/', { replace: true })
          }
        } else if (!result.noResult) {
          message.error(result.error?.message || t('auth.loginFailed'))
        }
      } catch (error) {
      } finally {
        setLoading(false)
      }
    }
    
    checkRedirectResult()
  }, [navigate, t])

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    setLoginError('') // 清除之前的错误
    try {
      const result = await loginWithEmailOrPhone(values.email, values.password)
      if (result.success) {
        message.success(t('auth.loginSuccess'))
        navigate('/', { replace: true })
      } else {
        // 使用 placeholder 显示错误
        setLoginError('登入失败：' + ((result as any).error?.message || t('auth.loginFailed')))
      }
    } catch (error) {
      setLoginError('登入失败：' + t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  const onGoogle = async () => {
    setLoading(true)
    setLoginError('') // 清除之前的错误
    try {
      const res = await loginWithGoogle()
      
      if (res.success) {
        // 检查是否正在重定向
        if ((res as any).isRedirecting) {
          // 重定向中，页面即将刷新，保持 loading 状态
          message.loading('正在跳转到 Google 登录...', 0)
          return
        }
        
        // 检查是否需要完善信息
        if ((res as any).needsProfile) {
          message.info('请完善您的账户信息')
          navigate('/auth/complete-profile', { replace: true })
        } else {
          message.success(t('auth.loginSuccess'))
          navigate('/', { replace: true })
        }
      } else {
        // 使用 placeholder 显示错误
        setLoginError('登入失败：' + ((res as any).error?.message || t('auth.loginFailed')))
        setLoading(false)
      }
    } catch (error) {
      setLoginError('登入失败：' + t('auth.loginFailed'))
      setLoading(false)
    }
  }

  const handleResetPassword = async (values: { identifier: string }) => {
    // 检查是否距离上次发送不足1分钟
    const now = Date.now()
    if (lastResetPasswordTime.current !== null) {
      const timeSinceLastSend = now - lastResetPasswordTime.current
      const oneMinute = 60 * 1000 // 1分钟 = 60000毫秒
      
      if (timeSinceLastSend < oneMinute) {
        const remainingSeconds = Math.ceil((oneMinute - timeSinceLastSend) / 1000)
        message.warning(`请等待 ${remainingSeconds} 秒后再试`)
        return
      }
    }
    
    setResetPasswordLoading(true)
    try {
      const identifier = values.identifier.trim()
      
      // 如果禁用了邮箱和 Google 登录，只处理手机号重置
      if (appConfig?.auth?.disableEmailLogin && appConfig?.auth?.disableGoogleLogin) {
        const result = await resetPasswordByPhone(identifier)
        if (result.success) {
          lastResetPasswordTime.current = Date.now() // 记录发送时间
          message.success('密码已重置，临时密码已发送到您的手机')
          setResetPasswordVisible(false)
          resetPasswordForm.resetFields()
        } else {
          message.error(result.error || '重置密码失败')
        }
        return
      }
      
      // 否则根据输入类型处理
      const type = identifyInputType(identifier)
      
      if (type === 'email') {
        // 邮箱重置：发送重置链接
        const result = await sendPasswordResetEmailFor(identifier)
        if (result.success) {
          lastResetPasswordTime.current = Date.now() // 记录发送时间
          message.success('重置密码邮件已发送，请查收您的邮箱')
          setResetPasswordVisible(false)
          resetPasswordForm.resetFields()
        } else {
          message.error(result.error?.message || '发送重置密码邮件失败')
        }
      } else if (type === 'phone') {
        // 手机号重置：生成临时密码并通过 whapi 发送
        const result = await resetPasswordByPhone(identifier)
        if (result.success) {
          lastResetPasswordTime.current = Date.now() // 记录发送时间
          message.success('密码已重置，临时密码已发送到您的手机')
          setResetPasswordVisible(false)
          resetPasswordForm.resetFields()
        } else {
          message.error(result.error || '重置密码失败')
        }
      } else {
        message.error('请输入有效的邮箱地址或手机号')
      }
    } catch (error: any) {
      message.error(error.message || '重置密码失败')
    } finally {
      setResetPasswordLoading(false)
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
        {configLoading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '300px',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <Spin 
              indicator={<LoadingOutlined style={{ fontSize: 32, color: '#ffd700' }} spin />}
              size="large"
            />
            <Text style={{ color: '#c0c0c0' }}>加载中...</Text>
          </div>
        ) : (
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
              {appConfig?.appName || 'Gentlemen Club'}
            </Title>
            <Text style={{ color: '#c0c0c0', fontSize: '16px' }}>
              {t('auth.welcomeBack')}
            </Text>
          </div>

          {/* 显示登录表单（即使禁用电邮登录，仍允许手机号登录） */}
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
                { required: true, message: appConfig?.auth?.disableEmailLogin ? '请输入手机号' : '请输入邮箱或手机号' },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve()
                    
                    // 检查中文字符
                    if (/[\u4e00-\u9fa5]/.test(value)) {
                      return Promise.reject(new Error('不允许输入中文字符'))
                    }
                    
                    const type = identifyInputType(value)
                    
                    if (type === 'unknown') {
                      return Promise.reject(new Error(appConfig?.auth?.disableEmailLogin ? '请输入有效的手机号' : '请输入有效的邮箱或手机号'))
                    }
                    
                    // 如果禁用了电邮登录，不允许使用邮箱
                    if (appConfig?.auth?.disableEmailLogin && type === 'email') {
                      return Promise.reject(new Error('请输入有效的手机号'))
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
                  prefix={<UserOutlined style={{ color: loginError ? '#ff4d4f' : '#ffd700' }} />}
                  placeholder={loginError || (appConfig?.auth?.disableEmailLogin ? "手机号 (例: 0123456789)" : "邮箱 / 手机号 (例: admin@example.com 或 0123456789)")}
                  onInput={(e) => {
                    const input = e.currentTarget
                    // 清除错误状态
                    if (loginError) setLoginError('')
                    
                    // 如果禁用了电邮登录，只允许输入数字
                    if (appConfig?.auth?.disableEmailLogin) {
                      input.value = input.value.replace(/\D/g, '')
                    } else {
                      // 禁止输入中文字符
                      input.value = input.value.replace(/[\u4e00-\u9fa5]/g, '')
                      // 如果不是邮箱（不含@），自动清理空格
                      if (!input.value.includes('@')) {
                        input.value = input.value.replace(/\s/g, '')
                      }
                    }
                  }}
                  onKeyPress={(e) => {
                    // 如果禁用了电邮登录，只允许输入数字
                    if (appConfig?.auth?.disableEmailLogin) {
                      const char = String.fromCharCode(e.which || e.keyCode)
                      if (!/[0-9]/.test(char)) {
                        e.preventDefault()
                      }
                    }
                  }}
                  onPaste={(e) => {
                    // 如果禁用了电邮登录，只允许粘贴数字
                    if (appConfig?.auth?.disableEmailLogin) {
                      e.preventDefault()
                      const paste = (e.clipboardData || (window as any).clipboardData).getData('text')
                      const numbersOnly = paste.replace(/\D/g, '')
                      const input = e.currentTarget as HTMLInputElement
                      const start = input.selectionStart || 0
                      const end = input.selectionEnd || 0
                      const currentValue = input.value
                      input.value = currentValue.substring(0, start) + numbersOnly + currentValue.substring(end)
                      input.setSelectionRange(start + numbersOnly.length, start + numbersOnly.length)
                    }
                  }}
                  onFocus={() => {
                    // 获得焦点时清除错误
                    if (loginError) setLoginError('')
                  }}
                  style={{
                    background: 'rgba(45, 45, 45, 0.8)',
                    border: loginError ? '1px solid #ff4d4f' : '1px solid #444444',
                    borderRadius: '8px',
                    color: '#f8f8f8'
                  }}
                  className={loginError ? 'login-error-shake' : ''}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: t('auth.passwordRequired') }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: loginError ? '#ff4d4f' : '#ffd700' }} />}
                  placeholder={t('auth.password')}
                  iconRender={(visible) => 
                    visible ? (
                      <EyeOutlined style={{ color: '#ffd700' }} />
                    ) : (
                      <EyeInvisibleOutlined style={{ color: '#ffd700' }} />
                    )
                  }
                  onInput={() => {
                    // 清除错误状态
                    if (loginError) setLoginError('')
                  }}
                  onFocus={() => {
                    // 获得焦点时清除错误
                    if (loginError) setLoginError('')
                  }}
                  style={{
                    background: 'rgba(45, 45, 45, 0.8)',
                    border: loginError ? '1px solid #ff4d4f' : '1px solid #444444',
                    borderRadius: '8px',
                    color: '#f8f8f8'
                  }}
                  className={loginError ? 'login-error-shake' : ''}
                />
              </Form.Item>

              <Form.Item style={{textAlign: 'right' }}>
                <Button
                  type="link"
                  onClick={() => setResetPasswordVisible(true)}
                  style={{
                    padding: 0,
                    height: 'auto',
                    color: '#ffd700',
                    fontSize: '14px'
                  }}
                >
                  {t('auth.resetPassword')}
                </Button>
              </Form.Item>

              <Form.Item>
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
            </Form>

          {/* 如果 Google 登录未被禁用，显示 Google 登录按钮 */}
          {!appConfig?.auth?.disableGoogleLogin && (
            <div style={{ padding: '0 20px' }}>
              <Button
                icon={<GoogleOutlined />}
                onClick={onGoogle}
                loading={loading}
                style={{ 
                  width: '100%',
                  height: '48px',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#221c10',
                  fontSize: '16px',
                  fontWeight: 600,
                  boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {t('auth.loginWithGoogle')}
              </Button>
            </div>
          )}


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
        )}
      </Card>

      {/* 重置密码 Modal */}
      <Modal
        title={
          <span style={{
            background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 700
          }}>
            {t('auth.resetPassword')}
          </span>
        }
        open={resetPasswordVisible}
        onCancel={() => {
          setResetPasswordVisible(false)
          resetPasswordForm.resetFields()
        }}
        footer={null}
        width={400}
        centered
        styles={{
          content: {
            background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(45, 45, 45, 0.9) 100%)',
            border: '1px solid rgba(255, 215, 0, 0.2)',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)'
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
            padding: '16px 24px'
          }
        }}
      >
        <Form
          form={resetPasswordForm}
          layout="vertical"
          onFinish={handleResetPassword}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="identifier"
            label={<span style={{ color: '#c0c0c0' }}>
              {appConfig?.auth?.disableEmailLogin && appConfig?.auth?.disableGoogleLogin 
                ? '手机号' 
                : '邮箱地址或手机号'}
            </span>}
            rules={[
              { required: true, message: appConfig?.auth?.disableEmailLogin && appConfig?.auth?.disableGoogleLogin 
                ? '请输入手机号' 
                : '请输入邮箱地址或手机号' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve()
                  
                  // 如果禁用了邮箱和 Google 登录，只验证手机号
                  if (appConfig?.auth?.disableEmailLogin && appConfig?.auth?.disableGoogleLogin) {
                    const normalized = normalizePhoneNumber(value)
                    if (!normalized) {
                      return Promise.reject(new Error('手机号格式无效'))
                    }
                    return Promise.resolve()
                  }
                  
                  // 否则验证邮箱或手机号
                  const type = identifyInputType(value)
                  if (type === 'unknown') {
                    return Promise.reject(new Error('请输入有效的邮箱地址或手机号'))
                  }
                  
                  if (type === 'email') {
                    if (!isValidEmail(value)) {
                      return Promise.reject(new Error('邮箱格式无效'))
                    }
                  }
                  
                  if (type === 'phone') {
                    const normalized = normalizePhoneNumber(value)
                    if (!normalized) {
                      return Promise.reject(new Error('手机号格式无效'))
                    }
                  }
                  
                  return Promise.resolve()
                }
              }
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#ffd700' }} />}
              placeholder={
                appConfig?.auth?.disableEmailLogin && appConfig?.auth?.disableGoogleLogin
                  ? "手机号 (例: 0123456789)"
                  : "请输入您的邮箱地址或手机号"
              }
              onInput={(e) => {
                const input = e.currentTarget
                // 如果禁用了邮箱和 Google 登录，只允许输入数字
                if (appConfig?.auth?.disableEmailLogin && appConfig?.auth?.disableGoogleLogin) {
                  input.value = input.value.replace(/\D/g, '')
                } else {
                  // 如果不是邮箱（不含@），自动清理空格
                  if (!input.value.includes('@')) {
                    input.value = input.value.replace(/\s/g, '')
                  }
                }
              }}
              onKeyPress={(e) => {
                // 如果禁用了邮箱和 Google 登录，只允许输入数字
                if (appConfig?.auth?.disableEmailLogin && appConfig?.auth?.disableGoogleLogin) {
                  const char = String.fromCharCode(e.which || e.keyCode)
                  if (!/[0-9]/.test(char)) {
                    e.preventDefault()
                  }
                }
              }}
              onPaste={(e) => {
                // 如果禁用了邮箱和 Google 登录，只允许粘贴数字
                if (appConfig?.auth?.disableEmailLogin && appConfig?.auth?.disableGoogleLogin) {
                  e.preventDefault()
                  const paste = (e.clipboardData || (window as any).clipboardData).getData('text')
                  const numbersOnly = paste.replace(/\D/g, '')
                  const input = e.currentTarget as HTMLInputElement
                  const start = input.selectionStart || 0
                  const end = input.selectionEnd || 0
                  const currentValue = input.value
                  input.value = currentValue.substring(0, start) + numbersOnly + currentValue.substring(end)
                  input.setSelectionRange(start + numbersOnly.length, start + numbersOnly.length)
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
          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setResetPasswordVisible(false)
                  resetPasswordForm.resetFields()
                }}
                style={{
                  color: '#c0c0c0',
                  borderColor: '#444444'
                }}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={resetPasswordLoading}
                style={{
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#221c10',
                  fontWeight: 600
                }}
              >
                 发送重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      
    </div>
  )
}

export default Login
