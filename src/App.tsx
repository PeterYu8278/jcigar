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
      <Layout style={{ minHeight: '100vh' }}>
        {user && <AppHeader />}
        <Layout>
          {user && <AppSider />}
          <Layout style={{ padding: '0 24px 24px' }}>
            <Content
              style={{
                padding: 24,
                margin: 0,
                minHeight: 280,
                background: '#fff',
              }}
            >
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
            </Content>
            {user && <AppFooter />}
          </Layout>
        </Layout>
      </Layout>
    </Router>
  )
}

export default App
