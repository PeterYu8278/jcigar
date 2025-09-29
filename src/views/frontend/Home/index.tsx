// 首页组件 - Gentleman Club黑金主题
import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Typography, Button, Space, Statistic, Badge, Spin, message } from 'antd'
import { 
  CalendarOutlined, 
  ShoppingOutlined, 
  TeamOutlined,
  FireOutlined,
  CrownOutlined,
  StarOutlined,
  TrophyOutlined
} from '@ant-design/icons'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Navigation, Pagination, A11y } from 'swiper/modules'
// Swiper CSS imports - handled dynamically to avoid TypeScript errors

const { Title, Paragraph, Text } = Typography

import { useNavigate } from 'react-router-dom'
import { getCigars, getUpcomingEvents, getBrands, registerForEvent, unregisterFromEvent } from '../../../services/firebase/firestore'
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
  const [registeringEvents, setRegisteringEvents] = useState<Set<string>>(new Set())
  const [swiperInstance, setSwiperInstance] = useState<any>(null)
  
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

  // 检查用户是否已报名某个活动
  const isUserRegistered = (event: Event): boolean => {
    return !!(user?.id && event.participants?.registered?.includes(user.id))
  }

  // 处理活动报名/取消报名
  const handleEventRegistration = async (eventId: string, isRegistered: boolean) => {
    if (!user?.id) {
      message.warning('请先登录')
      return
    }

    setRegisteringEvents(prev => new Set(prev).add(eventId))
    
    try {
      const result = isRegistered 
        ? await unregisterFromEvent(eventId, user.id)
        : await registerForEvent(eventId, user.id)

      if (result.success) {
        message.success(isRegistered ? '已取消报名' : '报名成功')
        // 更新本地事件状态
        setEvents(prevEvents => 
          prevEvents.map(event => {
            if (event.id === eventId) {
              const updatedRegistered = isRegistered 
                ? event.participants.registered.filter(id => id !== user.id)
                : [...(event.participants.registered || []), user.id]
              
              return {
                ...event,
                participants: {
                  ...event.participants,
                  registered: updatedRegistered
                }
              }
            }
            return event
          })
        )
      } else {
        message.error(result.error?.message || (isRegistered ? '取消报名失败' : '报名失败'))
      }
    } catch (error) {
      message.error(isRegistered ? '取消报名失败' : '报名失败')
    } finally {
      setRegisteringEvents(prev => {
        const newSet = new Set(prev)
        newSet.delete(eventId)
        return newSet
      })
    }
  }

  useEffect(() => {
    // Dynamically import Swiper CSS
    import('swiper/css')
    import('swiper/css/navigation')
    import('swiper/css/pagination')
    
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
      {/* 自定义导航和分页器样式 */}
      <style>{`
        .swiper-slide {
          width: 90px !important;
        }
        .swiper-slide-brands {
          width: 90px !important;
        }
        .swiper-wrapper {
          margin-top: 12px;
          transition-timing-function: linear !important;
        }
        .swiper-button-next-custom,
        .swiper-button-prev-custom {
          position: absolute;
          top: 50%;
          width: 40px;
          height: 40px;
          margin-top: -20px;
          z-index: 10;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(244, 175, 37, 0.8);
          border-radius: 50%;
          color: #000;
          font-weight: bold;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: all 0.3s ease;
        }
        .swiper-button-next-custom:hover,
        .swiper-button-prev-custom:hover {
          background: rgba(244, 175, 37, 1);
          transform: scale(1.1);
        }
        .swiper-button-prev-custom {
          left: -10px;
        }
        .swiper-button-next-custom {
          right: -10px;
        }
        .swiper-pagination-custom {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          z-index: 10;
        }
        .swiper-pagination-bullet-custom {
          width: 8px;
          height: 8px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .swiper-pagination-bullet-active-custom {
          background: #F4AF25;
          transform: scale(1.2);
        }
      `}</style>
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
        <div style={{ padding: '0 0px 0px 0px' }}>
          <MemberProfileCard
            user={user}
            showMemberCard={true}
            onToggleMemberCard={() => {}} // 主页不需要切换功能
            getMembershipText={getMembershipText}
            style={{ margin: '0 auto' }}
          />
        </div>
      </Card>

      

      {/* 功能卡片 - 已移除旧“最新活动”卡片，改为下方新列表 */}

      {/* 品牌导航 - Swiper轮播 */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0, color: '#f8f8f8' }}>{t('home.productNavigation')}</Title>
          <Button 
            type="link" 
            style={{ 
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 600, 
              paddingRight: 0 
            }}
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
          <div style={{ position: 'relative' }}>
            <Swiper
              modules={[Autoplay, Navigation, Pagination, A11y]}
              slidesPerView="auto"
              spaceBetween={12}
              loop={brands.filter(brand => brand.status === 'active').length > 4}
              autoplay={{ 
                delay: 0,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
                reverseDirection: false
              }}
              speed={8000}
              navigation={{
                nextEl: '.swiper-button-next-custom-brands',
                prevEl: '.swiper-button-prev-custom-brands',
              }}
              keyboard={{ enabled: true }}
              a11y={{ enabled: true }}
              style={{ 
                paddingBottom: '40px',
                '--swiper-navigation-color': '#F4AF25',
                '--swiper-pagination-color': '#F4AF25',
                '--swiper-pagination-bullet-inactive-color': 'rgba(255, 255, 255, 0.3)',
                '--swiper-pagination-bullet-inactive-opacity': '0.3'
              } as any}
            >
              {brands
                .filter(brand => brand.status === 'active')
                .map((brand) => (
                  <SwiperSlide key={brand.id} className="swiper-slide-brands">
                    <div 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '4px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        height: '100%'
                      }}
                      onClick={() => navigate(`/brand/${brand.id}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(244, 175, 37, 0.2)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div 
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '8px',
                          backgroundImage: brand.logo ? `url(${brand.logo})` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjQwIiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QnJhbmQ8L3RleHQ+Cjwvc3ZnPgo=',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          border: '2px solid rgba(244, 175, 37, 0.2)'
                        }}
                      />
                      <div style={{ width: '100%', textAlign: 'center' }}>
                        <h3 style={{ 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          color: '#fff',
                          margin: '0 0 4px 0',
                          textAlign: 'center',
                          width: '100%',
                          lineHeight: '1.2',
                          minHeight: '28px',
                          display: 'flex',
                          alignItems: 'top',
                          justifyContent: 'center',
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word'
                        }}>
                          {brand.name}
                        </h3>
                        <p style={{ 
                          fontSize: '10px', 
                          color: '#999',
                          margin: 0,
                          textAlign: 'center',
                          width: '100%',
                          lineHeight: '1.2',
                          minHeight: '12px',
                          display: 'flex',
                          alignItems: 'top',
                          justifyContent: 'center',
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word'
                        }}>
                          {brand.country || ''}
                        </p>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
            </Swiper>
          </div>
        )}
      </div>

      {/* 热门雪茄 - Swiper轮播 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0, color: '#f8f8f8' }}>{t('home.popularCigars')}</Title>
          <Button 
            type="link" 
            style={{ 
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 600, 
              paddingRight: 0 
            }}
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
          <div style={{ position: 'relative' }}>
            <Swiper
              modules={[Autoplay, Navigation, Pagination, A11y]}
              slidesPerView="auto"
              spaceBetween={12}
              loop={cigars.length > 4}
              autoplay={{ 
                delay: 0,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
                reverseDirection: false
              }}
              speed={8000}
              navigation={{
                nextEl: '.swiper-button-next-custom',
                prevEl: '.swiper-button-prev-custom',
              }}
              
              keyboard={{ enabled: true }}
              a11y={{ enabled: true }}
              onSwiper={setSwiperInstance}
              style={{ 
                paddingBottom: '40px',
                '--swiper-navigation-color': '#F4AF25',
                '--swiper-pagination-color': '#F4AF25',
                '--swiper-pagination-bullet-inactive-color': 'rgba(255, 255, 255, 0.3)',
                '--swiper-pagination-bullet-inactive-opacity': '0.3'
              } as any}
            >
              {cigars.slice(0, 10).map((cigar) => (
                <SwiperSlide key={cigar.id}>
                  <div 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '8px',
                      padding: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      height: '100%'
                    }}
                    onClick={() => navigate('/shop')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(244, 175, 37, 0.2)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div 
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        backgroundImage: `url(${cigar.images?.[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjQwIiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2lnYXI8L3RleHQ+Cjwvc3ZnPgo='})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        border: '2px solid rgba(244, 175, 37, 0.2)'
                      }}
                    />
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <h3 style={{ 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: '#fff',
                        margin: '0 0 4px 0',
                        textAlign: 'center',
                        width: '100%',
                        lineHeight: '1.2',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'top',
                        justifyContent: 'center',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word'
                      }}>
                        {cigar.name}
                      </h3>
                      <p style={{ 
                        fontSize: '11px', 
                        color: '#F4AF25',
                        margin: '0 0 4px 0',
                        fontWeight: '500',
                        textAlign: 'center',
                        width: '100%',
                        lineHeight: '1.2',
                        minHeight: '13px',
                        display: 'flex',
                        alignItems: 'top',
                        justifyContent: 'center'
                      }}>
                        RM {cigar.price}
                      </p>
                      <p style={{ 
                        fontSize: '10px', 
                        color: '#999',
                        margin: 0,
                        textAlign: 'center',
                        width: '100%',
                        lineHeight: '1.2',
                        minHeight: '12px',
                        display: 'flex',
                        alignItems: 'top',
                        justifyContent: 'center',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word'
                      }}>
                        {cigar.origin}
                      </p>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>           
            
            {/* 自定义分页器 */}
            <div 
              className="swiper-pagination-custom"
              style={{
                position: 'absolute',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '8px',
                zIndex: 10
              }}
            />
          </div>
        )}
      </div>

      {/* 最新活动 列表（真实数据） */}
      <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: '0 0 16px', color: '#f8f8f8' }}>{t('home.latestEvents')}</Title>
          <Button 
            type="link" 
            style={{ 
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 600, 
              paddingRight: 0 
            }}
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
                    {(() => {
                      const isRegistered = isUserRegistered(ev as Event)
                      const isLoading = registeringEvents.has(ev.id)
                      const isPastDeadline = ev.schedule?.registrationDeadline && 
                        new Date(ev.schedule.registrationDeadline) < new Date()
                      
                      return (
                        <Button 
                          type="primary" 
                          size="small" 
                          loading={isLoading}
                          disabled={isPastDeadline}
                          style={{ 
                            background: isRegistered 
                              ? 'linear-gradient(to right,#ff6b6b,#ee5a52)' 
                              : 'linear-gradient(to right,#FDE08D,#C48D3A)', 
                            color: '#0a0a0a', 
                            fontWeight: 700,
                            opacity: isPastDeadline ? 0.5 : 1
                          }} 
                          onClick={() => handleEventRegistration(ev.id, !!isRegistered)}
                        >
                          {isPastDeadline 
                            ? '报名已截止' 
                            : isRegistered 
                              ? '取消报名' 
                              : t('events.join')
                          }
                        </Button>
                      )
                    })()}
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
