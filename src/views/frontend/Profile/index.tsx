// 用户档案页面
import React, { useMemo, useState } from 'react'
import { Row, Col, Card, Typography, Avatar, Tag, Button, Space, Statistic, Modal, Form, Input, Switch, message, Spin } from 'antd'
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
import { updateDocument, getEventsByUser, getUsers } from '../../../services/firebase/firestore'
import type { User, Event } from '../../../types'
import { useTranslation } from 'react-i18next'
import { MemberProfileCard } from '../../../components/common/MemberProfileCard'
import { getModalThemeStyles, getModalWidth } from '../../../config/modalTheme'
import ImageUpload from '../../../components/common/ImageUpload'
import { auth } from '../../../config/firebase'
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { normalizePhoneNumber } from '../../../utils/phoneNormalization'

const Profile: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [showMemberCard, setShowMemberCard] = useState(false) // 控制头像/会员卡切换
  const [activeTab, setActiveTab] = useState<'cigar' | 'points' | 'activity' | 'referral'>('cigar') // 标签状态
  const [userEvents, setUserEvents] = useState<Event[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [referredUsers, setReferredUsers] = useState<User[]>([])  // 我引荐的用户
  const [loadingReferrals, setLoadingReferrals] = useState(false)
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false

  // 加载用户参与的活动
  React.useEffect(() => {
    const loadUserEvents = async () => {
      if (!user?.id) return
      setLoadingEvents(true)
      try {
        const events = await getEventsByUser(user.id)
        setUserEvents(events)
      } catch (error) {
        console.error('Failed to load user events:', error)
      } finally {
        setLoadingEvents(false)
      }
    }
    loadUserEvents()
  }, [user?.id])

  // 加载我引荐的用户
  React.useEffect(() => {
    const loadReferredUsers = async () => {
      if (!user?.referral?.referrals || user.referral.referrals.length === 0) {
        setReferredUsers([])
        return
      }
      
      setLoadingReferrals(true)
      try {
        const allUsers = await getUsers()
        // 筛选出我引荐的用户
        const referred = allUsers.filter(u => user.referral?.referrals.includes(u.id))
        // 按注册日期降序排序（最新的在前）
        referred.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
          return dateB.getTime() - dateA.getTime()
        })
        setReferredUsers(referred)
      } catch (error) {
        console.error('Failed to load referred users:', error)
      } finally {
        setLoadingReferrals(false)
      }
    }
    loadReferredUsers()
  }, [user?.referral?.referrals])

  // 用户统计数据 - 从实际数据计算
  const userStats = [
    { title: t('profile.eventsJoined'), value: userEvents.length, icon: <CalendarOutlined /> },
    { title: t('profile.cigarsPurchased'), value: 0, icon: <ShoppingOutlined /> },
    { title: t('profile.communityPoints'), value: (user?.membership as any)?.points || 0, icon: <TrophyOutlined /> },
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
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
      }}>
        <div style={{ width: '40px' }} /> {/* 占位符保持居中 */}
        <h1 style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#FFFFFF',
          margin: 0,
          textAlign: 'center',
          flex: 1
        }}>
          {t('navigation.profile')}
        </h1>
      </div>

      {/* User Profile Section */}
      <div style={{alignItems: 'center', textAlign: 'center', marginBottom: '10px'}}>
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
            <span>{getMembershipText(user?.membership?.level || 'bronze')}</span>
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
        
        {/* Edit Button */}
        <button
          onClick={() => {
            if (!user) return
            form.setFieldsValue({
              displayName: user.displayName,
              email: user.email,
              phone: user.profile?.phone,
              notifications: user.profile?.preferences?.notifications ?? true,
              avatar: user.profile?.avatar,
            })
            setEditing(true)
          }}
          style={{
            width: '100%',
            maxWidth: '320px',
            height: '48px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
            border: 'none',
            borderRadius: '8px',
            color: '#111',
            textTransform: 'uppercase',
            marginBottom: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {t('profile.editProfile')}
        </button>


        {/* Stats Section */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '10px', 
          marginBottom: '10px',
          width: '100%',
          maxWidth: '320px',
          margin: '0 auto 10px auto'
        }}>
          {userStats.map((stat, index) => (
            <div key={index} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '8px',
              border: '1px solid rgba(244, 175, 37, 0.2)',
              textAlign: 'center'
            }}>
              
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
          {(['cigar', 'points', 'activity', 'referral'] as const).map((tabKey) => {
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
                case 'cigar': return t('usersAdmin.cigarRecords')
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
          {activeTab === 'cigar' && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {t('usersAdmin.noCigarRecords')}
              </p>
            </div>
          )}

          {activeTab === 'points' && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {t('usersAdmin.noPointsRecords')}
              </p>
            </div>
          )}

          {activeTab === 'activity' && (
            loadingEvents ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px'
              }}>
                <Space direction="vertical" size="middle">
                  <div style={{ fontSize: '24px', color: '#ffd700' }}>
                    <CalendarOutlined spin />
                  </div>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    加载中...
                  </Text>
                </Space>
              </div>
            ) : userEvents.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {t('usersAdmin.noActivityRecords')}
                </p>
              </div>
            ) : (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {userEvents.map((event) => {
                  const startDate = event.schedule.startDate instanceof Date 
                    ? event.schedule.startDate 
                    : (event.schedule.startDate as any)?.toDate 
                      ? (event.schedule.startDate as any).toDate() 
                      : new Date(event.schedule.startDate);
                  
                  const isRegistered = event.participants?.registered?.includes(user?.id || '');
                  const isCheckedIn = event.participants?.checkedIn?.includes(user?.id || '');
                  
                  return (
                    <div
                      key={event.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(244, 175, 37, 0.2)',
                        display: 'flex',
                        gap: '12px'
                      }}
                    >
                      {/* 活动封面 */}
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: 'rgba(255, 255, 255, 0.1)'
                      }}>
                        {event.coverImage ? (
                          <img 
                            src={event.coverImage} 
                            alt={event.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255, 255, 255, 0.3)'
                          }}>
                            <CalendarOutlined style={{ fontSize: '32px' }} />
                          </div>
                        )}
                      </div>
                      
                      {/* 活动信息 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#FFFFFF',
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {event.title}
                        </div>
                        
                        <div style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          marginBottom: '8px'
                        }}>
                          {startDate.toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {/* 状态标签 */}
                          <Tag 
                            color={
                              event.status === 'upcoming' ? 'blue' :
                              event.status === 'ongoing' ? 'green' :
                              event.status === 'completed' ? 'default' :
                              'red'
                            }
                            style={{ margin: 0, fontSize: '11px' }}
                          >
                            {
                              event.status === 'upcoming' ? '即将开始' :
                              event.status === 'ongoing' ? '进行中' :
                              event.status === 'completed' ? '已结束' :
                              '已取消'
                            }
                          </Tag>
                          
                          {/* 参与状态标签 */}
                          {isCheckedIn && (
                            <Tag color="success" style={{ margin: 0, fontSize: '11px' }}>
                              已签到
                            </Tag>
                          )}
                          {isRegistered && !isCheckedIn && (
                            <Tag color="warning" style={{ margin: 0, fontSize: '11px' }}>
                              已报名
                            </Tag>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Space>
            )
          )}

          {activeTab === 'referral' && (
            <>
              {/* 引荐码卡片 */}
              <Card style={{
                background: 'linear-gradient(135deg, rgba(244, 175, 37, 0.15), rgba(244, 175, 37, 0.05))',
                border: '2px dashed rgba(244, 175, 37, 0.4)',
                borderRadius: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                    我的引荐码
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#ffd700',
                    letterSpacing: '3px',
                    marginBottom: '12px',
                    fontFamily: 'monospace'
                  }}>
                    {user?.memberId || '未生成'}
                  </div>
                  <Space size="small">
                    <Button 
                      size="small" 
                      onClick={() => {
                        if (user?.memberId) {
                          navigator.clipboard.writeText(user.memberId);
                          message.success('引荐码已复制');
                        }
                      }}
                    >
                      复制引荐码
                    </Button>
                    <Button 
                      size="small"
                      type="primary"
                      onClick={() => {
                        if (user?.memberId) {
                          const shareText = `加入 Gentleman Club，使用我的引荐码：${user.memberId}，注册可获得额外积分！`;
                          if (navigator.share) {
                            navigator.share({ text: shareText });
                          } else {
                            navigator.clipboard.writeText(shareText);
                            message.success('邀请文字已复制');
                          }
                        }
                      }}
                    >
                      分享邀请
                    </Button>
                  </Space>
                  
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '8px', 
                    background: 'rgba(82, 196, 26, 0.1)', 
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#52c41a'
                  }}>
                    💰 每成功引荐1人注册获得 200 积分
                  </div>
                </div>
              </Card>

              {/* 引荐统计 */}
              <Row gutter={12} style={{ marginBottom: '16px' }}>
                <Col span={12}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(244, 175, 37, 0.2)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffd700' }}>
                      {user?.referral?.totalReferred || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                      累计引荐
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(244, 175, 37, 0.2)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffd700' }}>
                      {user?.membership?.referralPoints || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                      引荐积分
                    </div>
                  </div>
                </Col>
              </Row>

              {/* 引荐记录列表 */}
              {loadingReferrals ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px'
                }}>
                  <Spin />
                </div>
              ) : referredUsers.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    {t('usersAdmin.noReferralRecords')}
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
                    分享您的引荐码给好友，邀请他们加入获得奖励
                  </p>
                </div>
              ) : (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {referredUsers.map((referred) => {
                    const joinDate = referred.createdAt instanceof Date 
                      ? referred.createdAt 
                      : new Date(referred.createdAt);
                    
                    return (
                      <div key={referred.id} style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(244, 175, 37, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        {/* 用户头像 */}
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(244, 175, 37, 0.3), rgba(244, 175, 37, 0.1))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color: '#ffd700',
                          border: '2px solid rgba(244, 175, 37, 0.3)'
                        }}>
                          {referred.displayName?.charAt(0) || '?'}
                        </div>
                        
                        {/* 用户信息 */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>
                            {referred.displayName || '未知用户'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                            {joinDate.toLocaleDateString('zh-CN')} 加入
                          </div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                            会员编号: {referred.memberId || '-'}
                          </div>
                        </div>
                        
                        {/* 会员等级标签 */}
                        <Tag color={getMembershipColor(referred.membership?.level || 'bronze')}>
                          {getMembershipText(referred.membership?.level || 'bronze')}
                        </Tag>
                      </div>
                    );
                  })}
                </Space>
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        title={t('profile.editProfile')}
        open={editing}
        onCancel={() => setEditing(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        width={getModalWidth(isMobile, 520)}
        styles={getModalThemeStyles(isMobile, true)}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ color: '#FFFFFF' }}
          onFinish={async (values: { 
            displayName: string; 
            email: string; 
            phone?: string; 
            currentPassword?: string;
            newPassword?: string;
            notifications: boolean; 
            avatar?: string 
          }) => {
            if (!user) return
            setSaving(true)
            try {
              const currentUser = auth.currentUser;
              if (!currentUser) {
                message.error('用户未登录，请重新登录');
                return;
              }

              // 1. 如果要更新邮箱或密码，需要先重新认证
              let needsReauth = false;
              if (values.email !== user.email || values.newPassword) {
                if (!values.currentPassword) {
                  message.error('更新邮箱或密码需要输入当前密码进行验证');
                  setSaving(false);
                  return;
                }
                needsReauth = true;
              }

              // 2. 重新认证（如果需要）
              if (needsReauth && values.currentPassword) {
                try {
                  const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
                  await reauthenticateWithCredential(currentUser, credential);
                } catch (error: any) {
                  message.error('当前密码验证失败，请检查密码是否正确');
                  setSaving(false);
                  return;
                }
              }

              // 3. 更新 Firebase Auth 邮箱（如果修改了）
              if (values.email !== user.email) {
                try {
                  await updateEmail(currentUser, values.email);
                } catch (error: any) {
                  message.error('邮箱更新失败：' + (error.message || '未知错误'));
                  setSaving(false);
                  return;
                }
              }

              // 4. 更新 Firebase Auth 密码（如果设置了新密码）
              if (values.newPassword) {
                try {
                  await updatePassword(currentUser, values.newPassword);
                  message.success('密码已更新');
                } catch (error: any) {
                  message.error('密码更新失败：' + (error.message || '未知错误'));
                  setSaving(false);
                  return;
                }
              }

              // 5. 标准化手机号
              let normalizedPhone = values.phone;
              if (values.phone) {
                const normalized = normalizePhoneNumber(values.phone);
                if (!normalized) {
                  message.error('手机号格式无效');
                  setSaving(false);
                  return;
                }
                normalizedPhone = normalized;
              }

              // 6. 更新 Firestore 用户文档
              const payload: Partial<User> = {
                displayName: values.displayName,
                email: values.email,
                profile: {
                  ...user.profile,
                  phone: normalizedPhone,
                  avatar: values.avatar,
                  preferences: {
                    language: user.profile?.preferences?.language || 'zh',
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
                form.resetFields()
              } else {
                message.error(t('profile.saveFailed'))
              }
            } catch (error) {
              console.error('Profile update error:', error);
              message.error('更新失败，请重试');
            } finally {
              setSaving(false)
            }
          }}
        >
          <Form.Item
            label={<span style={{ color: '#FFFFFF' }}>{t('profile.avatar')}</span>}
            name="avatar"
          >
            <ImageUpload
              folder="users"
              showPreview={true}
            />
          </Form.Item>
          
          <Form.Item
            label={<span style={{ color: '#FFFFFF' }}>{t('profile.nameLabel')}</span>}
            name="displayName"
            rules={[{ required: true, message: t('profile.nameRequired') }]}
          >
            <Input placeholder={t('profile.namePlaceholder')} />
          </Form.Item>

          <Form.Item 
            label={<span style={{ color: '#FFFFFF' }}>{t('auth.email')}</span>}
            name="email"
            rules={[
              { required: true, message: t('auth.emailRequired') },
              { type: 'email', message: t('auth.emailInvalid') }
            ]}
          >
            <Input placeholder={t('auth.email')} />
          </Form.Item>

          <Form.Item label={<span style={{ color: '#FFFFFF' }}>{t('profile.phoneLabel')}</span>} name="phone">
            <Input placeholder={t('profile.phonePlaceholder')} />
          </Form.Item>

          {/* 密码更新区域 */}
          <Form.Item>
            <div style={{ 
              marginTop: '16px', 
              paddingTop: '16px', 
              borderTop: '1px solid rgba(255, 215, 0, 0.2)' 
            }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                如需更新邮箱或密码，请先输入当前密码验证身份
              </Text>
            </div>
          </Form.Item>

          <Form.Item 
            label={<span style={{ color: '#FFFFFF' }}>当前密码</span>} 
            name="currentPassword"
            help={<span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>更新邮箱或密码时需要</span>}
          >
            <Input.Password placeholder="输入当前密码以验证身份" />
          </Form.Item>

          <Form.Item 
            label={<span style={{ color: '#FFFFFF' }}>新密码</span>} 
            name="newPassword"
            rules={[
              {
                validator: (_, value) => {
                  if (value && value.length < 6) {
                    return Promise.reject(new Error('密码至少6位'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
            help={<span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>留空则不修改密码</span>}
          >
            <Input.Password placeholder="设置新密码（至少6位，留空不修改）" />
          </Form.Item>

          <Form.Item label={<span style={{ color: '#FFFFFF' }}>{t('profile.notificationsToggle')}</span>} name="notifications" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Profile