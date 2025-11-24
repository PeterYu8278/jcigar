// 应用侧边栏组件 - Gentleman Club黑金主题
import React, { useState, useEffect, useMemo } from 'react'
import { Layout, Menu, Button, Typography, Divider } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  CalendarOutlined,
  ShoppingOutlined,
  UserOutlined,
  DashboardOutlined,
  TeamOutlined,
  DatabaseOutlined,
  DollarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShoppingCartOutlined,
  FireOutlined,
  ThunderboltOutlined,
  SyncOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../../store/modules/auth'
import { useTranslation } from 'react-i18next'
import { NAV_KEYS } from '../../i18n/constants'
import { getFeaturesVisibility } from '../../services/firebase/featureVisibility'
import { getFeatureKeyByRoute } from '../../config/featureDefinitions'

const { Sider } = Layout
const { Text } = Typography

interface AppSiderProps {
  onCollapseChange?: (collapsed: boolean) => void
}

const AppSider: React.FC<AppSiderProps> = ({ onCollapseChange }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [featuresVisibility, setFeaturesVisibility] = useState<Record<string, boolean>>({})
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, isDeveloper } = useAuthStore()
  const { t } = useTranslation()

  // 加载功能可见性配置
  useEffect(() => {
    const loadVisibility = async () => {
      const visibility = await getFeaturesVisibility()
      setFeaturesVisibility(visibility)
    }
    loadVisibility()
  }, [])

  // 处理侧边栏收起/展开
  const handleCollapseChange = (collapsed: boolean) => {
    setCollapsed(collapsed)
    onCollapseChange?.(collapsed)
    try {
      const width = collapsed ? '64px' : '240px'
      document.documentElement.style.setProperty('--sider-width', width)
    } catch {}
  }

  // 前端菜单项
  const frontendMenuItemsBase = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: t('navigation.home'),
    },
    {
      key: '/events',
      icon: <CalendarOutlined />,
      label: t('navigation.events'),
    },
    {
      key: '/shop',
      icon: <ShoppingOutlined />,
      label: t('navigation.shop'),
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: t('navigation.profile'),
    },
  ]

  // 管理后台菜单项
  const adminMenuItemsBase = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: t('navigation.dashboard'),
    },
    {
      key: '/admin/users',
      icon: <TeamOutlined />,
      label: t('navigation.users'),
    },
    {
      key: '/admin/events',
      icon: <CalendarOutlined />,
      label: t('navigation.events'),
    },
    {
      key: '/admin/orders',
      icon: <ShoppingCartOutlined />,
      label: t('navigation.orders'),
    },
    {
      key: '/admin/inventory',
      icon: <DatabaseOutlined />,
      label: t('navigation.inventory'),
    },
    {
      key: '/admin/finance',
      icon: <DollarOutlined />,
      label: t('navigation.finance'),
    },
    {
      key: '/admin/points-config',
      icon: <TrophyOutlined />,
      label: t('navigation.pointsConfig'),
    },
    {
      key: '/admin/visit-sessions',
      icon: <ClockCircleOutlined />,
      label: t('navigation.visitSessions'),
    },
    {
      key: '/admin/performance',
      icon: <ThunderboltOutlined />,
      label: t(NAV_KEYS.PERFORMANCE),
    },
  ]

  // 根据功能可见性过滤菜单项（developer 不受限制）
  const frontendMenuItems = useMemo(() => {
    if (isDeveloper) {
      return frontendMenuItemsBase
    }
    return frontendMenuItemsBase.filter(item => {
      const featureKey = getFeatureKeyByRoute(item.key)
      return featureKey ? (featuresVisibility[featureKey] ?? true) : true
    })
  }, [featuresVisibility, isDeveloper, t])

  const adminMenuItems = useMemo(() => {
    if (isDeveloper) {
      const items = [...adminMenuItemsBase]
      items.push({
        key: '/admin/feature-management',
        icon: <SettingOutlined />,
        label: t('navigation.featureManagement', { defaultValue: '功能管理' }),
      })
      return items
    }
    const items = adminMenuItemsBase.filter(item => {
      const featureKey = getFeatureKeyByRoute(item.key)
      return featureKey ? (featuresVisibility[featureKey] ?? true) : true
    })
    
    return items
  }, [featuresVisibility, isDeveloper, t])

  // 为管理员合并前端和管理后台菜单
  const menuItems = isAdmin ? [
    ...frontendMenuItems,
    { type: 'divider' as const },
    ...adminMenuItems
  ] : frontendMenuItems

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  return (
    <Sider 
      trigger={null} 
      collapsible 
      collapsed={collapsed}
      width={240}
      collapsedWidth={64}
      style={{
        background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
        borderRight: '1px solid #ffd700',
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.3)',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 2000
      }}
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
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid #333333',
        position: 'relative'
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FireOutlined style={{ color: '#ffd700', fontSize: '18px' }} />
            <Text style={{ 
              fontWeight: 'bold', 
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: '16px',
              letterSpacing: '1px'
            }}>
              Gentleman Club
            </Text>
          </div>
        )}
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => handleCollapseChange(!collapsed)}
          style={{ 
            fontSize: '16px', 
            width: 48, 
            height: 48,
            color: '#c0c0c0',
            border: '1px solid #333333',
            borderRadius: '8px'
          }}
          className="sider-toggle-button"
        />
      </div>
      
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ 
          borderRight: 0,
          background: 'transparent',
          marginTop: '8px'
        }}
        className="cigar-sidebar-menu"
      />
      
    </Sider>
  )
}

export default AppSider
