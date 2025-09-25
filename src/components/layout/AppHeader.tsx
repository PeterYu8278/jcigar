// 应用头部组件 - Gentleman Club黑金主题
import React from 'react'
import { Layout, Menu, Avatar, Dropdown, Button, Space, Typography, Badge } from 'antd'
import { 
  UserOutlined, 
  SettingOutlined, 
  LogoutOutlined,
  ShoppingCartOutlined,
  BellOutlined,
  CrownOutlined,
  HomeOutlined,
  DashboardOutlined,
  AppstoreOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../../store/modules/auth'
import { logoutUser } from '../../services/firebase/auth'
import { useNavigate, useLocation } from 'react-router-dom'
import LanguageSwitcher from '../common/LanguageSwitcher'
import { useLanguage } from '../../contexts/LanguageContext'

const { Header } = Layout
const { Text } = Typography

const AppHeader: React.FC = () => {
  const { user, isAdmin, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logoutUser()
    logout()
  }

  // 判断当前是否在管理后台
  const isInAdminPanel = location.pathname.startsWith('/admin')

  // 视图切换处理函数
  const handleViewToggle = () => {
    if (isInAdminPanel) {
      navigate('/') // 切换到前端
    } else {
      navigate('/admin') // 切换到管理后台
    }
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ]

  const adminMenuItems = [
    {
      key: 'dashboard',
      icon: <CrownOutlined />,
      label: 'Admin Panel',
    },
    ...userMenuItems,
  ]

  return (
    <Header style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      padding: '0 24px',
      borderBottom: '2px solid #ffd700',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.05) 0%, transparent 50%, rgba(255, 215, 0, 0.05) 100%)',
        pointerEvents: 'none'
      }} />
      
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        <Typography.Title 
          level={3} 
          style={{ 
            margin: 0, 
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 700,
            fontSize: '24px',
            letterSpacing: '2px'
          }}
        >
        
        </Typography.Title>
        
      </div>

      <Space size="middle" style={{ position: 'relative' }}>
        {/* 语言切换器 */}
        <LanguageSwitcher />
        
        {/* 管理员视图切换按钮 - 仅在手机端显示 */}
        {isAdmin && (
          <Button 
            type="text" 
            icon={isInAdminPanel ? <HomeOutlined /> : <DashboardOutlined />}
            onClick={handleViewToggle}
            style={{ 
              color: isInAdminPanel ? '#ffd700' : '#c0c0c0',
              fontSize: '18px',
              border: isInAdminPanel ? '1px solid #ffd700' : '1px solid #333333',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
            className="hover-gold mobile-view-toggle"
            title={isInAdminPanel ? 'Switch to Frontend' : 'Switch to Admin Panel'}
          />
        )}

        <Badge count={3} size="small" color="#ffd700">
          <Button 
            type="text" 
            icon={<BellOutlined />}
            style={{ 
              color: '#c0c0c0',
              fontSize: '18px'
            }}
            className="hover-gold"
          />
        </Badge>
        
        <Badge count={2} size="small" color="#ffd700">
          <Button 
            type="text" 
            icon={<ShoppingCartOutlined />}
            style={{ 
              color: '#c0c0c0',
              fontSize: '18px'
            }}
            className="hover-gold"
          />
        </Badge>
        
        <Dropdown 
          menu={{ items: isAdmin ? adminMenuItems : userMenuItems }}
          placement="bottomRight"
          arrow={{ pointAtCenter: true }}
          overlayStyle={{
            background: '#1a1a1a',
            border: '1px solid #333333',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          <Space style={{ cursor: 'pointer' }} className="header-user-space">
            <Avatar 
              src={user?.profile?.avatar} 
              icon={<UserOutlined />}
              size="default"
              style={{
                border: '2px solid #ffd700',
                background: 'linear-gradient(135deg, #2d2d2d 0%, #444444 100%)'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Text style={{ 
                color: '#f8f8f8', 
                fontWeight: 600,
                fontSize: '14px'
              }}>
                {user?.displayName}
              </Text>
              {isAdmin && (
                <Text style={{ 
                  color: '#ffd700', 
                  fontSize: '12px',
                  fontWeight: 500
                }}>
                  Admin
                </Text>
              )}
            </div>
          </Space>
        </Dropdown>
      </Space>
      
    </Header>
  )
}

export default AppHeader
