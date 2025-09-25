// 路由权限保护组件
import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Spin, Result, Button, message } from 'antd'
import { useAuthStore } from '../../store/modules/auth'
import type { UserRole } from '../../types'
import { canAccessRoute } from '../../config/permissions'
import { useTranslation } from 'react-i18next'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: UserRole[]
  requireAuth?: boolean
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  roles = ['guest', 'member', 'admin'], 
  requireAuth = true 
}) => {
  const { user, loading, initializeAuth } = useAuthStore()
  const location = useLocation()
  const { t } = useTranslation()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  // 处理未登录的情况
  useEffect(() => {
    if (!loading && requireAuth && !user) {
      message.info(t('auth.pleaseLogin'))
    }
  }, [loading, requireAuth, user, t])

  // 加载中状态
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    )
  }

  // 需要认证但未登录
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 已登录但角色权限不足
  if (user && !canAccessRoute(user.role, location.pathname)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle={t('messages.accessDenied')}
        extra={
          <Button type="primary" onClick={() => window.history.back()} style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }}>
            {t('common.back')}
          </Button>
        }
      />
    )
  }

  // 角色权限检查
  if (user && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle={t('messages.noPermission')}
        extra={
          <Button type="primary" onClick={() => window.history.back()} style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }}>
            {t('common.back')}
          </Button>
        }
      />
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
