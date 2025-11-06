// 用户档案页面
import React, { useState } from 'react'
import { Modal, Form, Input, Switch, message, Button } from 'antd'
import { ArrowLeftOutlined, EditOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '../../../store/modules/auth'
import { updateDocument } from '../../../services/firebase/firestore'
import type { User } from '../../../types'
import { useTranslation } from 'react-i18next'
import { ProfileView } from '../../../components/common/ProfileView'
import ImageUpload from '../../../components/common/ImageUpload'
import { auth } from '../../../config/firebase'
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { normalizePhoneNumber } from '../../../utils/phoneNormalization'

const Profile: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false

  const handleEdit = (userToEdit: User) => {
    setEditing(true)
    form.setFieldsValue({
      displayName: userToEdit.displayName || '',
      email: userToEdit.email || '',
      phone: (userToEdit as any)?.profile?.phone || '',
      notifications: (userToEdit as any)?.preferences?.notifications !== false,
    })
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      const currentUser = auth.currentUser
      if (!currentUser) {
        message.error(t('auth.notLoggedIn'))
        return
      }

      // 更新 Firestore 用户文档
      const updates: any = {
        displayName: values.displayName,
        'profile.phone': normalizePhoneNumber(values.phone),
        'preferences.notifications': values.notifications,
        updatedAt: new Date(),
      }

      await updateDocument('users', user!.id, updates)

      // 如果邮箱有变化，需要重新认证后更新
      if (values.email && values.email !== user?.email) {
        if (values.currentPassword) {
          const credential = EmailAuthProvider.credential(
            user?.email || '',
            values.currentPassword
          )
          await reauthenticateWithCredential(currentUser, credential)
          await updateEmail(currentUser, values.email)
          updates.email = values.email
        } else {
          message.warning(t('profile.emailChangeRequiresPassword'))
        }
      }

      // 如果有新密码
      if (values.newPassword) {
        if (values.currentPassword) {
          const credential = EmailAuthProvider.credential(
            user?.email || '',
            values.currentPassword
          )
          await reauthenticateWithCredential(currentUser, credential)
          await updatePassword(currentUser, values.newPassword)
          message.success(t('profile.passwordUpdated'))
        } else {
          message.warning(t('profile.passwordChangeRequiresCurrentPassword'))
        }
      }

      // 更新本地状态
      setUser({
        ...user!,
        displayName: values.displayName,
        email: values.email || user!.email,
        profile: {
          ...(user as any)?.profile,
          phone: normalizePhoneNumber(values.phone)
        }
      } as any)

      message.success(t('profile.saveSuccess'))
      setEditing(false)
    } catch (error: any) {
      console.error('Error saving profile:', error)
      if (error.code === 'auth/wrong-password') {
        message.error(t('profile.incorrectPassword'))
      } else if (error.code === 'auth/weak-password') {
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
      background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
      paddingTop: isMobile ? '60px' : '80px',
      paddingBottom: isMobile ? '80px' : '40px'
    }}>
      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: isMobile ? '0 16px' : '0 24px'
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
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => user && handleEdit(user)}
            style={{ color: '#FFFFFF', fontSize: '20px' }}
          />
        </div>

        {/* Profile View Component */}
        <ProfileView
          user={user}
          readOnly={false}
          showEditButton={false}
        />
      </div>

      {/* Edit Profile Modal */}
      <Modal
        title={t('profile.editProfile')}
        open={editing}
        onOk={handleSave}
        onCancel={() => setEditing(false)}
        confirmLoading={saving}
        width={420}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: '24px' }}
        >
          {/* Avatar Upload */}
          <Form.Item label={t('profile.avatar')}>
            <ImageUpload
              value={(user as any)?.profile?.avatar}
              onChange={async (url) => {
                if (user) {
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
                  })
                  message.success(t('profile.avatarUpdated'))
                }
              }}
              folder="avatars"
            />
          </Form.Item>

          <Form.Item
            name="displayName"
            label={t('profile.nameLabel')}
            rules={[{ required: true, message: t('profile.nameRequired') }]}
          >
            <Input placeholder={t('profile.namePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="email"
            label={t('auth.email')}
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
            label={t('profile.phoneLabel')}
          >
            <Input 
              prefix={<PhoneOutlined />}
              placeholder={t('profile.phonePlaceholder')}
            />
          </Form.Item>

          {/* Current Password (for email/password changes) */}
          <Form.Item
            name="currentPassword"
            label={t('profile.currentPassword')}
            extra={t('profile.currentPasswordHint')}
          >
            <Input.Password placeholder={t('profile.currentPasswordPlaceholder')} />
          </Form.Item>

          {/* New Password */}
          <Form.Item
            name="newPassword"
            label={t('profile.newPassword')}
            rules={[
              {
                min: 6,
                message: t('profile.passwordMinLength')
              }
            ]}
          >
            <Input.Password placeholder={t('profile.newPasswordPlaceholder')} />
          </Form.Item>

          {/* Confirm New Password */}
          <Form.Item
            name="confirmPassword"
            label={t('profile.confirmPassword')}
            dependencies={['newPassword']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error(t('profile.passwordMismatch')))
                },
              }),
            ]}
          >
            <Input.Password placeholder={t('profile.confirmPasswordPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="notifications"
            valuePropName="checked"
          >
            <Switch /> <span style={{ marginLeft: '8px' }}>{t('profile.notificationsToggle')}</span>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Profile
