import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth'
import { auth } from '../../config/firebase'
import { Form, Input, Button, message, Spin, Card } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

/**
 * Firebase Auth Action Handler
 * 处理：密码重置、邮箱验证等 Firebase Auth 操作
 */
export const ActionHandler = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [form] = Form.useForm()

  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<string | null>(null)
  const [actionCode, setActionCode] = useState<string | null>(null)
  const [email, setEmail] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    const mode = searchParams.get('mode')
    const oobCode = searchParams.get('oobCode')

    console.log('[ActionHandler] Mode:', mode)
    console.log('[ActionHandler] Code:', oobCode ? '存在' : '不存在')

    if (!mode || !oobCode) {
      setError('无效的链接')
      setLoading(false)
      return
    }

    setMode(mode)
    setActionCode(oobCode)

    // 处理不同的操作模式
    if (mode === 'resetPassword') {
      handleResetPassword(oobCode)
    } else if (mode === 'verifyEmail') {
      handleVerifyEmail(oobCode)
    } else {
      setError('不支持的操作类型')
      setLoading(false)
    }
  }, [searchParams])

  const handleResetPassword = async (code: string) => {
    try {
      // 验证重置码并获取邮箱
      const email = await verifyPasswordResetCode(auth, code)
      console.log('[ActionHandler] 重置码有效，邮箱:', email)
      setEmail(email)
      setLoading(false)
    } catch (error: any) {
      console.error('[ActionHandler] 验证重置码失败:', error)
      if (error.code === 'auth/invalid-action-code') {
        setError('该链接已过期或已被使用。请重新申请密码重置。')
      } else {
        setError('链接无效，请重新申请密码重置')
      }
      setLoading(false)
    }
  }

  const handleVerifyEmail = async (code: string) => {
    try {
      const { applyActionCode } = await import('firebase/auth')
      await applyActionCode(auth, code)
      message.success('邮箱验证成功！')
      setTimeout(() => navigate('/login'), 2000)
    } catch (error: any) {
      console.error('[ActionHandler] 邮箱验证失败:', error)
      setError('邮箱验证失败，请重试')
      setLoading(false)
    }
  }

  const handleSubmitNewPassword = async (values: { password: string; confirmPassword: string }) => {
    if (!actionCode) return

    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }

    setResetting(true)
    try {
      await confirmPasswordReset(auth, actionCode, values.password)
      message.success('密码重置成功！请使用新密码登录')
      setTimeout(() => navigate('/login'), 2000)
    } catch (error: any) {
      console.error('[ActionHandler] 密码重置失败:', error)
      if (error.code === 'auth/invalid-action-code') {
        message.error('该链接已过期或已被使用')
      } else if (error.code === 'auth/weak-password') {
        message.error('密码强度不足，请使用至少6位字符')
      } else {
        message.error('密码重置失败，请重试')
      }
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
      }}>
        <Spin size="large" tip="验证中..." />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        padding: '24px'
      }}>
        <Card
          style={{
            maxWidth: '500px',
            width: '100%',
            background: 'rgba(26, 26, 26, 0.95)',
            border: '1px solid rgba(255, 215, 0, 0.2)',
            borderRadius: '16px'
          }}
        >
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <h2 style={{ color: '#ff4d4f', marginBottom: '16px' }}>操作失败</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '24px' }}>{error}</p>
            <Button
              type="primary"
              onClick={() => navigate('/login')}
              style={{
                background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                border: 'none',
                color: '#221c10'
              }}
            >
              返回登录
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (mode === 'resetPassword') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        padding: '24px'
      }}>
        <Card
          title={
            <span style={{
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 700,
              fontSize: '24px'
            }}>
              设置新密码
            </span>
          }
          style={{
            maxWidth: '500px',
            width: '100%',
            background: 'rgba(26, 26, 26, 0.95)',
            border: '1px solid rgba(255, 215, 0, 0.2)',
            borderRadius: '16px'
          }}
          headStyle={{
            background: 'transparent',
            borderBottom: '1px solid rgba(255, 215, 0, 0.1)'
          }}
          bodyStyle={{
            padding: '32px'
          }}
        >
          <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '24px' }}>
            为账户 <span style={{ color: '#FDD017' }}>{email}</span> 设置新密码
          </div>

          <Form
            form={form}
            onFinish={handleSubmitNewPassword}
            layout="vertical"
          >
            <Form.Item
              name="password"
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
                    if (!value || getFieldValue('password') === value) {
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

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={resetting}
                block
                style={{
                  height: '48px',
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#221c10',
                  fontWeight: 600,
                  fontSize: '16px',
                  boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)'
                }}
              >
                重置密码
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    )
  }

  return null
}

