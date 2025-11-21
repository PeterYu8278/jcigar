// 用户档案页面
import React, { useState } from 'react'
import { Button, Modal, Form, Input, message, Switch, Select } from 'antd'
import { ArrowLeftOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '../../../store/modules/auth'
import { useTranslation } from 'react-i18next'
import { ProfileView } from '../../../components/common/ProfileView'
import ImageUpload from '../../../components/common/ImageUpload'
import { updateDocument } from '../../../services/firebase/firestore'
import { normalizePhoneNumber } from '../../../utils/phoneNormalization'
import type { User } from '../../../types'
import { auth } from '../../../config/firebase'
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { getResponsiveModalConfig, getModalTheme } from '../../../config/modalTheme'
import { checkPhoneBindingEligibility, mergeUserAccounts } from '../../../services/firebase/accountMerge'

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
      
      // 检查手机号是否需要合并账户
      const normalizedPhone = normalizePhoneNumber(values.phone)
      const oldPhone = user.profile?.phone
      let accountMerged = false
      
      // 如果手机号发生变化，检查是否需要合并账户
      if (normalizedPhone && normalizedPhone !== oldPhone) {
        const bindingCheck = await checkPhoneBindingEligibility(normalizedPhone, user.id)
        
        if (!bindingCheck.canBind) {
          message.error(bindingCheck.reason || '该手机号已被其他用户使用')
          setSaving(false)
          return
        }
        
        // 如果需要合并账户，先执行合并
        if (bindingCheck.needsMerge && bindingCheck.existingUser) {
          console.log('[Profile] 需要合并账户:', {
            currentUserId: user.id,
            phoneOnlyUserId: bindingCheck.existingUser.id
          })
          
          const mergeResult = await mergeUserAccounts(user.id, bindingCheck.existingUser.id)
          if (!mergeResult.success) {
            message.error(mergeResult.error || '账户合并失败')
            setSaving(false)
            return
          }
          
          accountMerged = true
          message.success('账户合并成功')
          console.log('[Profile] 账户合并成功')
        }
      }
      
      const updates: any = {
        displayName: values.displayName,
        'profile.phone': normalizedPhone,
        'preferences.notifications': values.notifications,
        ...(values.language ? { 'preferences.locale': values.language } : {}),
        updatedAt: new Date(),
      }

      // 更新非敏感字段（如果账户已合并，手机号已在合并时设置）
      if (!accountMerged) {
        await updateDocument('users', user.id, updates)
      } else {
        // 如果账户已合并，只更新displayName和preferences
        const { 'profile.phone': _, ...otherUpdates } = updates
        await updateDocument('users', user.id, otherUpdates)
      }

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
                  {
                    pattern: /^((\+?60[1-9]\d{8,9})|(0[1-9]\d{8,9}))$/,
                    message: '手机号格式无效（需10-12位数字）'
                  },
                  {
                    validator: async (_, value) => {
                      if (!value) return Promise.resolve()
                      
                      // 先验证格式
                      const formatPattern = /^((\+?60[1-9]\d{8,9})|(0[1-9]\d{8,9}))$/
                      if (!formatPattern.test(value)) {
                        return Promise.resolve()
                      }
                      
                      // 标准化手机号
                      const normalized = normalizePhoneNumber(value)
                      if (!normalized) {
                        return Promise.resolve()
                      }
                      
                      // 检查是否已被使用（使用智能账户合并逻辑）
                      try {
                        if (!user?.id) {
                          return Promise.reject(new Error('未登录'))
                        }

                        const result = await checkPhoneBindingEligibility(normalized, user.id)
                        
                        if (!result.canBind) {
                          return Promise.reject(new Error(result.reason || '该手机号已被其他用户使用'))
                        }

                        // 可以绑定，如果需要合并账户，显示提示信息
                        if (result.needsMerge && result.existingUser) {
                          message.info(`该手机号对应的账户（${result.existingUser.displayName || '无名称'}）将与您的账户合并`, 5)
                        }
                      } catch (error) {
                        console.error('[Profile] Phone validation error:', error)
                        // 如果查询失败，允许通过
                      }
                      
                      return Promise.resolve()
                    }
                  }
                ]}
                validateTrigger={['onBlur', 'onChange']}
                validateDebounce={500}
          >
                <Input prefix={<PhoneOutlined />} placeholder={t('profile.phonePlaceholder')} />
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
