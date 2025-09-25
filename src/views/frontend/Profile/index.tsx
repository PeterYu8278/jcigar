// 用户档案页面
import React, { useMemo, useState } from 'react'
import { Row, Col, Card, Typography, Avatar, Tag, Button, Space, Statistic, Modal, Form, Input, Switch, message } from 'antd'
import { 
  UserOutlined, 
  EditOutlined, 
  CalendarOutlined,
  ShoppingOutlined,
  TrophyOutlined
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

import { useAuthStore } from '../../../store/modules/auth'
import { updateDocument } from '../../../services/firebase/firestore'
import type { User } from '../../../types'
import { useTranslation } from 'react-i18next'

const Profile: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

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
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: 10, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent'}}>{t('navigation.profile')}</Title>

      <Row gutter={[16, 16]}>
        {/* 用户信息卡片 */}
        <Col span={16}>
          <Card>
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <Avatar 
                    size={120} 
                    src={user?.profile?.avatar}
                    icon={<UserOutlined />}
                    style={{ marginBottom: 16 }}
                  />
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {user?.displayName || t('profile.noNameSet')}
                    </Title>
                    <Tag color={getMembershipColor(user?.membership?.level || 'bronze')}>
                      {getMembershipText(user?.membership?.level || 'bronze')}
                    </Tag>
                  </div>
                </div>
              </Col>
              
              <Col span={18}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Title level={5} >{t('profile.basicInfo')}</Title>
                    <Space direction="vertical" size="small">
                      <div>
                        <Text strong>{t('auth.email')}:</Text>
                        <Text> {user?.email}</Text>
                      </div>
                      <div>
                        <Text strong>{t('auth.phone')}:</Text>
                        <Text> {user?.profile?.phone || t('profile.notSet')}</Text>
                      </div>
                      <div>
                        <Text strong>{t('profile.memberSince')}:</Text>
                        <Text> {user?.membership?.joinDate ? new Date(user.membership.joinDate).toLocaleDateString() : t('profile.unknown')}</Text>
                      </div>
                      <div>
                        <Text strong>{t('profile.lastLogin')}:</Text>
                        <Text> {user?.membership?.lastActive ? new Date(user.membership.lastActive).toLocaleDateString() : t('profile.unknown')}</Text>
                      </div>
                    </Space>
                  </div>

                  <div>
                    <Title level={5}>{t('profile.preferences')}</Title>
                    <Space direction="vertical" size="small">
                      <div>
                        <Text strong>{t('profile.languageLabel')}:</Text>
                        <Text> {user?.profile?.preferences?.language === 'zh' ? t('language.chinese') : t('language.english')}</Text>
                      </div>
                      <div>
                        <Text strong>{t('profile.notificationsLabel')}:</Text>
                        <Text> {user?.profile?.preferences?.notifications ? t('common.yes') : t('common.no')}</Text>
                      </div>
                    </Space>
                  </div>

                  <div>
                    <Button 
                      type="primary" 
                      icon={<EditOutlined />} 
                      style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }}
                      onClick={() => {
                        if (!user) return
                        form.setFieldsValue({
                          displayName: user.displayName,
                          phone: user.profile?.phone,
                          notifications: user.profile?.preferences?.notifications ?? true,
                        })
                        setEditing(true)
                      }}
                      disabled={!user}
                    >
                      {t('profile.editProfile')}
                    </Button>
                  </div>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 统计数据 */}
        <Col span={8}>
          <Card title={t('profile.myStats')} style={{ height: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {userStats.map((stat, index) => (
                <div key={index} style={{ textAlign: 'center' }}>
                  <Statistic
                    title={stat.title}
                    value={stat.value}
                    prefix={stat.icon}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* 最近活动 */}
        <Col span={12}>
          <Card title={t('profile.recentEvents')}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ padding: '12px', background: '#f9f9f9', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong>古巴雪茄品鉴会</Text>
                    <br />
                    <Text type="secondary">2024-10-15</Text>
                  </div>
                  <Tag color="green">{t('profile.joinedTag')}</Tag>
                </div>
              </div>
              
              <div style={{ padding: '12px', background: '#f9f9f9', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong>威士忌与雪茄搭配品鉴</Text>
                    <br />
                    <Text type="secondary">2024-10-22</Text>
                  </div>
                  <Tag color="blue">{t('profile.registeredTag')}</Tag>
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 最近购买 */}
        <Col span={12}>
          <Card title={t('profile.recentPurchases')}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ padding: '12px', background: '#f9f9f9', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong>Cohiba Behike 52</Text>
                    <br />
                    <Text type="secondary">2024-10-20</Text>
                  </div>
                  <Text strong>RM580</Text>
                </div>
              </div>
              
              <div style={{ padding: '12px', background: '#f9f9f9', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong>Montecristo No.2</Text>
                    <br />
                    <Text type="secondary">2024-10-18</Text>
                  </div>
                  <Text strong>RM320</Text>
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

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