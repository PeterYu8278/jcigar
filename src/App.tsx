
import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Layout, App as AntApp } from 'antd'
import AppHeader from './components/layout/AppHeader'
import AppSider from './components/layout/AppSider'
import AppFooter from './components/layout/AppFooter'
import MobileBottomNav from './components/layout/MobileBottomNav'
import ProtectedRoute from './components/common/ProtectedRoute'
import { useAuthStore } from './store/modules/auth'

// 前端页面
import Home from './views/frontend/Home'
import Events from './views/frontend/Events'
import Shop from './views/frontend/Shop'
import Profile from './views/frontend/Profile'
import BrandDetail from './views/frontend/BrandDetail'
import ReloadPage from './views/frontend/Reload'

// 管理后台页面
import AdminDashboard from './views/admin/Dashboard'
import AdminUsers from './views/admin/Users'
import AdminInventory from './views/admin/Inventory'
import AdminEvents from './views/admin/Events'
import AdminOrders from './views/admin/Orders'
import AdminFinance from './views/admin/Finance'
import CloudinaryTestPage from './views/admin/CloudinaryTest'
import PerformanceMonitor from './components/admin/PerformanceMonitor'
import EventOrderDebug from './views/admin/EventOrderDebug'
import PointsConfigPage from './views/admin/PointsConfig'
import VisitSessionsPage from './views/admin/VisitSessions'
import OrphanedUserCleanup from './views/admin/OrphanedUserCleanup'
import FeatureManagement from './views/admin/FeatureManagement'

// 认证页面
import Login from './views/auth/Login'
import Register from './views/auth/Register'
import CompleteProfile from './views/auth/CompleteProfile'

const { Content } = Layout

const AppContent: React.FC = () => {
  const { user, isAdmin, initializeAuth } = useAuthStore()
  const location = useLocation()
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true
    if (typeof window.matchMedia !== 'function') return true
    return window.matchMedia('(min-width: 992px)').matches
  })
  const [siderCollapsed, setSiderCollapsed] = useState(false)
  const [viewportHeight, setViewportHeight] = useState('100vh')

  // 在应用启动时初始化认证（仅一次）
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  // 响应式更新 isDesktop（监听窗口大小变化）
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mediaQuery = window.matchMedia('(min-width: 992px)')
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktop(e.matches)
    }

    // 初始化
    handleChange(mediaQuery)

    // 监听变化
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    } else {
      // 兼容旧版浏览器
      mediaQuery.addListener(handleChange)
      return () => {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])

  // 无需 padding 的页面（认证页面 + 商城页面）
  const noPaddingPages = ['/login', '/register', '/auth/complete-profile', '/shop']
  const needsPadding = !noPaddingPages.includes(location.pathname)
  
  // 认证页面（不显示 header/footer）
  const authPages = ['/login', '/register', '/auth/complete-profile']
  const isAuthPage = authPages.includes(location.pathname)
  
  // 侧边栏显示逻辑：手机端商城页面隐藏，电脑端商城页面显示
  // 逻辑：已登录 AND (是电脑端 OR 不是商城页面)
  const showSider = !!(user && (isDesktop || location.pathname !== '/shop'))

  // 设置实际视口高度（适配移动设备地址栏）
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight
      setViewportHeight(`${vh}px`)
      // 同时设置 CSS 变量供全局使用
      document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`)
    }

    setVH()
    window.addEventListener('resize', setVH)
    window.addEventListener('orientationchange', setVH)

    return () => {
      window.removeEventListener('resize', setVH)
      window.removeEventListener('orientationchange', setVH)
    }
  }, [])

  // 控制 body 滚动（仅认证页面禁止滚动）
  useEffect(() => {
    if (isAuthPage) {
      // 认证页面：禁止 body 滚动
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      // 其他页面：恢复滚动
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
    }

    return () => {
      // 清理：恢复默认
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
    }
  }, [isAuthPage])

  return (
      <Layout style={{ 
        height: viewportHeight,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2d2d2d 100%)',
        position: 'relative',
        overflow: needsPadding ? 'auto' : 'hidden'
      }}>
        {/* 全局背景装饰 */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(255, 215, 0, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 215, 0, 0.02) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(255, 215, 0, 0.01) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
          zIndex: -1
        }} />
        
        {user && !isAuthPage && <AppHeader siderCollapsed={siderCollapsed} isDesktop={isDesktop} showSider={showSider} />}
        <Layout style={{ 
          background: 'transparent',
          flex: 1
        }}>
          {showSider && <AppSider onCollapseChange={setSiderCollapsed} />}
          <Layout style={{ 
            background: 'transparent',
            marginLeft: showSider && isDesktop ? (siderCollapsed ? 64 : 240) : 0,
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Content
              style={{
                paddingTop: needsPadding ? 12 : 0,
                paddingRight: needsPadding ? 12 : 0,
                paddingBottom: needsPadding ? 12 : 0,
                paddingLeft: needsPadding ? 12 : 0,
                margin: 0,
                flex: needsPadding ? 'none' : 1,
                background: 'radial-gradient(ellipse at top, #3c2f1a, #121212)' ,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: needsPadding ? 'hidden' : 'hidden',
                display: needsPadding ? 'block' : 'flex',
                alignItems: needsPadding ? undefined : 'center',
                justifyContent: needsPadding ? undefined : 'center'
              }}
            >
              {/* 内容区域背景装饰 */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.02) 0%, transparent 100%)',
                pointerEvents: 'none'
              }} />
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                <Routes>
                  {/* 认证路由 */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/auth/complete-profile" element={<CompleteProfile />} />
                  
                  {/* 前端路由 */}
                  <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                  <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
                  <Route path="/shop" element={<ProtectedRoute roles={['member','vip', 'admin', 'developer']}><Shop /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute roles={['member','vip', 'admin', 'developer']}><Profile /></ProtectedRoute>} />
                  <Route path="/reload" element={<ProtectedRoute roles={['member','vip', 'admin', 'developer']}><ReloadPage /></ProtectedRoute>} />
                  <Route path="/brand/:brandId" element={<ProtectedRoute roles={['member','vip', 'admin', 'developer']}><BrandDetail /></ProtectedRoute>} />
                  
                  {/* 管理后台路由 */}
                  <Route path="/admin" element={<ProtectedRoute roles={['admin', 'developer']}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute roles={['admin', 'developer']}><AdminUsers /></ProtectedRoute>} />
                  <Route path="/admin/inventory" element={<ProtectedRoute roles={['admin', 'developer']}><AdminInventory /></ProtectedRoute>} />
                  <Route path="/admin/events" element={<ProtectedRoute roles={['admin', 'developer']}><AdminEvents /></ProtectedRoute>} />
                  <Route path="/admin/orders" element={<ProtectedRoute roles={['admin', 'developer']}><AdminOrders /></ProtectedRoute>} />
                  <Route path="/admin/finance" element={<ProtectedRoute roles={['admin', 'developer']}><AdminFinance /></ProtectedRoute>} />
                  <Route path="/admin/points-config" element={<ProtectedRoute roles={['admin', 'developer']}><PointsConfigPage /></ProtectedRoute>} />
                  <Route path="/admin/visit-sessions" element={<ProtectedRoute roles={['admin', 'developer']}><VisitSessionsPage /></ProtectedRoute>} />
                  <Route path="/admin/orphaned-users" element={<ProtectedRoute roles={['developer']}><OrphanedUserCleanup /></ProtectedRoute>} />
                  <Route path="/admin/performance" element={<ProtectedRoute roles={['admin', 'developer']}><PerformanceMonitor /></ProtectedRoute>} />
                  <Route path="/admin/feature-management" element={<ProtectedRoute roles={['developer']}><FeatureManagement /></ProtectedRoute>} />
                  <Route path="/admin/cloudinary-test" element={<ProtectedRoute roles={['developer']}><CloudinaryTestPage /></ProtectedRoute>} />
                  <Route path="/admin/debug-orders" element={<ProtectedRoute roles={['developer']}><EventOrderDebug /></ProtectedRoute>} />
                  
                  {/* 默认重定向 */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </Content>
            {user && !isAuthPage && <AppFooter />}
          </Layout>
        </Layout>
        
        {/* 手机端底部导航 */}
        {user && !isAuthPage && <MobileBottomNav />}
      </Layout>
  )
}

function App() {
  return (
    <Router>
      <AntApp>
        <AppContent />
      </AntApp>
    </Router>
  )
}

export default App

