// User Profile Page
import React, { useState, useEffect } from 'react'
import { Button, Modal, Form, Input, message, Switch, Select, Space, Typography, Checkbox, Divider, TimePicker } from 'antd'
import { ArrowLeftOutlined, MailOutlined, PhoneOutlined, BellOutlined, CalendarOutlined, WalletOutlined, ShoppingOutlined, GiftOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '../../../store/modules/auth'
import { useTranslation } from 'react-i18next'
import { ProfileView } from '../../../components/common/ProfileView'
import ImageUpload from '../../../components/common/ImageUpload'
import { updateDocument, getUserById } from '../../../services/firebase/firestore'
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
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission
    }
    return 'default'
  })
  const [form] = Form.useForm()
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(width: 768px)').matches : false
  const theme = getModalTheme()
  const labelFlex = isMobile ? '40%' : '120px'

  // Check notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  // Helper function to build form values
  const buildFormValues = (userData: User) => {
    // preferences are at the root, not under profile
    const pushPrefs = (userData as any)?.preferences?.pushNotifications || {}
    const quietHours = pushPrefs.quietHours || {}
    
    return {
      displayName: userData.displayName || '',
      email: userData.email || '',
      phone: (userData as any)?.profile?.phone || '',
      notifications: (userData as any)?.preferences?.notifications ?? true,
      language: (userData as any)?.preferences?.locale || i18n.language || 'zh-CN',
      // Push notification type settings (use ?? to keep false values)
      pushActivity: pushPrefs.types?.activity ?? true,
      pushPoints: pushPrefs.types?.points ?? true,
      pushOrder: pushPrefs.types?.order ?? true,
      pushMarketing: pushPrefs.types?.marketing ?? true,
      // Quiet hours settings (use ?? to keep false values)
      quietHoursEnabled: quietHours.enabled ?? false,
      quietHoursStart: quietHours.start ? dayjs(quietHours.start, 'HH:mm') : dayjs('22:00', 'HH:mm'),
      quietHoursEnd: quietHours.end ? dayjs(quietHours.end, 'HH:mm') : dayjs('09:00', 'HH:mm'),
    }
  }

  const handleEdit = async (userToEdit?: User) => {
    const u = userToEdit || user
    if (!u) return
    
    // Open Modal then set values
    setEditing(true)
    
    // Re-read from Firestore to ensure consistency
    try {
      const latestUser = await getUserById(u.id)
      const userData = latestUser || u // Prioritize Firestore data
      
      // Use setTimeout to ensure Modal is rendered
      setTimeout(() => {
        form.setFieldsValue(buildFormValues(userData))
      }, 0)
    } catch (error) {
      console.error('[Profile] Failed to read user data:', error)
      // If read fails, use local data
      setTimeout(() => {
        form.setFieldsValue(buildFormValues(u))
      }, 0)
    }
  }

  const handleSave = async () => {
    if (!user) return
    try {
      const values = await form.validateFields()
      setSaving(true)
      
      const updates: any = {
        displayName: values.displayName,
        'profile.phone': normalizePhoneNumber(values.phone),
        'preferences.notifications': values.notifications, // Main switch: enable notifications
        ...(values.language ? { 'preferences.locale': values.language } : {}),
        // Push notification types (only save if notifications enabled)
        'preferences.pushNotifications.types.activity': values.pushActivity === true,
        'preferences.pushNotifications.types.points': values.pushPoints === true,
        'preferences.pushNotifications.types.order': values.pushOrder === true,
        'preferences.pushNotifications.types.marketing': values.pushMarketing === true,
        // Quiet hours settings
        'preferences.pushNotifications.quietHours.enabled': values.quietHoursEnabled === true,
        updatedAt: new Date(),
      }
      
      // Only set quiet hours if values exist
      if (values.quietHoursStart) {
        updates['preferences.pushNotifications.quietHours.start'] = values.quietHoursStart.format('HH:mm')
      }
      if (values.quietHoursEnd) {
        updates['preferences.pushNotifications.quietHours.end'] = values.quietHoursEnd.format('HH:mm')
      }
      
      const updateResult = await updateDocument('users', user.id, updates)
      
      if (!updateResult.success) {
        throw new Error('Update failed')
      }

      const currentUser = auth.currentUser

      // Email update
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

      // Password update
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

      // Re-read from Firestore to ensure local state is in sync
      try {
        const latestUser = await getUserById(user.id)
        if (latestUser) {
          setUser(latestUser as any)
        } else {
          // If failed to read, use saved values
          // preferences are at root, not under profile
          setUser({
            ...user,
            displayName: values.displayName,
            email: updates.email || user.email,
            profile: {
              ...(user as any)?.profile,
              phone: normalizePhoneNumber(values.phone),
            },
            preferences: {
              ...(user as any)?.preferences,
              notifications: values.notifications,
              locale: values.language || (user as any)?.preferences?.locale,
              pushNotifications: {
                types: {
                  activity: values.pushActivity,
                  points: values.pushPoints,
                  order: values.pushOrder,
                  marketing: values.pushMarketing
                },
                quietHours: {
                  enabled: values.quietHoursEnabled,
                  start: values.quietHoursStart ? values.quietHoursStart.format('HH:mm') : undefined,
                  end: values.quietHoursEnd ? values.quietHoursEnd.format('HH:mm') : undefined
                }
              }
            }
          } as any)
        }
      } catch (error) {
        console.error('[Profile] Failed to re-read user data:', error)
        // If failed, use saved values
        // preferences are at root, not under profile
        setUser({
          ...user,
          displayName: values.displayName,
          email: updates.email || user.email,
          profile: {
            ...(user as any)?.profile,
            phone: normalizePhoneNumber(values.phone),
          },
          preferences: {
            ...(user as any)?.preferences,
            notifications: values.notifications,
            locale: values.language || (user as any)?.preferences?.locale,
            pushNotifications: {
              types: {
                activity: values.pushActivity,
                points: values.pushPoints,
                order: values.pushOrder,
                marketing: values.pushMarketing
              },
              quietHours: {
                enabled: values.quietHoursEnabled,
                start: values.quietHoursStart ? values.quietHoursStart.format('HH:mm') : undefined,
                end: values.quietHoursEnd ? values.quietHoursEnd.format('HH:mm') : undefined
              }
            }
          }
        } as any)
      }
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
      paddingTop: '0px',
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

      {/* Edit Profile Modal */}
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
          {/* Basic Info Card */}
          <div style={theme.card.elevated as React.CSSProperties}>
            <div style={theme.text.subtitle as React.CSSProperties}>{t('profile.editProfile')}</div>
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
                      // If field is disabled (Google login), skip validation
                      if (!!(user as any)?.providerData?.find((p: any) => p.providerId === 'google.com')) {
                        return Promise.resolve()
                      }
                      
                      // If no input, skip (required rule handles it)
                      if (!value) {
                        return Promise.resolve()
                      }
                      
                      // If email hasn't changed, skip validation
                      if (value === user?.email) {
                        return Promise.resolve()
                      }
                      
                      // ✅ Validate format first
                      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                      if (!emailPattern.test(value)) {
                        return Promise.resolve()
                      }
                      
                      // ✅ Format valid, check uniqueness
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
                          return Promise.reject(new Error(t('profile.emailUsed')))
                        }
                      } catch (error) {
                        // If query fails, allow through
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
                    message: t('profile.phoneInvalidLength') 
                  },
                  {
                    validator: async (_, value) => {
                      if (!value) return Promise.resolve()
                      
                      // If phone hasn't changed, skip
                      const currentPhone = normalizePhoneNumber((user as any)?.profile?.phone || '')
                      const newPhone = normalizePhoneNumber(value)
                      if (newPhone === currentPhone) {
                        return Promise.resolve()
                      }
                      
                      // ✅ Validate format first
                      const formatPattern = /^((\+?60[1-9]\d{8,9})|(0[1-9]\d{8,9}))$/
                      if (!formatPattern.test(value)) {
                        return Promise.resolve()
                      }
                      
                      // ✅ Format valid, check uniqueness
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
                          // Check if it's the current user
                          const existingUserId = phoneSnap.docs[0].id
                          if (existingUserId !== user?.id) {
                            return Promise.reject(new Error(t('profile.phoneUsed')))
                          }
                        }
                      } catch (error) {
                        // If query fails, allow through
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
                    // Keep only digits, plus and spaces
                    input.value = input.value.replace(/[^\d+\s-]/g, '')
                  }}
                />
          </Form.Item>
          </Form>
          </div>

          {/* Security Settings Card */}
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

          {/* Preference Settings Card */}
          <div style={{ ...(theme.card.elevated as React.CSSProperties), marginTop: 12 }}>
            <div style={theme.text.subtitle as React.CSSProperties}>{t('profile.settings')}</div>
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
            style={{ marginBottom: 12 }}
            label={<span style={{ color: '#FFFFFF' }}>{t('profile.notificationsToggle')}</span>}
          >
            <Switch />
          </Form.Item>
          
          <Form.Item
            name="language"
            label={<span style={{ color: '#FFFFFF' }}>{t('profile.language')}</span>}
            style={{ marginBottom: 0 }}
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

          {/* Push Notification Detailed Settings */}
          <Divider style={{ margin: '16px 0', borderColor: 'rgba(255, 255, 255, 0.1)' }} />
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <BellOutlined style={{ marginRight: 8, color: '#F4AF25' }} />
              <span style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 600 }}>
                {t('profile.pushNotifications.title')}
              </span>
            </div>
            
            {notificationPermission !== 'granted' && (
              <div style={{
                padding: 12,
                borderRadius: 8,
                background: 'rgba(244, 175, 37, 0.1)',
                border: '1px solid rgba(244, 175, 37, 0.6)',
                marginBottom: 12
              }}>
                <Typography.Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 12 }}>
                  {notificationPermission === 'denied'
                    ? t('profile.pushNotifications.permissionDeniedHint')
                    : t('profile.pushNotifications.permissionRequiredHint')
                  }
                </Typography.Text>
              </div>
            )}

            <Form
              form={form}
              layout="vertical"
              style={{ marginTop: 8 }}
            >
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.notifications !== currentValues.notifications
                }
              >
                {({ getFieldValue }) => {
                  const notificationsEnabled = getFieldValue('notifications') && notificationPermission === 'granted'
                  return (
                    <>
                      <div style={{
                        padding: 12,
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        marginBottom: 12,
                        opacity: notificationsEnabled ? 1 : 0.5,
                        pointerEvents: notificationsEnabled ? 'auto' : 'none'
                      }}>
                        <Typography.Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                          {t('profile.pushNotifications.notificationTypes')}
                        </Typography.Text>
                        <Form.Item name="pushActivity" valuePropName="checked" style={{ marginBottom: 8 }}>
                          <Checkbox>
                            <CalendarOutlined style={{ marginRight: 8, color: '#F4AF25' }} />
                            {t('profile.pushNotifications.types.activity')}
                          </Checkbox>
                        </Form.Item>
                        <Form.Item name="pushPoints" valuePropName="checked" style={{ marginBottom: 8 }}>
                          <Checkbox>
                            <WalletOutlined style={{ marginRight: 8, color: '#F4AF25' }} />
                            {t('profile.pushNotifications.types.points')}
                          </Checkbox>
                        </Form.Item>
                        <Form.Item name="pushOrder" valuePropName="checked" style={{ marginBottom: 8 }}>
                          <Checkbox>
                            <ShoppingOutlined style={{ marginRight: 8, color: '#F4AF25' }} />
                            {t('profile.pushNotifications.types.order')}
                          </Checkbox>
                        </Form.Item>
                        <Form.Item name="pushMarketing" valuePropName="checked" style={{ marginBottom: 0 }}>
                          <Checkbox>
                            <GiftOutlined style={{ marginRight: 8, color: '#F4AF25' }} />
                            {t('profile.pushNotifications.types.marketing')}
                          </Checkbox>
                        </Form.Item>
                      </div>

                      <Form.Item
                        name="quietHoursEnabled"
                        valuePropName="checked"
                        style={{ marginBottom: 8 }}
                      >
                        <Space>
                          <Switch disabled={!notificationsEnabled} />
                          <Typography.Text style={{ color: '#FFFFFF' }}>
                            {t('profile.pushNotifications.quietHours.enabled')}
                          </Typography.Text>
                        </Space>
                      </Form.Item>

                      <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) =>
                          prevValues.quietHoursEnabled !== currentValues.quietHoursEnabled
                        }
                      >
                        {({ getFieldValue }) => {
                          const quietEnabled = getFieldValue('quietHoursEnabled') && notificationsEnabled
                          return (
                            <div style={{
                              display: 'flex',
                              gap: 12,
                              marginBottom: 0,
                              opacity: quietEnabled ? 1 : 0.5,
                              pointerEvents: quietEnabled ? 'auto' : 'none'
                            }}>
                              <Form.Item
                                name="quietHoursStart"
                                label={<span style={{ color: '#FFFFFF', fontSize: 12 }}>{t('profile.pushNotifications.quietHours.start')}</span>}
                                style={{ flex: 1, marginBottom: 0 }}
                              >
                                <TimePicker
                                  format="HH:mm"
                                  style={{ width: '100%' }}
                                  disabled={!quietEnabled}
                                />
                              </Form.Item>
                              <div style={{ alignSelf: 'flex-end', paddingBottom: 4, color: '#FFFFFF' }}>—</div>
                              <Form.Item
                                name="quietHoursEnd"
                                label={<span style={{ color: '#FFFFFF', fontSize: 12 }}>{t('profile.pushNotifications.quietHours.end')}</span>}
                                style={{ flex: 1, marginBottom: 0 }}
                              >
                                <TimePicker
                                  format="HH:mm"
                                  style={{ width: '100%' }}
                                  disabled={!quietEnabled}
                                />
                              </Form.Item>
                            </div>
                          )
                        }}
                      </Form.Item>
                    </>
                  )
                }}
              </Form.Item>
            </Form>
          </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Profile
