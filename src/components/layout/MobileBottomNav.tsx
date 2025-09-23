// 手机端底部导航组件 - 雪茄客黑金主题
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
  DollarOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../../store/modules/auth'

const { Footer } = Layout

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin } = useAuthStore()

  // 普通用户导航项
  const frontendNavItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
      badge: null
    },
    {
      key: '/events',
      icon: <CalendarOutlined />,
      label: '聚会活动',
      badge: null
    },
    {
      key: '/shop',
      icon: <ShoppingCartOutlined />,
      label: '购买雪茄',
      badge: 2
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: '个人档案',
      badge: null
    }
  ]

  // 管理员导航项（选择5个最重要的功能）
  const adminNavItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: '仪表板',
      badge: null
    },
    {
      key: '/admin/users',
      icon: <TeamOutlined />,
      label: '用户管理',
      badge: null
    },
    {
      key: '/admin/events',
      icon: <CalendarOutlined />,
      label: '活动管理',
      badge: null
    },
    {
      key: '/admin/orders',
      icon: <ShoppingCartOutlined />,
      label: '订单管理',
      badge: 5
    },
    {
      key: '/admin/inventory',
      icon: <DatabaseOutlined />,
      label: '库存管理',
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

  const handleNavClick = (path: string) => {
    navigate(path)
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
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
        justifyContent: navItems.length > 4 ? 'space-between' : 'space-around'
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

        {navItems.map((item) => {
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
              padding: 'clamp(6px, 2vw, 8px) clamp(8px, 2vw, 12px)',
              borderRadius: 'clamp(8px, 2vw, 12px)',
              minWidth: navItems.length > 4 ? 'clamp(45px, 10vw, 50px)' : 'clamp(55px, 12vw, 60px)',
              minHeight: 'clamp(50px, 12vw, 60px)',
              transition: 'all 0.2s ease',
              position: 'relative',
              background: active 
                ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.08) 100%)'
                : 'transparent',
              border: active ? '1px solid rgba(255, 215, 0, 0.4)' : '1px solid transparent',
              boxShadow: active ? '0 2px 8px rgba(255, 215, 0, 0.2)' : 'none'
            }}
            className="mobile-nav-item"
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)'
              e.currentTarget.style.background = 'rgba(255, 215, 0, 0.15)'
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.background = active 
                ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.08) 100%)'
                : 'transparent'
            }}
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
              fontSize: 'clamp(18px, 4.5vw, 22px)',
              color: active ? '#ffd700' : '#c0c0c0',
              marginBottom: 'clamp(2px, 1vw, 4px)',
              transition: 'all 0.2s ease',
              filter: active ? 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.6))' : 'none'
            }}>
              {item.icon}
            </div>
            
            <div style={{
              fontSize: 'clamp(9px, 2.2vw, 11px)',
              color: active ? '#ffd700' : '#999999',
              fontWeight: active ? 700 : 500,
              textAlign: 'center',
              lineHeight: 1.1,
              transition: 'all 0.2s ease',
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
    </Footer>
  )
}

export default MobileBottomNav
