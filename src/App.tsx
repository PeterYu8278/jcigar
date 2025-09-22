import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from 'antd'
import AppHeader from './components/layout/AppHeader'
import AppSider from './components/layout/AppSider'
import AppFooter from './components/layout/AppFooter'
import ProtectedRoute from './components/common/ProtectedRoute'
import { useAuthStore } from './store/modules/auth'

// 前端页面
import Home from './views/frontend/Home'
import Events from './views/frontend/Events'
import Shop from './views/frontend/Shop'
import Profile from './views/frontend/Profile'

// 管理后台页面
import AdminDashboard from './views/admin/Dashboard'
import AdminUsers from './views/admin/Users'
import AdminInventory from './views/admin/Inventory'
import AdminEvents from './views/admin/Events'
import AdminOrders from './views/admin/Orders'
import AdminFinance from './views/admin/Finance'

// 认证页面
import Login from './views/auth/Login'
import Register from './views/auth/Register'

const { Content } = Layout

function App() {
  const { user, isAdmin } = useAuthStore()

  return (
    <Router>
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
          {user && <AppSider />}
          <Layout style={{ 
            padding: '0 24px 24px',
            background: 'transparent'
          }}>
            <Content
              style={{
                padding: 24,
                margin: 0,
                minHeight: 280,
                background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.8) 0%, rgba(45, 45, 45, 0.6) 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 215, 0, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'hidden'
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
                  
                  {/* 管理后台路由 */}
                  <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
                  <Route path="/admin/inventory" element={<ProtectedRoute roles={['admin']}><AdminInventory /></ProtectedRoute>} />
                  <Route path="/admin/events" element={<ProtectedRoute roles={['admin']}><AdminEvents /></ProtectedRoute>} />
                  <Route path="/admin/orders" element={<ProtectedRoute roles={['admin']}><AdminOrders /></ProtectedRoute>} />
                  <Route path="/admin/finance" element={<ProtectedRoute roles={['admin']}><AdminFinance /></ProtectedRoute>} />
                  
                  {/* 默认重定向 */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </Content>
            {user && <AppFooter />}
          </Layout>
        </Layout>
      </Layout>
    </Router>
  )
}

export default App
