import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Layout } from 'antd'
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

// 管理后台页面
import AdminDashboard from './views/admin/Dashboard'
import AdminUsers from './views/admin/Users'
import AdminInventory from './views/admin/Inventory'
import AdminEvents from './views/admin/Events'
import AdminOrders from './views/admin/Orders'
import AdminFinance from './views/admin/Finance'
import CloudinaryTestPage from './views/admin/CloudinaryTest'
import PerformanceMonitor from './components/admin/PerformanceMonitor'

// 认证页面
import Login from './views/auth/Login'
import Register from './views/auth/Register'

const { Content } = Layout

const AppContent: React.FC = () => {
  const { user, isAdmin } = useAuthStore()
  const location = useLocation()
  const isDesktop = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 992px)').matches : true
  const [siderCollapsed, setSiderCollapsed] = useState(false)

  // 无需 padding 的页面
  const noPaddingPages = ['/shop']
  const needsPadding = !noPaddingPages.includes(location.pathname)
  
  // 侧边栏显示逻辑：手机端商城页面隐藏，电脑端商城页面显示
  // 逻辑：已登录 AND (是电脑端 OR 不是商城页面)
  const showSider = user && (isDesktop || location.pathname !== '/shop')

  return (
      <Layout style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2d2d2d 100%)',
        position: 'relative'
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
        
        {user && <AppHeader />}
        <Layout style={{ background: 'transparent' }}>
          {showSider && <AppSider onCollapseChange={setSiderCollapsed} />}
          <Layout style={{ 
            background: 'transparent',
            marginLeft: showSider && isDesktop ? (siderCollapsed ? 64 : 240) : 0
          }}>
            <Content
              style={{
                padding: needsPadding ? 12 : 0,
                margin: 0,
                minHeight: 280,
                background: 'radial-gradient(ellipse at top, #3c2f1a, #121212)' ,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'hidden',
                paddingBottom: needsPadding ? '90px' : '0px' // 为底部导航留出空间
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
                  
                  {/* 前端路由 */}
                  <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                  <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
                  <Route path="/shop" element={<ProtectedRoute roles={['member', 'admin']}><Shop /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute roles={['member', 'admin']}><Profile /></ProtectedRoute>} />
                  <Route path="/brand/:brandId" element={<ProtectedRoute roles={['member', 'admin']}><BrandDetail /></ProtectedRoute>} />
                  
                  {/* 管理后台路由 */}
                  <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
                  <Route path="/admin/inventory" element={<ProtectedRoute roles={['admin']}><AdminInventory /></ProtectedRoute>} />
                  <Route path="/admin/events" element={<ProtectedRoute roles={['admin']}><AdminEvents /></ProtectedRoute>} />
                  <Route path="/admin/orders" element={<ProtectedRoute roles={['admin']}><AdminOrders /></ProtectedRoute>} />
                  <Route path="/admin/finance" element={<ProtectedRoute roles={['admin']}><AdminFinance /></ProtectedRoute>} />
                  <Route path="/admin/performance" element={<ProtectedRoute roles={['admin']}><PerformanceMonitor /></ProtectedRoute>} />
                  <Route path="/admin/cloudinary-test" element={<ProtectedRoute roles={['admin']}><CloudinaryTestPage /></ProtectedRoute>} />
                  
                  {/* 默认重定向 */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </Content>
            {user && <AppFooter />}
          </Layout>
        </Layout>
        
        {/* 手机端底部导航 */}
        {user && <MobileBottomNav />}
      </Layout>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
