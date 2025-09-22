// 应用侧边栏组件
import React, { useState } from 'react'
import { Layout, Menu, Button } from 'antd'
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
} from '@ant-design/icons'
import { useAuthStore } from '../../store/modules/auth'

const { Sider } = Layout

const AppSider: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin } = useAuthStore()

  // 前端菜单项
  const frontendMenuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/events',
      icon: <CalendarOutlined />,
      label: '聚会活动',
    },
    {
      key: '/shop',
      icon: <ShoppingOutlined />,
      label: '购买雪茄',
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: '个人档案',
    },
  ]

  // 管理后台菜单项
  const adminMenuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/admin/users',
      icon: <TeamOutlined />,
      label: '用户管理',
    },
    {
      key: '/admin/events',
      icon: <CalendarOutlined />,
      label: '活动管理',
    },
    {
      key: '/admin/orders',
      icon: <ShoppingCartOutlined />,
      label: '订单管理',
    },
    {
      key: '/admin/inventory',
      icon: <DatabaseOutlined />,
      label: '库存管理',
    },
    {
      key: '/admin/finance',
      icon: <DollarOutlined />,
      label: '财务管理',
    },
  ]

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
      style={{
        background: '#fff',
        borderRight: '1px solid #f0f0f0'
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        {!collapsed && (
          <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
            雪茄客
          </span>
        )}
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          style={{ fontSize: '16px', width: 64, height: 64 }}
        />
      </div>
      
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ borderRight: 0 }}
      />
    </Sider>
  )
}

export default AppSider
