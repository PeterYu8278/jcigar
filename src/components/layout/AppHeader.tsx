// 浮动视图切换按钮（替代原 AppHeader UI）
import React from 'react'
import { Button, Tooltip } from 'antd'
import { HomeOutlined, DashboardOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/modules/auth'

const AppHeader: React.FC = () => {
  const { isAdmin } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const isInAdmin = location.pathname.startsWith('/admin')

  const handleToggle = () => {
    if (isInAdmin) {
      navigate('/')
    } else {
      navigate('/admin')
    }
  }

  // 非管理员不显示浮标
  if (!isAdmin) return null

  return (
    <Tooltip title={isInAdmin ? t('navigation.home') : t('navigation.admin')} placement="left">
      <Button
        type="primary"
        shape="circle"
        size="large"
        onClick={handleToggle}
        icon={isInAdmin ? <HomeOutlined /> : <DashboardOutlined />}
        style={{
          position: 'fixed',
          right: 20,
          bottom: 100,
          zIndex: 2000,
          boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
          background: 'linear-gradient(135deg,#FDE08D 0%, #C48D3A 100%)',
          border: 'none',
          color: '#111'
        }}
      />
    </Tooltip>
  )
}

export default AppHeader
