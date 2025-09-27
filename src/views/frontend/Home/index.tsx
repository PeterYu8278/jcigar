// 首页组件 - Gentleman Club黑金主题
import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Typography, Button, Space, Statistic, Badge, Spin } from 'antd'
import { 
  CalendarOutlined, 
  ShoppingOutlined, 
  TeamOutlined,
  FireOutlined,
  CrownOutlined,
  StarOutlined,
  TrophyOutlined
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

import { useNavigate } from 'react-router-dom'
import { getUpcomingEvents } from '../../../services/firebase/firestore'
import type { Event } from '../../../types'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../../store/modules/auth'
import { useQRCode } from '../../../hooks/useQRCode'
import { QRCodeDisplay } from '../../../components/common/QRCodeDisplay'

const Home: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [events, setEvents] = useState<Event[]>([])
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false)
  
  // QR Code Hook - 基于用户ID自动生成
  const { qrCodeDataURL, loading: qrLoading, error: qrError } = useQRCode({
    memberId: user?.id,
    memberName: user?.displayName,
    autoGenerate: true
  })

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingEvents(true)
        const list = await getUpcomingEvents()
        setEvents(Array.isArray(list) ? list : [])
      } catch (e) {
        setEvents([])
      } finally {
        setLoadingEvents(false)
      }
    }
    load()
  }, [])
  
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* 顶部标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      </div>
      {/* 欢迎横幅 */}
      <Card 
        className="cigar-card"
        style={{ 
          background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.9) 0%, rgba(45, 45, 45, 0.8) 100%)',
          border: '2px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '20px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* 背景装饰 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, transparent 100%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* 欢迎标题 - 独立一行 */}
          <h1 style={{ 
            color: '#f8f8f8', 
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 700,
            fontSize: '24px',
            textAlign: 'left',
            margin: 0,
            padding: 0,
            lineHeight: 1.8
          }}>
            {t('home.welcomeTitle')}
          </h1>
          
          {/* 副标题和火焰图标 - 并排显示 */}
          <Row align="middle" justify="center" style={{ marginBottom: 3 }}>
            <Col span={16}>
              <Paragraph style={{ color: '#c0c0c0', fontSize: '12px', lineHeight: 1.4, textAlign: 'left' }}>
                {t('home.welcomeSubtitle')}
              </Paragraph>
            </Col>
            <Col span={8} style={{ textAlign: 'center' }}>
              <FireOutlined style={{ 
                fontSize: '55px', 
                color: 'rgba(255, 215, 0, 0.6)',
                filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.3))'
              }} />
            </Col>
          </Row>
        </div>
        {/* 会员卡 UI */}
      <div style={{
        position: 'relative',
        borderRadius: 20,
        background: 'linear-gradient(145deg, #1A1A1A 0%, #0A0A0A 100%)',
        border: '1px solid rgba(212, 175, 55, 0.25)',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 15% 25%, rgba(212,175,55,0.15), transparent 40%), radial-gradient(circle at 85% 75%, rgba(212,175,55,0.1), transparent 40%)'
        }} />
        <div style={{ position: 'relative', zIndex: 1, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', letterSpacing: 1 }}>Gentleman Club</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37', letterSpacing: 2 }}>CIGAR CONNOISSEUR</div>
            </div>
            <QRCodeDisplay
              qrCodeDataURL={qrCodeDataURL}
              loading={qrLoading}
              error={qrError}
              size={54}
              showPlaceholder={true}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundImage: user?.profile?.avatar ? `url(${user.profile.avatar})` : 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuDs5P-wl44y-z3P55qwZDWCSmApe-9yEsTNGmr02UNzEVBeCMwE7hIq_ikKnzQespBptCZg7RY1P5pvidROpLwXpyUdWETLOFTJYuGtSIN_2d53icCJctg5HZDPl5zRc3QfbeMOn0fl6RWLZplcDWF9frxhgWKf4-RKyNaQsWhBGRCkTAVvLMDnCcZUDGLg-c8YjnHcY8-gFFEmIaa-bHoz3lEcP-SgonuSLCTv4Fa7-_dYYF8uQ3H5a7nAxZocj7UyH0Jl9CAQQWET)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '2px solid #D4AF37',
                boxShadow: '0 6px 16px rgba(0,0,0,0.5)'
              }} />
              <div>
                <div style={{ color: '#ffffff', fontSize: 20, fontWeight: 700 }}>{user?.displayName || '会员'}</div>
                <div style={{ color: '#D4AF37', fontSize: 12, fontWeight: 700 }}>
                  {user?.membership?.level === 'bronze' ? t('profile.bronzeMember') :
                   user?.membership?.level === 'silver' ? t('profile.silverMember') :
                   user?.membership?.level === 'gold' ? t('profile.goldMember') :
                   user?.membership?.level === 'platinum' ? t('profile.platinumMember') :
                   t('home.vipMember')}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{t('home.memberId')}</div>
              <div style={{ color: '#ffffff', fontSize: 16, fontWeight: 700, letterSpacing: 2 }}>
                {user?.id ? `C${user.id.slice(-4).toUpperCase()}` : 'C0000'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 }}>积分</div>
              <div style={{ color: '#D4AF37', fontSize: 14, fontWeight: 700 }}>
                {(user?.membership as any)?.points || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
      </Card>

      

      {/* 功能卡片 - 已移除旧“最新活动”卡片，改为下方新列表 */}

      {/* 商品导航 */}
      <div style={{ marginTop: 32, marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0, color: '#f8f8f8' }}>{t('home.productNavigation')}</Title>
          <Button type="link" style={{ color: '#ffd700', fontWeight: 600, paddingRight: 0 }}>
            {t('home.viewAll')}
          </Button>
        </div>
        <Row gutter={[16, 16]}>
          {[
            { name: '高希霸', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIu_k8y8X7w7V6U5T4S3R2Q1P0Z9Y8x8w8v8u8t8s8r8q8p7o7n7m7l7k7j_i_h_g' },
            { name: '帕特加斯', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7x7W6v6U5T4S3R2Q1P0Z9Y8x8w8v8u8t8s8r8q8p7o7n7m7l7k7j_i_h_g_f' },
            { name: '蒙特', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCz8r7q6p5o4n3m2l1k0j_i_h_g_f_e_d_c_b_a_z_y_x_w_v_u_t_s_r_q_p_o' },
            { name: '罗密欧', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0l0k1j_i_h_g_f_e_d_c_b_a_z_y_x_w_v_u_t_s_r_q_p_o_n_m_l_k_j' },
          ].map((b) => (
            <Col xs={6} key={b.name} style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(30,30,30,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', border: '2px solid rgba(255,215,0,0.2)' }}>
                <img src={b.img} alt={b.name} style={{ width: 36, height: 36, objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: 12, color: '#f0f0f0' }}>{b.name}</div>
        </Col>
          ))}
      </Row>
      </div>

      {/* 热门雪茄 - 横向滚动 */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: '0 0 16px', color: '#f8f8f8' }}>{t('home.popularCigars')}</Title>
          <Button type="link" style={{ color: '#ffd700', fontWeight: 600, paddingRight: 0 }}>
            {t('home.viewAll')}
          </Button>
        </div>
        <div style={{ display: 'flex', overflowX: 'auto', gap: 16, paddingBottom: 8 }}>
          {[
            { name: '高希霸 Behike', price: 'RM1,888', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDewnAUejRKwMqvfBd6D1XYCYb6e1bHT4EMa32ffMwOq2kYtoUtYiXbrhB-kvCwIHPPFLJ4xHP8DqJo2SjSxzCttrqZzb3n-Fj4J-OuBHbhbCXNKz1nadbvLMqAxZE6VFMVf0uEjrPuNz9nELRZRjhNZkZ_DigrNhgW5SwOQXiDpqxHqjCWHjyAecETKR7mAa5pg4-HuAuh6QKh-EEPpC69-ZrlqOxfIZqDvEWGyNJKBKgrRiUCB5K2Ze5epbRzTDtak-k_0AV6htej' },
            { name: '帕特加斯 D系列', price: 'RM888', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTLERvBearfV-iCSv2pYSL1EAVhlK4GHAHDfLzs8djn-3JCx0vE-dmdAvbntg22hzDsyYYMmPXHL8vBd-qksaR1EOC0RyitWSvwiWLGZLqAwljCF1xho4YPA8X7NKpkwWzlGwEFL3L9sWk4_BiMtb1FVYjgw8S9wewx3W69XLz5DOmcfJqGsvEwo3OjXZQyz8jyGhOt-hjq0CYwPymvNQsnaBvOXfuKNNJ2yYGHmZxfVN2vHnzPmUog8rOnpEr5A8qGjPQz1BDUlPc' },
            { name: '蒙特 2号', price: 'RM998', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9o8p7q6o5n4m3l2k1j0i-h_g_f_e_d_c_b_a_z_y_x_w_v_u_t_s_r_q_p_o_n_m_l' },
          ].map((p) => (
            <div key={p.name} style={{ flex: '0 0 160px', background: 'rgba(30,30,30,0.6)', borderRadius: 12, padding: 16, textAlign: 'center', border: '1px solid rgba(255,215,0,0.2)' }}>
              <img src={p.img} alt={p.name} style={{ width: 96, height: 96, objectFit: 'contain', marginBottom: 8 }} />
              <div style={{ fontWeight: 600, color: '#f8f8f8', fontSize: 14 }}>{p.name}</div>
              <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 14 }}>{p.price}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 最新活动 列表（真实数据） */}
      <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: '0 0 16px', color: '#f8f8f8' }}>{t('home.latestEvents')}</Title>
          <Button type="link" style={{ color: '#ffd700', fontWeight: 600, paddingRight: 0 }}>
            {t('home.viewAll')}
          </Button>
        </div>
        {loadingEvents ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Spin />
          </div>
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {events && events.length > 0 ? (
              (events.slice(0, 5)).map((ev) => {
                const name = (ev as any)?.name || (ev as any)?.title || '活动'
                const start = (ev as any)?.schedule?.startDate
                const dateObj = start?.toDate && typeof start.toDate === 'function' ? start.toDate() : (start ? new Date(start) : undefined)
                const dateText = dateObj ? dateObj.toLocaleDateString() : ''
                const desc = (ev as any)?.description || ''
                const img = (ev as any)?.coverImage || (ev as any)?.banner || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgdmlld0JveD0iMCAwIDE2MCAxNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjgwIiB5PSI4MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RXZlbnQ8L3RleHQ+Cjwvc3ZnPgo='
                return (
                  <div key={ev.id} style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'rgba(30,30,30,0.6)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,215,0,0.2)' }}>
                    <img src={img} alt={name} style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#f8f8f8' }}>{name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{dateText}</div>
                      {desc && (
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{desc}</div>
                      )}
                    </div>
                    <Button type="primary" size="small" style={{ background: '#D4AF37', border: 'none', color: '#0a0a0a', fontWeight: 700 }} onClick={() => navigate('/events')}>
                      {t('events.join')}
                    </Button>
            </div>
                )
              })
            ) : (
              <Card style={{ background: 'rgba(30,30,30,0.6)', borderRadius: 12, border: '1px solid rgba(255,215,0,0.2)', color: '#c0c0c0' }}>
                {t('home.noEvents')}
          </Card>
            )}
          </Space>
        )}
      </div>

      {/* 快速导航 */}
      <div style={{ marginBottom: 8 }}>
        <Title level={4} style={{ margin: '0 0 16px', color: '#f8f8f8' }}>{t('home.quickNavigation')}</Title>
        <Row gutter={[16, 16]}>
          {[
            { title: t('home.bookEvent'), icon: <CalendarOutlined /> },
            { title: t('home.storeNavigation'), icon: <TeamOutlined /> },
            { title: t('home.friendInvite'), icon: <StarOutlined /> },
            { title: t('home.pointsExchange'), icon: <TrophyOutlined /> },
          ].map((f) => (
            <Col xs={6} key={f.title}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'rgba(30,30,30,0.6)', borderRadius: 12, padding: 12, textAlign: 'center', border: '1px solid rgba(255,215,0,0.2)' }}>
                <div style={{ color: '#D4AF37', fontSize: 24 }}>{f.icon}</div>
                <div style={{ fontSize: 12, color: '#f8f8f8', fontWeight: 600 }}>{f.title}</div>
            </div>
        </Col>
          ))}
      </Row>
    </div>

    </div>
  )
}

export default Home
