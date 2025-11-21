// 登录页面
import React, { useState, useEffect, useRef } from 'react'
import { Form, Input, Button, Card, Typography, Space, message, Divider, Spin, Modal } from 'antd'
import { UserOutlined, LockOutlined, GoogleOutlined, LoadingOutlined, PhoneOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { loginWithEmailOrPhone, loginWithGoogle, handleGoogleRedirectResult } from '../../services/firebase/auth'
import { initRecaptchaVerifier, sendPasswordResetSMS, verifySMSCode, resetPasswordWithPhone, cleanupRecaptcha } from '../../services/firebase/phoneAuth'
import { useAuthStore } from '../../store/modules/auth'
import { useTranslation } from 'react-i18next'
import { identifyInputType, normalizePhoneNumber, isValidEmail } from '../../utils/phoneNormalization'

const { Title, Text } = Typography

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState<string>('')
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 忘记密码相关状态
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false)
  const [resetPasswordForm] = Form.useForm()
  const [resettingPassword, setResettingPassword] = useState(false)
  const [resetStep, setResetStep] = useState<'phone' | 'verify' | 'newPassword'>('phone')
  const [resetPhone, setResetPhone] = useState('')
  const [countdown, setCountdown] = useState(0)
  
  const navigate = useNavigate()
  const location = useLocation()
  const { user, setUser } = useAuthStore()
  const { t } = useTranslation()
  const hasCheckedRedirect = useRef(false) // 防止 StrictMode 重复调用

  const from = location.state?.from?.pathname || '/'
  
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
        // 资料完整，重定向到首页或原页面
        navigate(from, { replace: true })
      }
    }
  }, [user, navigate, from])

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
            navigate(from, { replace: true })
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
  }, [navigate, from, t])

  // 初始化 reCAPTCHA（当模态框打开时）
  useEffect(() => {
    if (forgotPasswordVisible && resetStep === 'phone') {
      // 延迟初始化，确保 DOM 已渲染且旧实例已清理
      const timer = setTimeout(() => {
        try {
          const container = document.getElementById('recaptcha-container')
          if (!container) {
            console.error('[reCAPTCHA] 容器不存在')
            return
          }
          
          initRecaptchaVerifier('recaptcha-container', 'invisible')
        } catch (error) {
          console.error('[reCAPTCHA] 初始化失败:', error)
          message.error('验证组件加载失败，请刷新页面重试')
        }
      }, 300)

      return () => {
        clearTimeout(timer)
      }
    }
    
    // 清理函数 - 当模态框关闭或步骤改变时
    if (!forgotPasswordVisible || resetStep !== 'phone') {
      // 延迟清理，避免立即重新打开时冲突
      const cleanupTimer = setTimeout(() => {
        cleanupRecaptcha()
      }, 100)
      
      return () => clearTimeout(cleanupTimer)
    }
  }, [forgotPasswordVisible, resetStep])

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    setLoginError('') // 清除之前的错误
    try {
      const result = await loginWithEmailOrPhone(values.email, values.password)
      if (result.success) {
        message.success(t('auth.loginSuccess'))
        navigate(from, { replace: true })
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
          navigate(from, { replace: true })
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

  // 第一步：发送 SMS 验证码
  const handleSendSMS = async (values: { phone: string }) => {
    setResettingPassword(true)
    try {
      const result = await sendPasswordResetSMS(values.phone)
      
      if (result.success) {
        message.success('验证码已发送到您的手机，请查收')
        setResetPhone(values.phone)
        setResetStep('verify')
        setCountdown(60) // 60秒倒计时
      } else {
        const errorMsg = result.error?.message || '发送失败，请重试'
        message.error(errorMsg)
        
        // 如果是 reCAPTCHA 错误，建议刷新
        if (errorMsg.includes('reCAPTCHA') || errorMsg.includes('recaptcha')) {
          setTimeout(() => {
            message.warning('建议刷新页面后重试（Ctrl+Shift+R）')
          }, 1500)
        }
      }
    } catch (error: any) {
      const errorMsg = error.message || '发送失败，请重试'
      message.error(errorMsg)
      
      // 如果是 reCAPTCHA 错误，清理并建议刷新
      if (errorMsg.includes('reCAPTCHA') || errorMsg.includes('recaptcha')) {
        cleanupRecaptcha()
        setTimeout(() => {
          message.warning('请刷新页面后重试（Ctrl+Shift+R）')
        }, 1500)
      }
    } finally {
      setResettingPassword(false)
    }
  }

  // 第二步：验证 SMS 验证码
  const handleVerifyCode = async (values: { code: string }) => {
    setResettingPassword(true)
    try {
      const result = await verifySMSCode(values.code)
      
      if (result.success) {
        message.success('验证成功，请设置新密码')
        setResetStep('newPassword')
      } else {
        message.error(result.error?.message || '验证码错误，请重试')
      }
    } catch (error: any) {
      message.error(error.message || '验证失败，请重试')
    } finally {
      setResettingPassword(false)
    }
  }

  // 第三步：设置新密码
  const handleSetNewPassword = async (values: { newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }

    setResettingPassword(true)
    try {
      const result = await resetPasswordWithPhone(
        resetPhone,
        resetPasswordForm.getFieldValue('code'),
        values.newPassword
      )
      
      if (result.success) {
        message.success('密码重置成功，请使用新密码登录')
        setForgotPasswordVisible(false)
        resetPasswordForm.resetFields()
        setResetStep('phone')
        setResetPhone('')
      } else {
        message.error(result.error?.message || '密码重置失败，请重试')
      }
    } catch (error: any) {
      message.error(error.message || '密码重置失败，请重试')
    } finally {
      setResettingPassword(false)
    }
  }

  // 重置模态框状态
  const handleResetModalClose = () => {
    // 先清理 reCAPTCHA
    cleanupRecaptcha()
    
    // 延迟关闭，确保清理完成
    setTimeout(() => {
      setForgotPasswordVisible(false)
      resetPasswordForm.resetFields()
      setResetStep('phone')
      setResetPhone('')
      setCountdown(0)
    }, 50)
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
                prefix={<UserOutlined style={{ color: loginError ? '#ff4d4f' : '#ffd700' }} />}
                placeholder={loginError || "邮箱 / 手机号 (例: admin@example.com 或 0123456789)"}
                onInput={(e) => {
                  const input = e.currentTarget
                  // 清除错误状态
                  if (loginError) setLoginError('')
                  
                  // 禁止输入中文字符
                  input.value = input.value.replace(/[\u4e00-\u9fa5]/g, '')
                  // 如果不是邮箱（不含@），自动清理空格
                  if (!input.value.includes('@')) {
                    input.value = input.value.replace(/\s/g, '')
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
              style={{ marginBottom: '8px' }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: loginError ? '#ff4d4f' : '#ffd700' }} />}
                placeholder={t('auth.password')}
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

            {/* 忘记密码链接 */}
            <div style={{ textAlign: 'right', marginBottom: '16px' }}>
              <Button 
                type="link"
                onClick={() => setForgotPasswordVisible(true)}
                style={{
                  color: '#FDD017',
                  padding: 0,
                  height: 'auto',
                  fontSize: '14px'
                }}
              >
                忘记密码？
              </Button>
            </div>

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

      {/* reCAPTCHA 容器（隐藏） */}
      <div id="recaptcha-container"></div>

      {/* 忘记密码模态框 - SMS 验证码方式 */}
      <Modal
        title={
          <span style={{
            background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 700,
            fontSize: '18px'
          }}>
            重置密码 {resetStep === 'verify' && `(${countdown}s)`}
          </span>
        }
        open={forgotPasswordVisible}
        onCancel={handleResetModalClose}
        footer={null}
        centered
        styles={{
          content: {
            background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(45, 45, 45, 0.9) 100%)',
            border: '1px solid rgba(255, 215, 0, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)'
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(255, 215, 0, 0.1)'
          },
          body: {
            padding: '24px'
          }
        }}
      >
        {/* 步骤指示器 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '24px',
          position: 'relative'
        }}>
          {['phone', 'verify', 'newPassword'].map((step, index) => (
            <div key={step} style={{ 
              flex: 1, 
              textAlign: 'center',
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: resetStep === step || ['verify', 'newPassword'].includes(resetStep) && index < (['phone', 'verify', 'newPassword'].indexOf(resetStep))
                  ? 'linear-gradient(to right,#FDE08D,#C48D3A)'
                  : 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                color: resetStep === step || ['verify', 'newPassword'].includes(resetStep) && index < (['phone', 'verify', 'newPassword'].indexOf(resetStep))
                  ? '#221c10'
                  : '#999',
                fontWeight: 600,
                fontSize: '14px'
              }}>
                {index + 1}
              </div>
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: resetStep === step ? '#FDD017' : '#999'
              }}>
                {step === 'phone' ? '手机号' : step === 'verify' ? '验证码' : '新密码'}
              </div>
            </div>
          ))}
          {/* 连接线 */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16.67%',
            width: '66.66%',
            height: '2px',
            background: 'rgba(255, 255, 255, 0.2)',
            zIndex: 0
          }} />
        </div>

        <Form
          form={resetPasswordForm}
          onFinish={
            resetStep === 'phone' ? handleSendSMS 
            : resetStep === 'verify' ? handleVerifyCode 
            : handleSetNewPassword
          }
          layout="vertical"
        >
          {/* 第一步：输入手机号 */}
          {resetStep === 'phone' && (
            <>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '16px', fontSize: '14px' }}>
                请输入您注册时使用的手机号，我们将发送验证码到您的手机。
              </div>
              
              <Form.Item
                name="phone"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { 
                    pattern: /^((\+?60[1-9]\d{8,9})|(0[1-9]\d{8,9}))$/, 
                    message: '手机号格式无效（需10-12位数字）' 
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
            </>
          )}

          {/* 第二步：输入验证码 */}
          {resetStep === 'verify' && (
            <>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '16px', fontSize: '14px' }}>
                验证码已发送到 <span style={{ color: '#FDD017' }}>{resetPhone}</span>
                <br />
                请输入6位数字验证码
              </div>
              
              <Form.Item
                name="code"
                rules={[
                  { required: true, message: '请输入验证码' },
                  { 
                    pattern: /^\d{6}$/, 
                    message: '验证码必须是6位数字' 
                  }
                ]}
              >
                <Input
                  placeholder="请输入6位验证码"
                  maxLength={6}
                  onInput={(e) => {
                    const input = e.currentTarget
                    input.value = input.value.replace(/\D/g, '')
                  }}
                  style={{
                    background: 'rgba(45, 45, 45, 0.8)',
                    border: '1px solid #444444',
                    borderRadius: '8px',
                    color: '#f8f8f8',
                    height: '48px',
                    fontSize: '18px',
                    letterSpacing: '8px',
                    textAlign: 'center'
                  }}
                />
              </Form.Item>

              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <Button
                  type="link"
                  disabled={countdown > 0}
                  onClick={() => {
                    resetPasswordForm.setFieldsValue({ phone: resetPhone })
                    handleSendSMS({ phone: resetPhone })
                  }}
                  style={{
                    color: countdown > 0 ? '#999' : '#FDD017',
                    padding: 0
                  }}
                >
                  {countdown > 0 ? `${countdown}秒后可重新发送` : '重新发送验证码'}
                </Button>
              </div>
            </>
          )}

          {/* 第三步：设置新密码 */}
          {resetStep === 'newPassword' && (
            <>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '16px', fontSize: '14px' }}>
                请设置新密码
              </div>
              
              <Form.Item
                name="newPassword"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码至少6位' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#ffd700' }} />}
                  placeholder="请输入新密码（至少6位）"
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
                name="confirmPassword"
                rules={[
                  { required: true, message: '请再次输入新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'))
                    }
                  })
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#ffd700' }} />}
                  placeholder="请再次输入新密码"
                  style={{
                    background: 'rgba(45, 45, 45, 0.8)',
                    border: '1px solid #444444',
                    borderRadius: '8px',
                    color: '#f8f8f8',
                    height: '48px'
                  }}
                />
              </Form.Item>
            </>
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={handleResetModalClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  borderRadius: '8px'
                }}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={resettingPassword}
                style={{ 
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#221c10',
                  fontWeight: 600,
                  boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)'
                }}
              >
                {resetStep === 'phone' ? '发送验证码' : resetStep === 'verify' ? '验证' : '重置密码'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      
    </div>
  )
}

export default Login
