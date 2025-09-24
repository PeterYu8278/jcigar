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

const Profile: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  // 模拟用户统计数据
  const userStats = [
    { title: '参加活动', value: 12, icon: <CalendarOutlined /> },
    { title: '购买雪茄', value: 28, icon: <ShoppingOutlined /> },
    { title: '社区积分', value: 1580, icon: <TrophyOutlined /> },
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
      case 'bronze': return '青铜会员'
      case 'silver': return '白银会员'
      case 'gold': return '黄金会员'
      case 'platinum': return '铂金会员'
      default: return '普通会员'
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>个人档案</Title>

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
                      {user?.displayName || '未设置姓名'}
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
                    <Title level={5}>基本信息</Title>
                    <Space direction="vertical" size="small">
                      <div>
                        <Text strong>邮箱：</Text>
                        <Text>{user?.email}</Text>
                      </div>
                      <div>
                        <Text strong>手机：</Text>
                        <Text>{user?.profile?.phone || '未设置'}</Text>
                      </div>
                      <div>
                        <Text strong>加入时间：</Text>
                        <Text>{user?.membership?.joinDate ? new Date(user.membership.joinDate).toLocaleDateString() : '未知'}</Text>
                      </div>
                      <div>
                        <Text strong>最后活跃：</Text>
                        <Text>{user?.membership?.lastActive ? new Date(user.membership.lastActive).toLocaleDateString() : '未知'}</Text>
                      </div>
                    </Space>
                  </div>

                  <div>
                    <Title level={5}>偏好设置</Title>
                    <Space direction="vertical" size="small">
                      <div>
                        <Text strong>语言：</Text>
                        <Text>{user?.profile?.preferences?.language === 'zh' ? '中文' : 'English'}</Text>
                      </div>
                      <div>
                        <Text strong>通知：</Text>
                        <Text>{user?.profile?.preferences?.notifications ? '开启' : '关闭'}</Text>
                      </div>
                    </Space>
                  </div>

                  <div>
                    <Button 
                      type="primary" 
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
                      disabled={!user}
                    >
                      编辑资料
                    </Button>
                  </div>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 统计数据 */}
        <Col span={8}>
          <Card title="我的统计" style={{ height: '100%' }}>
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
          <Card title="最近参加的活动">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ padding: '12px', background: '#f9f9f9', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong>古巴雪茄品鉴会</Text>
                    <br />
                    <Text type="secondary">2024-10-15</Text>
                  </div>
                  <Tag color="green">已参加</Tag>
                </div>
              </div>
              
              <div style={{ padding: '12px', background: '#f9f9f9', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong>威士忌与雪茄搭配品鉴</Text>
                    <br />
                    <Text type="secondary">2024-10-22</Text>
                  </div>
                  <Tag color="blue">已报名</Tag>
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 最近购买 */}
        <Col span={12}>
          <Card title="最近购买">
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
        title="编辑资料"
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
                message.success('保存成功')
                // 更新本地 store 中的 user
                setUser({ ...(user as User), ...payload })
                setEditing(false)
              } else {
                message.error('保存失败，请稍后重试')
              }
            } finally {
              setSaving(false)
            }
          }}
        >
          <Form.Item
            label="姓名"
            name="displayName"
            rules={[{ required: true, message: '请输入您的姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item label="手机" name="phone">
            <Input placeholder="请输入手机号码" />
          </Form.Item>

          <Form.Item label="开启通知" name="notifications" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Profile