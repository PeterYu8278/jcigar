// 手机端底部导航组件 - Cigar Club黑金主题
import React, { useState, useEffect, useMemo } from 'react'
import { Layout, Badge } from 'antd'
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
import { UniversalScanner } from '../common/UniversalScanner'
import { getFeaturesVisibility } from '../../services/firebase/featureVisibility'
import { getFeatureKeyByRoute } from '../../config/featureDefinitions'

const { Footer } = Layout

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, isDeveloper } = useAuthStore()
  const { t } = useTranslation()
  const [scannerVisible, setScannerVisible] = useState(false)
  const [featuresVisibility, setFeaturesVisibility] = useState<Record<string, boolean>>({})

  // 只有管理员和开发者可以访问扫码功能
  const canAccessQR = isAdmin || isDeveloper

  // 加载功能可见性配置
  useEffect(() => {
    const loadVisibility = async () => {
      const visibility = await getFeaturesVisibility()
      setFeaturesVisibility(visibility)
    }
    loadVisibility()
  }, [])

  // 检查 AI识茄 功能是否可见
  const aiCigarVisible = isDeveloper ? true : (featuresVisibility['ai-cigar'] ?? true)
  
  // 普通会员：如果 AI识茄 功能被隐藏，则隐藏扫码按钮
  // 管理员/开发者：始终显示扫码按钮
  const showScannerButton = canAccessQR || aiCigarVisible

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

  // 管理员导航项
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

  // 根据功能可见性过滤导航项
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

  // 决定当前显示的导航项集合
  const navItems = isInAdminPanel && isAdmin ? adminNavItems : frontendNavItems

  // 将导航项分成两部分（中间插入QR按钮）
  const getDisplayItems = () => {
    const middleIndex = Math.ceil(navItems.length / 2)
    return {
      leftItems: navItems.slice(0, middleIndex),
      rightItems: navItems.slice(middleIndex)
    }
  }

  const { leftItems, rightItems } = getDisplayItems()
  const totalItemsCount = navItems.length + (showScannerButton ? 1 : 0) // +1 for scanner button if visible
  const itemWidth = `${100 / totalItemsCount}%`

  const handleNavClick = (path: string) => {
    navigate(path)
  }

  const handleScanClick = () => {
    setScannerVisible(true)
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    if (path === '/admin') {
      return location.pathname === '/admin'
    }
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const renderNavItem = (item: typeof navItems[0]) => {
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
          width: itemWidth,
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
            fontSize: '24px',
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
          fontSize: '11px',
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
        justifyContent: 'space-around'
      }}
      className="mobile-bottom-nav"
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

      {/* 左侧导航项 */}
      {leftItems.map(renderNavItem)}

      {/* 中间的扫描按钮（仅在显示时渲染） */}
      {showScannerButton && (
      <div
        style={{
          width: itemWidth,
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
          onClick={handleScanClick}
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
        >
          <QrcodeOutlined
              className="qr-icon-large"
            style={{
                fontSize: '50px',
              color: '#111',
            }}
          />
        </button>
      </div>
      )}

      {/* 右侧导航项 */}
      {rightItems.map(renderNavItem)}

      {/* 通用扫描器 */}
      <UniversalScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        defaultTab={canAccessQR ? 'qr' : 'ai'} // 管理员和开发者默认扫码(checkin)，普通用户默认AI
      />
    </Footer>
  )
}

export default MobileBottomNav
