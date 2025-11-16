import React from 'react'
import { Layout, Space, Typography, Avatar, Button, Tooltip, Divider } from 'antd'
import { HomeOutlined, DashboardOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/modules/auth'
import LanguageSwitcher from '../common/LanguageSwitcher'

const { Header } = Layout
const { Text } = Typography

/**
 * 应用顶部栏
 * - 语言切换
 * - 通知中心
 * - 购物车徽标
 * - 用户信息（头像、昵称、角色标签）
 * - 管理台/首页切换
 */
const AppHeader: React.FC = () => {
  const { user, isAdmin } = useAuthStore()
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

  return (
    <Header
      style={{
        height: 64,
        lineHeight: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        padding: '0 24px',
        borderBottom: '2px solid rgb(255,215,0)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        overflow: 'hidden'
      }}
      className="ant-layout-header"
    >
      {/* 背景装饰条 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(255,215,0,0.05) 0%, transparent 50%, rgba(255,215,0,0.05) 100%)',
          pointerEvents: 'none'
        }}
      />

      {/* 左侧：标题与语言 */}
      <Space size={12} align="center" style={{ position: 'relative' }}>
        <img
          src="https://res.cloudinary.com/dy2zb1n41/image/upload/jep-cigar/brands/JEP_Logo_White_1763310931359_s1pkcz8y617"
          alt="Gentleman Club"
          style={{
            height: 28,
            display: 'block'
          }}
        />
        <LanguageSwitcher />
      </Space>

      {/* 右侧：操作区（已移除通知中心与购物车徽标） */}
      <Space size="middle" align="center" style={{ position: 'relative' }}>
        {/* Admin/Home 切换 */}
        <Tooltip title={isInAdmin ? t('navigation.home') : t('navigation.admin')} placement="bottomRight">
          <Button
            type="text"
            onClick={handleToggle}
            icon={isInAdmin ? <HomeOutlined /> : <DashboardOutlined />}
            className="mobile-view-toggle"
            style={{
              color: 'rgb(192,192,192)',
              fontSize: 18,
              border: '1px solid #333',
              borderRadius: 8,
              padding: '8px 12px'
            }}
          />
        </Tooltip>

        {/* 用户信息 */}
        <Space
          size="small"
          align="center"
          className="header-user-space"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/profile')}
        >
          <Avatar
            size={32}
            src={
              (user as any)?.profile?.avatar ||
              'https://lh3.googleusercontent.com/aida-public/AB6AXuDs5P-wl44y-z3P55qwZDWCSmApe-9yEsTNGmr02UNzEVBeCMwE7hIq_ikKnzQespBptCZg7RY1P5pvidROpLwXpyUdWETLOFTJYuGtSIN_2d53icCJctg5HZDPl5zRc3QfbeMOn0fl6RWLZplcDWF9frxhgWKf4-RKyNaQsWhBGRCkTAVvLMDnCcZUDGLg-c8YjnHcY8-gFFEmIaa-bHoz3lEcP-SgonuSLCTv4Fa7-_dYYF8uQ3H5a7nAxZocj7UyH0Jl9CAQQWET'
            }
            style={{
              border: '2px solid rgb(255,215,0)',
              background: 'linear-gradient(135deg, #2d2d2d 0%, #444 100%)'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Text style={{ color: 'rgb(248,248,248)', fontWeight: 600, fontSize: 14 }}>
              {user?.displayName || user?.email || 'User'}
            </Text>
            <Text style={{ color: 'rgb(255,215,0)', fontSize: 12, fontWeight: 500 }}>
              {isAdmin ? t('roles.admin', { defaultValue: '管理员' }) : t('roles.member', { defaultValue: '会员' })}
            </Text>
          </div>
        </Space>
      </Space>
    </Header>
  )
}

export default AppHeader
