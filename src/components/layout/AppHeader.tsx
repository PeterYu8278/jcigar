// 应用头部组件
import React from 'react'
import { Layout, Menu, Avatar, Dropdown, Button, Space, Typography } from 'antd'
import { 
  UserOutlined, 
  SettingOutlined, 
  LogoutOutlined,
  ShoppingCartOutlined,
  BellOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../../store/modules/auth'
import { logoutUser } from '../../services/firebase/auth'

const { Header } = Layout
const { Text } = Typography

const AppHeader: React.FC = () => {
  const { user, isAdmin, logout } = useAuthStore()

  const handleLogout = async () => {
    await logoutUser()
    logout()
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  const adminMenuItems = [
    {
      key: 'dashboard',
      icon: <UserOutlined />,
      label: '管理后台',
    },
    ...userMenuItems,
  ]

  return (
    <Header style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      background: '#fff',
      padding: '0 24px',
      borderBottom: '1px solid #f0f0f0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0, color: '#1890ff' }}>
          雪茄客
        </Typography.Title>
      </div>

      <Space size="middle">
        <Button type="text" icon={<BellOutlined />} />
        <Button type="text" icon={<ShoppingCartOutlined />} />
        
        <Dropdown 
          menu={{ items: isAdmin ? adminMenuItems : userMenuItems }}
          placement="bottomRight"
          arrow
        >
          <Space style={{ cursor: 'pointer' }}>
            <Avatar 
              src={user?.profile?.avatar} 
              icon={<UserOutlined />}
              size="small"
            />
            <Text>{user?.displayName}</Text>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  )
}

export default AppHeader
