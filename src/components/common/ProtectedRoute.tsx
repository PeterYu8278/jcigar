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
  roles = ['guest', 'member', 'vip', 'admin'], 
  requireAuth = true 
}) => {
  const { user, loading } = useAuthStore()
  const location = useLocation()
  const { t } = useTranslation()

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

  // 已登录但资料不完整（缺少名字、电邮或手机号）
  // 排除完善资料页面本身，避免重定向循环
  const isProfileIncomplete = !user?.displayName || !user?.email || !user?.profile?.phone
  
  if (user && isProfileIncomplete && location.pathname !== '/auth/complete-profile') {
    message.warning('请先完善您的账户信息')
    return <Navigate to="/auth/complete-profile" state={{ from: location }} replace />
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
