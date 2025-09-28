// 用户档案页面
import React, { useMemo, useState } from 'react'
import { Row, Col, Card, Typography, Avatar, Tag, Button, Space, Statistic, Modal, Form, Input, Switch, message } from 'antd'
import { 
  UserOutlined, 
  EditOutlined, 
  CalendarOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
  PhoneOutlined,
  MailOutlined,
  CrownOutlined
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

import { useAuthStore } from '../../../store/modules/auth'
import { updateDocument } from '../../../services/firebase/firestore'
import type { User } from '../../../types'
import { useTranslation } from 'react-i18next'
import { MemberProfileCard } from '../../../components/common/MemberProfileCard'

const Profile: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [showMemberCard, setShowMemberCard] = useState(false) // 控制头像/会员卡切换
  const [activeTab, setActiveTab] = useState<'purchase' | 'points' | 'activity' | 'referral'>('purchase') // 标签状态

  // 模拟用户统计数据
  const userStats = [
    { title: t('profile.eventsJoined'), value: 12, icon: <CalendarOutlined /> },
    { title: t('profile.cigarsPurchased'), value: 28, icon: <ShoppingOutlined /> },
    { title: t('profile.communityPoints'), value: 1580, icon: <TrophyOutlined /> },
  ]

  const getMembershipColor = (level: string) => {
    switch (level) {
      case 'bronze': return 'default'
      case 'silver': return 'default'
      case 'gold': return '#faad14'
      case 'platinum': return '#722ed1'
      default: return 'default'
    }
  }

  const getMembershipText = (level: string) => {
    switch (level) {
      case 'bronze': return t('profile.bronzeMember')
      case 'silver': return t('profile.silverMember')
      case 'gold': return t('profile.goldMember')
      case 'platinum': return t('profile.platinumMember')
      default: return t('profile.regularMember')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      color: '#FFFFFF',
      padding: '0'
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        background: 'transparent',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ width: '40px' }} /> {/* 占位符保持居中 */}
        <h1 style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#FFFFFF',
          margin: 0
        }}>
          {t('navigation.profile')}
        </h1>
        <Button
          type="text"
          icon={<EditOutlined />}
                      onClick={() => {
                        if (!user) return
                        form.setFieldsValue({
                          displayName: user.displayName,
                          phone: user.profile?.phone,
                          notifications: user.profile?.preferences?.notifications ?? true,
                        })
                        setEditing(true)
                      }}
          style={{ color: '#FFFFFF', fontSize: '20px' }}
        />
      </div>

      {/* User Profile Section */}
      <div style={{ padding: '24px', textAlign: 'center',
            marginBottom: '10px'}}>
        {/* Avatar/Member Card Toggle */}
        <MemberProfileCard
          user={user}
          showMemberCard={showMemberCard}
          onToggleMemberCard={setShowMemberCard}
          getMembershipText={getMembershipText}
        />

        {/* User Info */}
        <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '24px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            margin: '0 0 8px 0'
          }}>
            {user?.displayName || t('profile.noNameSet')}
          </h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '8px',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            <span>{t('profile.membershipLevel')}: {getMembershipText(user?.membership?.level || 'bronze')}</span>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.2)' }} />
            <span>{t('profile.points')}: {(user?.membership as any)?.points || 0}</span>
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
            <p style={{ margin: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <MailOutlined /> {user?.email || '-'}
            </p>
            <p style={{ margin: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <PhoneOutlined /> {user?.profile?.phone || t('profile.notSet')}
            </p>
          </div>
        </div>


        {/* Stats Section */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '16px', 
          marginBottom: '24px' 
        }}>
          {userStats.map((stat, index) => (
            <div key={index} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid rgba(244, 175, 37, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px', color: '#F4AF25' }}>
                {stat.icon}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '4px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                {stat.title}
              </div>
                </div>
              ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div style={{ padding: '0 16px' }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(244,175,37,0.2)',
          marginBottom: '24px'
        }}>
          {(['purchase', 'points', 'activity', 'referral'] as const).map((tabKey) => {
            const isActive = activeTab === tabKey
            const baseStyle: React.CSSProperties = {
              flex: 1,
              padding: '10px 0',
              fontWeight: 800,
              fontSize: 12,
              outline: 'none',
              borderBottom: '2px solid transparent',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              position: 'relative' as const,
            }
            const activeStyle: React.CSSProperties = {
              color: 'transparent',
              backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
              WebkitBackgroundClip: 'text',
            }
            const inactiveStyle: React.CSSProperties = {
              color: '#A0A0A0',
            }

            const getTabLabel = (key: string) => {
              switch (key) {
                case 'purchase': return t('usersAdmin.purchaseRecords')
                case 'points': return t('usersAdmin.pointsRecords')
                case 'activity': return t('usersAdmin.activityRecords')
                case 'referral': return t('usersAdmin.referralRecords')
                default: return ''
              }
            }

            return (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                style={{ ...baseStyle, ...(isActive ? activeStyle : inactiveStyle) }}
              >
                {getTabLabel(tabKey)}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                    borderRadius: '1px'
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Records List */}
        <div style={{ paddingBottom: '24px' }}>
          {activeTab === 'purchase' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid rgba(244, 175, 37, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#FFFFFF', marginBottom: '4px' }}>
                      Cohiba Behike 52
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      2024-10-20
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#F4AF25' }}>RM580</div>
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid rgba(244, 175, 37, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#FFFFFF', marginBottom: '4px' }}>
                      Montecristo No.2
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      2024-10-18
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#F4AF25' }}>RM320</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'points' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid rgba(244, 175, 37, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#FFFFFF', marginBottom: '4px' }}>
                      购买雪茄获得积分
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      2024-10-20
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#F4AF25' }}>+58</div>
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid rgba(244, 175, 37, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#FFFFFF', marginBottom: '4px' }}>
                      参与活动获得积分
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      2024-10-18
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#F4AF25' }}>+25</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid rgba(244, 175, 37, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#FFFFFF', marginBottom: '4px' }}>
                      古巴雪茄品鉴会
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      2024-10-15
                    </div>
                  </div>
                  <Tag color="green" style={{ fontSize: '10px' }}>{t('profile.joinedTag')}</Tag>
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid rgba(244, 175, 37, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#FFFFFF', marginBottom: '4px' }}>
                      威士忌与雪茄搭配品鉴
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      2024-10-22
                    </div>
                  </div>
                  <Tag color="blue" style={{ fontSize: '10px' }}>{t('profile.registeredTag')}</Tag>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'referral' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid rgba(244, 175, 37, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#FFFFFF', marginBottom: '4px' }}>
                      推荐好友注册
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      2024-10-15
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#F4AF25' }}>+100</div>
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid rgba(244, 175, 37, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#FFFFFF', marginBottom: '4px' }}>
                      好友首次购买
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      2024-10-10
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#F4AF25' }}>+50</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        title={t('profile.editProfile')}
        open={editing}
        onCancel={() => setEditing(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values: { displayName: string; phone?: string; notifications: boolean }) => {
            if (!user) return
            setSaving(true)
            try {
              const payload: Partial<User> = {
                displayName: values.displayName,
                profile: {
                  ...user.profile,
                  phone: values.phone,
                  preferences: {
                    ...user.profile?.preferences,
                    notifications: values.notifications,
                  },
                },
              }
              const res = await updateDocument<User>('users', user.id, payload)
              if (res.success) {
                message.success(t('profile.saveSuccess'))
                // 更新本地 store 中的 user
                setUser({ ...(user as User), ...payload })
                setEditing(false)
              } else {
                message.error(t('profile.saveFailed'))
              }
            } finally {
              setSaving(false)
            }
          }}
        >
          <Form.Item
            label={t('profile.nameLabel')}
            name="displayName"
            rules={[{ required: true, message: t('profile.nameRequired') }]}
          >
            <Input placeholder={t('profile.namePlaceholder')} />
          </Form.Item>

          <Form.Item label={t('profile.phoneLabel')} name="phone">
            <Input placeholder={t('profile.phonePlaceholder')} />
          </Form.Item>

          <Form.Item label={t('profile.notificationsToggle')} name="notifications" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
        </Modal>
      </div>
  )
}

export default Profile