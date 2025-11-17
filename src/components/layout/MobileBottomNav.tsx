// 手机端底部导航组件 - Gentleman Club黑金主题
import React from 'react'
import { Layout, Button, Badge } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  CalendarOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  DashboardOutlined,
  TeamOutlined,
  DatabaseOutlined,
  DollarOutlined,
  QrcodeOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../../store/modules/auth'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { QRScanner } from '../admin/QRScanner'

const { Footer } = Layout

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin } = useAuthStore()
  const { t } = useTranslation()
  const [qrScannerVisible, setQrScannerVisible] = useState(false)
  const [qrScannerMode, setQrScannerMode] = useState<'checkin' | 'checkout'>('checkin')
  // 普通用户导航项
  const frontendNavItems = [
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

  // 管理员导航项（包含6个重要功能）
  const adminNavItems = [
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
      key: '/admin/orders',
      icon: <ShoppingCartOutlined />,
      label: t('navigation.orders'),
      badge: 5
    },
    {
      key: '/admin/inventory',
      icon: <DatabaseOutlined />,
      label: t('navigation.inventory'),
      badge: null
    },
    {
      key: '/admin/finance',
      icon: <DollarOutlined />,
      label: t('navigation.finance'),
      badge: null
    }
  ]

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
  const getDisplayItems = (): { leftItems: typeof navItems; rightItems: typeof navItems } | null => {
    if (!isAdmin) return null
    
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
        background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
        borderTop: '2px solid #ffd700',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
        padding: '8px 16px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
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
                  padding: '8px 12px',
                  borderRadius: '12px',
                  width: '60px',
                  minWidth: '60px',
                  maxWidth: '60px',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  background: active 
                    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.05) 100%)'
                    : 'transparent',
                  border: active ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid transparent'
                }}
                className="mobile-nav-item"
              >
                {item.badge && (
                  <Badge 
                    count={item.badge} 
                    size="small" 
                    color="#ffd700"
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '8px',
                      fontSize: '10px'
                    }}
                  />
                )}
                
                <div style={{
                  fontSize: '20px',
                  color: active ? '#ffd700' : '#c0c0c0',
                  marginBottom: '4px',
                  transition: 'all 0.3s ease'
                }}>
                  {item.icon}
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
          })}

          {/* 中间的QR扫描按钮 */}
          <div
            onClick={handleQRScanClick}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 10,
              marginBottom: '-8px'
            }}
            className="mobile-nav-item"
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 215, 0, 0.4)',
                marginBottom: '4px',
                transition: 'all 0.3s ease'
              }}
            >
              <QrcodeOutlined style={{
                fontSize: '28px',
                color: '#111',
              }} />
            </div>
            <div style={{
              fontSize: '11px',
              color: '#ffd700',
              fontWeight: 600,
              textAlign: 'center',
              lineHeight: 1.2
            }}>
              QR Scan
            </div>
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
                  padding: '8px 12px',
                  borderRadius: '12px',
                  width: '60px',
                  minWidth: '60px',
                  maxWidth: '60px',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  background: active 
                    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.05) 100%)'
                    : 'transparent',
                  border: active ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid transparent'
                }}
                className="mobile-nav-item"
              >
                {item.badge && (
                  <Badge 
                    count={item.badge} 
                    size="small" 
                    color="#ffd700"
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '8px',
                      fontSize: '10px'
                    }}
                  />
                )}
                
                <div style={{
                  fontSize: '20px',
                  color: active ? '#ffd700' : '#c0c0c0',
                  marginBottom: '4px',
                  transition: 'all 0.3s ease'
                }}>
                  {item.icon}
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
                padding: '8px 12px',
                borderRadius: '12px',
                width: navItems.length > 4 ? '60px' : '80px',
                minWidth: navItems.length > 4 ? '60px' : '80px',
                maxWidth: navItems.length > 4 ? '60px' : '80px',
                transition: 'all 0.3s ease',
                position: 'relative',
                background: active 
                  ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.05) 100%)'
                  : 'transparent',
                border: active ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid transparent'
              }}
              className="mobile-nav-item"
            >
              {item.badge && (
                <Badge 
                  count={item.badge} 
                  size="small" 
                  color="#ffd700"
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '8px',
                    fontSize: '10px'
                  }}
                />
              )}
              
              <div style={{
                fontSize: '20px',
                color: active ? '#ffd700' : '#c0c0c0',
                marginBottom: '4px',
                transition: 'all 0.3s ease'
              }}>
                {item.icon}
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
