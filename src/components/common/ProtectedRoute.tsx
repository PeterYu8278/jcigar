// 路由权限保护组件
import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Spin, Result, Button, message } from 'antd'
import { useAuthStore } from '../../store/modules/auth'
import type { UserRole } from '../../types'
import { canAccessRoute } from '../../config/permissions'

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

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

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
    message.info('请先登录后访问该页面')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 已登录但角色权限不足
  if (user && !canAccessRoute(user.role, location.pathname)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问此页面。"
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            返回上一页
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
        subTitle="您的用户角色无权访问此页面。"
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            返回上一页
          </Button>
        }
      />
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
