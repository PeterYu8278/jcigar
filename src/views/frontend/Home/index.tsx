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
import { getCigars, getUpcomingEvents, getBrands } from '../../../services/firebase/firestore'
import type { Event, Cigar, Brand } from '../../../types'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../../store/modules/auth'
import { useQRCode } from '../../../hooks/useQRCode'
import { QRCodeDisplay } from '../../../components/common/QRCodeDisplay'
import { MemberProfileCard } from '../../../components/common/MemberProfileCard'

const Home: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [events, setEvents] = useState<Event[]>([])
  const [cigars, setCigars] = useState<Cigar[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false)
  const [loadingCigars, setLoadingCigars] = useState<boolean>(false)
  const [loadingBrands, setLoadingBrands] = useState<boolean>(false)
  
  // 会员等级文本获取函数
  const getMembershipText = (level: string) => {
    switch (level) {
      case 'bronze': return t('profile.bronzeMember')
      case 'silver': return t('profile.silverMember')
      case 'gold': return t('profile.goldMember')
      case 'platinum': return t('profile.platinumMember')
      default: return t('home.vipMember')
    }
  }
  
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
        setLoadingCigars(true)
        setLoadingBrands(true)
        
        const [eventsData, cigarsData, brandsData] = await Promise.all([
          getUpcomingEvents(),
          getCigars(),
          getBrands()
        ])
        
        setEvents(Array.isArray(eventsData) ? eventsData : [])
        setCigars(Array.isArray(cigarsData) ? cigarsData : [])
        setBrands(Array.isArray(brandsData) ? brandsData : [])
      } catch (e) {
        setEvents([])
        setCigars([])
        setBrands([])
      } finally {
        setLoadingEvents(false)
        setLoadingCigars(false)
        setLoadingBrands(false)
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
            background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
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
        {/* 会员卡 UI - 使用MemberProfileCard组件 */}
        <MemberProfileCard
          user={user}
          showMemberCard={true}
          onToggleMemberCard={() => {}} // 主页不需要切换功能
          getMembershipText={getMembershipText}
          style={{ margin: '0 auto' }}
        />
      </Card>

      

      {/* 功能卡片 - 已移除旧“最新活动”卡片，改为下方新列表 */}

      {/* 品牌导航 */}
      <div style={{ marginTop: 32, marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0, color: '#f8f8f8' }}>{t('home.productNavigation')}</Title>
          <Button 
            type="link" 
            style={{ color: '#ffd700', fontWeight: 600, paddingRight: 0 }}
            onClick={() => navigate('/shop')}
          >
            {t('home.viewAll')}
          </Button>
        </div>
         {loadingBrands ? (
           <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
             <Spin />
           </div>
         ) : (
           <div style={{ 
             display: 'grid', 
             gridTemplateColumns: 'repeat(4, 1fr)', 
             gap: '16px',
             padding: '0 8px'
           }}>
             {brands
               .filter(brand => brand.status === 'active')
               .slice(0, 4)
               .map((brand) => (
               <div key={brand.id} style={{ textAlign: 'center' }}>
                 <div 
                   style={{ 
                     width: 80, 
                     height: 80, 
                     borderRadius: 40, 
                     background: 'rgba(30,30,30,0.7)', 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'center', 
                     margin: '0 auto 12px', 
                     border: '2px solid rgba(255,215,0,0.2)',
                     cursor: 'pointer',
                     transition: 'all 0.3s ease',
                     boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                   }}
                   onClick={() => navigate(`/brand/${brand.id}`)}
                   onMouseEnter={(e) => {
                     e.currentTarget.style.border = '2px solid rgba(255,215,0,0.6)'
                     e.currentTarget.style.transform = 'scale(1.1)'
                     e.currentTarget.style.boxShadow = '0 8px 20px rgba(255,215,0,0.3)'
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.border = '2px solid rgba(255,215,0,0.2)'
                     e.currentTarget.style.transform = 'scale(1)'
                     e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
                   }}
                 >
                   {brand.logo ? (
                     <img 
                       src={brand.logo} 
                       alt={brand.name} 
                       style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: '50%' }} 
                     />
                   ) : (
                     <div style={{ 
                       width: 64, 
                       height: 64, 
                       borderRadius: '50%', 
                       background: 'linear-gradient(45deg, #FFD700, #B8860B)',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       color: '#000',
                       fontWeight: 'bold',
                       fontSize: '20px'
                     }}>
                       {brand.name.charAt(0).toUpperCase()}
                     </div>
                   )}
                 </div>
                 <div style={{ fontSize: 14, color: '#f0f0f0', fontWeight: 600 }}>{brand.name}</div>
               </div>
             ))}
           </div>
         )}
      </div>

      {/* 热门雪茄 - 横向滚动 */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: '0 0 16px', color: '#f8f8f8' }}>{t('home.popularCigars')}</Title>
          <Button 
            type="link" 
            style={{ color: '#ffd700', fontWeight: 600, paddingRight: 0 }}
            onClick={() => navigate('/shop')}
          >
            {t('home.viewAll')}
          </Button>
        </div>
        {loadingCigars ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Spin />
          </div>
        ) : (
          <div style={{ display: 'flex', overflowX: 'auto', gap: 16, paddingBottom: 8 }}>
            {cigars.slice(0, 6).map((cigar) => (
              <div 
                key={cigar.id} 
                style={{ 
                  flex: '0 0 160px', 
                  background: 'rgba(30,30,30,0.6)', 
                  borderRadius: 12, 
                  padding: 16, 
                  textAlign: 'center', 
                  border: '1px solid rgba(255,215,0,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => navigate('/shop')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(255,215,0,0.6)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,215,0,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(255,215,0,0.2)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <img 
                  src={cigar.images?.[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjQ4IiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2lnYXI8L3RleHQ+Cjwvc3ZnPgo='} 
                  alt={cigar.name} 
                  style={{ width: 96, height: 96, objectFit: 'contain', marginBottom: 8 }} 
                />
                <div style={{ fontWeight: 600, color: '#f8f8f8', fontSize: 14 }}>{cigar.name}</div>
                <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 14 }}>RM{cigar.price}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 最新活动 列表（真实数据） */}
      <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: '0 0 16px', color: '#f8f8f8' }}>{t('home.latestEvents')}</Title>
          <Button 
            type="link" 
            style={{ color: '#ffd700', fontWeight: 600, paddingRight: 0 }}
            onClick={() => navigate('/events')}
          >
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
            { title: t('home.bookEvent'), icon: <CalendarOutlined />, path: '/events' },
            { title: t('home.storeNavigation'), icon: <ShoppingOutlined />, path: '/shop' },
            { title: t('home.friendInvite'), icon: <StarOutlined />, path: '/profile' },
            { title: t('home.pointsExchange'), icon: <TrophyOutlined />, path: '/profile' },
          ].map((f) => (
            <Col xs={6} key={f.title}>
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: 8, 
                  background: 'rgba(30,30,30,0.6)', 
                  borderRadius: 12, 
                  padding: 12, 
                  textAlign: 'center', 
                  border: '1px solid rgba(255,215,0,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => navigate(f.path)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(255,215,0,0.6)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,215,0,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(255,215,0,0.2)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
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
