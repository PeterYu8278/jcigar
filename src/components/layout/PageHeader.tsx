/**
 * 页面头部组件
 * 提供统一的页面头部布局（标题、面包屑、操作按钮）
 */

import React from 'react'
import { Breadcrumb, Space, Button, Typography } from 'antd'
import { ArrowLeftOutlined, HomeOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const { Title, Text } = Typography

export interface BreadcrumbItem {
  title: string
  path?: string
  icon?: React.ReactNode
}

export interface PageHeaderAction {
  key: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text'
  danger?: boolean
  disabled?: boolean
  loading?: boolean
}

export interface PageHeaderProps {
  /** 标题 */
  title: string
  /** 副标题 */
  subTitle?: string
  /** 面包屑 */
  breadcrumbs?: BreadcrumbItem[]
  /** 是否显示返回按钮 */
  showBack?: boolean
  /** 自定义返回逻辑 */
  onBack?: () => void
  /** 操作按钮 */
  actions?: PageHeaderAction[]
  /** 额外内容 */
  extra?: React.ReactNode
  /** 标签 */
  tags?: React.ReactNode
  /** 底部内容 */
  footer?: React.ReactNode
  /** 自定义样式类名 */
  className?: string
}

/**
 * 页面头部组件
 * 
 * @example
 * ```tsx
 * // 基础用法
 * <PageHeader
 *   title="用户管理"
 *   subTitle="管理系统用户"
 * />
 * 
 * // 带面包屑
 * <PageHeader
 *   title="用户详情"
 *   breadcrumbs={[
 *     { title: '首页', path: '/', icon: <HomeOutlined /> },
 *     { title: '用户管理', path: '/admin/users' },
 *     { title: '用户详情' }
 *   ]}
 *   showBack
 * />
 * 
 * // 带操作按钮
 * <PageHeader
 *   title="订单列表"
 *   actions={[
 *     {
 *       key: 'create',
 *       label: '创建订单',
 *       icon: <PlusOutlined />,
 *       onClick: handleCreate,
 *       type: 'primary'
 *     },
 *     {
 *       key: 'export',
 *       label: '导出',
 *       icon: <DownloadOutlined />,
 *       onClick: handleExport
 *     }
 *   ]}
 * />
 * ```
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subTitle,
  breadcrumbs,
  showBack = false,
  onBack,
  actions = [],
  extra,
  tags,
  footer,
  className
}) => {
  const navigate = useNavigate()
  const location = useLocation()

  /**
   * 处理返回
   */
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  /**
   * 渲染面包屑
   */
  const renderBreadcrumb = () => {
    if (!breadcrumbs || breadcrumbs.length === 0) {
      return null
    }

    return (
      <Breadcrumb style={{ marginBottom: 16 }}>
        {breadcrumbs.map((item, index) => (
          <Breadcrumb.Item key={index}>
            {item.path ? (
              <a
                onClick={(e) => {
                  e.preventDefault()
                  navigate(item.path!)
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {item.icon}
                {item.title}
              </a>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {item.icon}
                {item.title}
              </span>
            )}
          </Breadcrumb.Item>
        ))}
      </Breadcrumb>
    )
  }

  /**
   * 渲染操作按钮
   */
  const renderActions = () => {
    if (!actions || actions.length === 0) {
      return extra
    }

    return (
      <Space size="middle">
        {actions.map((action) => (
          <Button
            key={action.key}
            type={action.type || 'default'}
            icon={action.icon}
            onClick={action.onClick}
            danger={action.danger}
            disabled={action.disabled}
            loading={action.loading}
          >
            {action.label}
          </Button>
        ))}
        {extra}
      </Space>
    )
  }

  return (
    <div className={className} style={{ padding: '16px 0', background: 'transparent' }}>
      {renderBreadcrumb()}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            {showBack && (
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={handleBack}
                style={{ padding: 0, height: 'auto' }}
              />
            )}
            <Title level={4} style={{ margin: 0 }}>
              {title}
            </Title>
            {tags && <div>{tags}</div>}
          </div>
          {subTitle && (
            <Text type="secondary" style={{ marginLeft: showBack ? 32 : 0 }}>
              {subTitle}
            </Text>
          )}
        </div>
        {renderActions() && <div>{renderActions()}</div>}
      </div>
      {footer && <div>{footer}</div>}
    </div>
  )
}

export default PageHeader

