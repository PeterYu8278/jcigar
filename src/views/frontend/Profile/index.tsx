// 用户档案页面
import React, { useState } from 'react'
import { Button, Modal, Form, Input, message, Switch, Select } from 'antd'
import { ArrowLeftOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '../../../store/modules/auth'
import { useTranslation } from 'react-i18next'
import { ProfileView } from '../../../components/common/ProfileView'
import ImageUpload from '../../../components/common/ImageUpload'
import { NotificationSettings } from '../../../components/common/NotificationSettings'
import { NotificationPermissionPrompt } from '../../../components/common/NotificationPermissionPrompt'
import { updateDocument } from '../../../services/firebase/firestore'
import { normalizePhoneNumber } from '../../../utils/phoneNormalization'
import type { User } from '../../../types'
import { auth } from '../../../config/firebase'
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { getResponsiveModalConfig, getModalTheme } from '../../../config/modalTheme'

const Profile: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  const theme = getModalTheme()
  const labelFlex = isMobile ? '40%' : '120px'

  const handleEdit = (userToEdit?: User) => {
    const u = userToEdit || user
    if (!u) return
    setEditing(true)
    form.setFieldsValue({
      displayName: u.displayName || '',
      email: u.email || '',  // ✅ 添加邮箱字段初始化
      phone: (u as any)?.profile?.phone || '',
      notifications: (u as any)?.preferences?.notifications !== false,
      language: (u as any)?.preferences?.locale || i18n.language || 'zh-CN',
    })
  }

  const handleSave = async () => {
    if (!user) return
    try {
      const values = await form.validateFields()
      setSaving(true)
      const updates: any = {
        displayName: values.displayName,
        'profile.phone': normalizePhoneNumber(values.phone),
        'preferences.notifications': values.notifications,
        ...(values.language ? { 'preferences.locale': values.language } : {}),
        updatedAt: new Date(),
      }

      // 先更新非敏感字段
      await updateDocument('users', user.id, updates)

      const currentUser = auth.currentUser

      // 邮箱更新
      if (values.email && values.email !== user.email) {
        if (!currentUser) throw new Error('not logged in')
        if (values.currentPassword) {
          const credential = EmailAuthProvider.credential(user.email || '', values.currentPassword)
          await reauthenticateWithCredential(currentUser, credential)
          await updateEmail(currentUser, values.email)
          updates.email = values.email
        } else {
          message.warning(t('profile.emailChangeRequiresPassword'))
        }
      }

      // 密码更新
      if (values.newPassword) {
        if (!currentUser) throw new Error('not logged in')
        if (values.currentPassword) {
          const credential = EmailAuthProvider.credential(user.email || '', values.currentPassword)
          await reauthenticateWithCredential(currentUser, credential)
          await updatePassword(currentUser, values.newPassword)
          message.success(t('profile.passwordUpdated'))
        } else {
          message.warning(t('profile.passwordChangeRequiresCurrentPassword'))
        }
      }

      // 同步本地
      setUser({
        ...user,
        displayName: values.displayName,
        email: updates.email || user.email,
        profile: {
          ...(user as any)?.profile,
          phone: normalizePhoneNumber(values.phone),
        }
        ,
        preferences: {
          ...(user as any)?.preferences,
          notifications: values.notifications,
          locale: values.language || (user as any)?.preferences?.locale
        }
      } as any)
      if (values.language && values.language !== i18n.language) {
        try { await i18n.changeLanguage(values.language) } catch (e) {}
      }

      message.success(t('profile.saveSuccess'))
      setEditing(false)
    } catch (err: any) {
      if (err?.code === 'auth/wrong-password') {
        message.error(t('profile.incorrectPassword'))
      } else if (err?.code === 'auth/weak-password') {
        message.error(t('profile.weakPassword'))
      } else {
        message.error(t('profile.saveFailed'))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: isMobile ? '0px' : '60px',
      paddingBottom: isMobile ? '80px' : '40px'
    }}>
      <div style={{
        maxWidth: '640px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            style={{ color: '#FFFFFF', fontSize: '20px' }}
          />
          <h1 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            margin: 0,
            textAlign: 'center',
            flex: 1
          }}>
            {t('profile.title')}
          </h1>
          <div style={{ width: 40, height: 40 }} />
        </div>

        {/* Profile View Component */}
        <ProfileView
          user={user}
          readOnly={false}
          showEditButton={true}
          onEdit={(u) => handleEdit(u)}
        />

        {/* 推送通知设置 */}
        <NotificationSettings />

        {/* 通知权限提示（首次使用时自动显示） */}
        <NotificationPermissionPrompt userId={user?.id} autoShow={true} />
      </div>

      {/* 编辑资料弹窗（简化：昵称与手机 + 头像） */}
      <Modal
        title={t('profile.editProfile')}
        open={editing}
        onOk={handleSave}
        onCancel={() => setEditing(false)}
        confirmLoading={saving}
        {...getResponsiveModalConfig(isMobile, true, 520)}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        okButtonProps={{
          style: {
            background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
            border: 'none',
            color: '#111',
            fontWeight: 600
          }
        }}
      >
        <div style={theme.content as React.CSSProperties}>
          {/* 基本信息卡片 */}
          <div style={theme.card.elevated as React.CSSProperties}>
            <div style={theme.text.subtitle as React.CSSProperties}>📋 {t('profile.editProfile')}</div>
        <Form
          form={form}
              layout="horizontal"
              labelCol={{ flex: labelFlex }}
              wrapperCol={{ flex: '1 0 0' }}
              labelAlign="left"
              labelWrap={false}
              style={{ marginTop: 8, rowGap: 8 }}
        >
              <Form.Item label={<span style={{ color: '#FFFFFF' }}>{t('profile.avatar')}</span>} style={{ marginBottom: 8 }}>
            <ImageUpload
              value={(user as any)?.profile?.avatar}
              onChange={async (url) => {
                    if (!user) return
                    try {
                  await updateDocument('users', user.id, {
                    'profile.avatar': url,
                    updatedAt: new Date()
                  })
                  setUser({
                    ...user,
                    profile: {
                      ...(user as any)?.profile,
                      avatar: url
                    }
                      } as any)
                  message.success(t('profile.avatarUpdated'))
                    } catch {
                      message.error(t('profile.saveFailed'))
                }
              }}
              folder="avatars"
            />
          </Form.Item>

          <Form.Item
            name="displayName"
                label={<span style={{ color: '#FFFFFF' }}>{t('profile.nameLabel')}</span>}
            rules={[{ required: true, message: t('profile.nameRequired') }]}
          >
            <Input placeholder={t('profile.namePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="email"
                label={<span style={{ color: '#FFFFFF' }}>{t('auth.email')}</span>}
                rules={[
                  { required: true, message: t('auth.emailRequired') },
                  { type: 'email', message: t('auth.emailInvalid') },
                  {
                    validator: async (_, value) => {
                      // 如果字段被禁用（Google登录），跳过验证
                      if (!!(user as any)?.providerData?.find((p: any) => p.providerId === 'google.com')) {
                        return Promise.resolve()
                      }
                      
                      // 如果没有输入，跳过验证（required 规则会处理）
                      if (!value) {
                        return Promise.resolve()
                      }
                      
                      // 如果邮箱没有改变，跳过验证
                      if (value === user?.email) {
                        return Promise.resolve()
                      }
                      
                      // ✅ 先验证格式，格式无效则跳过唯一性检查
                      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                      if (!emailPattern.test(value)) {
                        return Promise.resolve()
                      }
                      
                      // ✅ 格式有效，检查邮箱唯一性
                      const { collection, query, where, getDocs, limit } = await import('firebase/firestore')
                      const { db } = await import('../../../config/firebase')
                      
                      try {
                        const emailQuery = query(
                          collection(db, 'users'), 
                          where('email', '==', value.toLowerCase().trim()),
                          limit(1)
                        )
                        const emailSnap = await getDocs(emailQuery)
                        
                        if (!emailSnap.empty) {
                          return Promise.reject(new Error('该邮箱已被其他用户使用'))
                        }
                      } catch (error) {
                        // 如果查询失败，允许通过（不阻止用户提交）
                      }
                      
                      return Promise.resolve()
                    }
                  }
                ]}
                validateTrigger={['onBlur', 'onChange']}
                validateDebounce={500}
          >
            <Input 
              prefix={<MailOutlined />}
              type="email"
              disabled={!!(user as any)?.providerData?.find((p: any) => p.providerId === 'google.com')}
              placeholder={t('auth.emailPlaceholder')}
            />
          </Form.Item>

          <Form.Item
            name="phone"
                label={<span style={{ color: '#FFFFFF' }}>{t('profile.phoneLabel')}</span>}
                rules={[
                  { required: true, message: t('profile.phoneRequired') },
                  { 
                    pattern: /^((\+?60[1-9]\d{8,9})|(0[1-9]\d{8,9}))$/, 
                    message: '手机号格式无效（需10-12位数字）' 
                  },
                  {
                    validator: async (_, value) => {
                      if (!value) return Promise.resolve()
                      
                      // 如果手机号没有改变，跳过验证
                      const currentPhone = normalizePhoneNumber((user as any)?.profile?.phone || '')
                      const newPhone = normalizePhoneNumber(value)
                      if (newPhone === currentPhone) {
                        return Promise.resolve()
                      }
                      
                      // ✅ 先验证格式，格式无效则跳过唯一性检查
                      const formatPattern = /^((\+?60[1-9]\d{8,9})|(0[1-9]\d{8,9}))$/
                      if (!formatPattern.test(value)) {
                        return Promise.resolve()
                      }
                      
                      // ✅ 格式有效，检查手机号唯一性
                      const normalized = normalizePhoneNumber(value)
                      if (!normalized) {
                        return Promise.resolve()
                      }
                      
                      try {
                        const { collection, query, where, getDocs, limit } = await import('firebase/firestore')
                        const { db } = await import('../../../config/firebase')
                        
                        const phoneQuery = query(
                          collection(db, 'users'), 
                          where('profile.phone', '==', normalized),
                          limit(1)
                        )
                        const phoneSnap = await getDocs(phoneQuery)
                        
                        if (!phoneSnap.empty) {
                          // 检查是否是当前用户
                          const existingUserId = phoneSnap.docs[0].id
                          if (existingUserId !== user?.id) {
                            return Promise.reject(new Error('该手机号已被其他用户使用'))
                          }
                        }
                      } catch (error) {
                        // 如果查询失败，允许通过（不阻止用户提交）
                      }
                      
                      return Promise.resolve()
                    }
                  }
                ]}
                validateTrigger={['onBlur', 'onChange']}
                validateDebounce={500}
          >
                <Input 
                  prefix={<PhoneOutlined />} 
                  placeholder={t('profile.phonePlaceholder')}
                  onInput={(e) => {
                    const input = e.currentTarget
                    // 只保留数字、加号和空格
                    input.value = input.value.replace(/[^\d+\s-]/g, '')
                  }}
                />
          </Form.Item>
          </Form>
          </div>

          {/* 安全设置卡片 */}
          <div style={{ ...(theme.card.elevated as React.CSSProperties), marginTop: 12 }}>
            <div style={theme.text.subtitle as React.CSSProperties}>🔐 {t('auth.security')}</div>
            <Form
              form={form}
              layout="horizontal"
              labelCol={{ flex: labelFlex }}
              wrapperCol={{ flex: '1 0 0' }}
              labelAlign="left"
              labelWrap={false}
              style={{ marginTop: 8, rowGap: 8 }}
            >
          <Form.Item
            name="currentPassword"
                label={<span style={{ color: '#FFFFFF' }}>{t('profile.currentPassword')}</span>}
          >
            <Input.Password placeholder={t('profile.currentPasswordPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="newPassword"
                label={<span style={{ color: '#FFFFFF' }}>{t('profile.newPassword')}</span>}
                rules={[{ min: 6, message: t('profile.passwordMinLength') }]}
          >
            <Input.Password placeholder={t('profile.newPasswordPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
                label={<span style={{ color: '#FFFFFF' }}>{t('profile.confirmPassword')}</span>}
            dependencies={['newPassword']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error(t('profile.passwordMismatch')))
                    }
                  })
            ]}
          >
            <Input.Password placeholder={t('profile.confirmPasswordPlaceholder')} />
          </Form.Item>
            </Form>
          </div>

          {/* 偏好设置卡片 */}
          <div style={{ ...(theme.card.elevated as React.CSSProperties), marginTop: 12 }}>
            <div style={theme.text.subtitle as React.CSSProperties}>⚙️ {t('profile.settings')}</div>
            <Form
              form={form}
              layout="horizontal"
              labelCol={{ flex: labelFlex }}
              wrapperCol={{ flex: '1 0 0' }}
              labelAlign="left"
              labelWrap={false}
              style={{ marginTop: 8 }}
            >
          <Form.Item
            name="notifications"
            valuePropName="checked"
                style={{ marginBottom: 0 }}
                label={<span style={{ color: '#FFFFFF' }}>{t('profile.notificationsToggle')}</span>}
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name="language"
                label={<span style={{ color: '#FFFFFF' }}>{t('profile.language')}</span>}
                style={{ marginTop: 12, marginBottom: 0 }}
              >
                <Select
                  placeholder={t('profile.language')}
                  options={[
                    { label: t('language.zhCN'), value: 'zh-CN' },
                    { label: t('language.enUS'), value: 'en-US' }
                  ]}
                />
          </Form.Item>
        </Form>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Profile
