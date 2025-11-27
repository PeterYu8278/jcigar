// 手机端底部导航组件 - Cigar Club黑金主题
import React, { useState, useEffect, useMemo } from 'react'
import { Layout, Button, Badge } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  CalendarOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  DashboardOutlined,
  TeamOutlined,
  DollarOutlined,
  QrcodeOutlined,
  TrophyOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../../store/modules/auth'
import { useTranslation } from 'react-i18next'
import { QRScanner } from '../admin/QRScanner'
import { getFeaturesVisibility } from '../../services/firebase/featureVisibility'
import { getFeatureKeyByRoute } from '../../config/featureDefinitions'

const { Footer } = Layout

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, isDeveloper } = useAuthStore()
  const { t } = useTranslation()
  const [qrScannerVisible, setQrScannerVisible] = useState(false)
  const [qrScannerMode, setQrScannerMode] = useState<'checkin' | 'checkout'>('checkin')
  const [featuresVisibility, setFeaturesVisibility] = useState<Record<string, boolean>>({})

  // 加载功能可见性配置
  useEffect(() => {
    const loadVisibility = async () => {
      const visibility = await getFeaturesVisibility()
      setFeaturesVisibility(visibility)
    }
    loadVisibility()
  }, [])

  // 普通用户导航项
  const frontendNavItemsBase = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: t('navigation.home'),
      badge: null
    },
    {
      key: '/events',
      icon: <CalendarOutlined />,
      label: t('navigation.events'),
      badge: null
    },
    {
      key: '/shop',
      icon: <ShoppingCartOutlined />,
      label: t('navigation.shop'),
      badge: 2
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: t('navigation.profile'),
      badge: null
    }
  ]

  // 管理员导航项（包含6个重要功能，库存管理和订单管理已移除，因为仪表板有快速操作）
  const adminNavItemsBase = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: t('navigation.dashboard'),
      badge: null
    },
    {
      key: '/admin/users',
      icon: <TeamOutlined />,
      label: t('navigation.users'),
      badge: null
    },
    {
      key: '/admin/events',
      icon: <CalendarOutlined />,
      label: t('navigation.events'),
      badge: null
    },
    {
      key: '/admin/finance',
      icon: <DollarOutlined />,
      label: t('navigation.finance'),
      badge: null
    },
    {
      key: '/admin/points-config',
      icon: <TrophyOutlined />,
      label: t('navigation.pointsConfig'),
      badge: null
    },
    {
      key: '/admin/visit-sessions',
      icon: <ClockCircleOutlined />,
      label: t('navigation.visitSessions'),
      badge: null
    }
  ]

  // 根据功能可见性过滤导航项（developer 不受限制）
  const frontendNavItems = useMemo(() => {
    if (isDeveloper) {
      return frontendNavItemsBase
    }
    return frontendNavItemsBase.filter(item => {
      const featureKey = getFeatureKeyByRoute(item.key)
      return featureKey ? (featuresVisibility[featureKey] ?? true) : true
    })
  }, [featuresVisibility, isDeveloper, t])

  const adminNavItems = useMemo(() => {
    if (isDeveloper) {
      return adminNavItemsBase
    }
    return adminNavItemsBase.filter(item => {
      const featureKey = getFeatureKeyByRoute(item.key)
      return featureKey ? (featuresVisibility[featureKey] ?? true) : true
    })
  }, [featuresVisibility, isDeveloper, t])

  // 判断当前是否在管理后台
  const isInAdminPanel = location.pathname.startsWith('/admin')
  
  // 管理员混合导航：根据当前视图模式切换导航项
  const getAdminNavItems = () => {
    if (isInAdminPanel) {
      // 在管理后台时显示管理导航
      return adminNavItems
    } else {
      // 在前端时显示前端导航，但保持管理员标识
      return frontendNavItems
    }
  }

  const navItems = isAdmin ? getAdminNavItems() : frontendNavItems

  // 如果是管理员，将导航项分成两部分（中间插入QR按钮）
  // 6个导航项分成3-3，中间是QR按钮，共7个位置
  const getDisplayItems = (): { leftItems: typeof navItems; rightItems: typeof navItems } | null => {
    if (!isAdmin) return null
    
    // 6个项分成两半，左侧3个，右侧3个
    const middleIndex = Math.floor(navItems.length / 2)
    return {
      leftItems: navItems.slice(0, middleIndex),
      rightItems: navItems.slice(middleIndex)
    }
  }

  const handleNavClick = (path: string) => {
    navigate(path)
  }

  const handleQRScanClick = () => {
    // 打开QR扫描器，默认check-in模式
    setQrScannerMode('checkin')
    setQrScannerVisible(true)
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    // 父级路由如 '/admin' 仅在完全匹配时高亮，避免与其子路由同时高亮
    if (path === '/admin') {
      return location.pathname === '/admin'
    }
    // 其他项：精确匹配或以 path/ 开头（避免 '/admin' 命中 '/adminX'）
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <Footer 
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70px',
        background: 'linear-gradient(180deg, rgba(45, 45, 45, 0.95) 0%, rgba(0, 0, 0, 0.95) 100%)',
        borderTop: '1px solid rgba(255, 215, 0, 0.3)',
        backdropFilter: 'blur(8px)',
        padding: '0 16px 4px 16px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: isAdmin ? 'space-around' : (navItems.length > 4 ? 'space-between' : 'space-around')
      }}
      className="mobile-bottom-nav"
      data-admin={isAdmin.toString()}
      data-nav-count={navItems.length.toString()}
    >
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.03) 0%, transparent 100%)',
        pointerEvents: 'none'
      }} />

      {isAdmin ? (() => {
        const displayItems = getDisplayItems()
        if (!displayItems) return null
        
        return (
          <>
            {/* 左侧导航项 */}
            {displayItems.leftItems.map((item) => {
            const active = isActive(item.key)
            return (
              <div
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: '4px',
                  width: '14.29%', // 7个位置（6个导航项+1个QR按钮），每个占100/7≈14.29%
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
                className="mobile-nav-item"
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '4px',
                  position: 'relative'
                }}>
                  <div style={{
                    fontSize: '24px', // 图标大小
                    color: active ? '#FFD700' : '#9ca3af',
                    transition: 'all 0.3s ease'
                  }}>
                    {item.icon}
                  </div>
                  {item.badge && (
                    <Badge 
                      count={item.badge} 
                      size="small" 
                      color="#ffd700"
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        zIndex: 1001,
                        fontSize: '10px'
                      }}
                    />
                  )}
                </div>
                
                <div style={{
                  fontSize: '12px', // 文字大小
                  color: active ? '#FFD700' : '#9ca3af',
                  fontWeight: active ? 600 : 400,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%'
                }}>
                  {item.label}
                </div>
              </div>
            )
          })}

          {/* 中间的QR扫描按钮 */}
          <div
            style={{
              width: '14.29%', // 7个位置（6个导航项+1个QR按钮），每个占100/7≈14.29%
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 10
            }}
            className="mobile-nav-item"
          >
            <button
              onClick={handleQRScanClick}
              style={{
                position: 'relative',
                top: '-14px',
                width: '80px', // QR按钮大小
                height: '80px', // QR按钮大小
                borderRadius: '50%',
                border: '4px solid rgba(26, 26, 26, 0.95)',
                background: 'linear-gradient(135deg, #FDE08D 0%, #FDD017 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(255, 215, 0, 0.3)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                padding: 0,
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 215, 0, 0.3)'
              }}
            >
              <QrcodeOutlined 
                style={{
                  color: '#111',
                }}
                className="qr-icon-large"
              />
            </button>
          </div>

            {/* 右侧导航项 */}
            {displayItems.rightItems.map((item) => {
            const active = isActive(item.key)
            return (
              <div
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: '4px',
                  width: '14.29%', // 7个位置（6个导航项+1个QR按钮），每个占100/7≈14.29%
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
                className="mobile-nav-item"
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '4px',
                  position: 'relative'
                }}>
                  <div style={{
                    fontSize: '24px', // 图标大小
                    color: active ? '#FFD700' : '#9ca3af',
                    transition: 'all 0.3s ease'
                  }}>
                    {item.icon}
                  </div>
                  {item.badge && (
                    <Badge 
                      count={item.badge} 
                      size="small" 
                      color="#ffd700"
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        zIndex: 1001,
                        fontSize: '10px'
                      }}
                    />
                  )}
                </div>
                
                <div style={{
                  fontSize: '12px', // 文字大小
                  color: active ? '#FFD700' : '#9ca3af',
                  fontWeight: active ? 600 : 400,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%'
                }}>
                  {item.label}
                </div>
              </div>
            )
            })}
          </>
        )
      })() : (
        // 普通用户导航
        navItems.map((item) => {
          const active = isActive(item.key)
          return (
              <div
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: '4px',
                  width: '20%',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
                className="mobile-nav-item"
              >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
                position: 'relative'
              }}>
                <div style={{
                  fontSize: '20px',
                  color: active ? '#ffd700' : '#c0c0c0',
                  transition: 'all 0.3s ease'
                }}>
                  {item.icon}
                </div>
                {item.badge && (
                  <Badge 
                    count={item.badge} 
                    size="small" 
                    color="#ffd700"
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      zIndex: 1001,
                      fontSize: '10px'
                    }}
                  />
                )}
              </div>
              
              <div style={{
                fontSize: '11px',
                color: active ? '#ffd700' : '#999999',
                fontWeight: active ? 600 : 400,
                textAlign: 'center',
                lineHeight: 1.2,
                transition: 'all 0.3s ease'
              }}>
                {item.label}
              </div>
            </div>
          )
        })
      )}

      {/* QR扫描器 */}
      {isAdmin && (
        <QRScanner
          visible={qrScannerVisible}
          onClose={() => setQrScannerVisible(false)}
          mode={qrScannerMode}
          onSuccess={() => {
            // 扫描成功后可以刷新相关数据
          }}
        />
      )}
    </Footer>
  )
}

export default MobileBottomNav
