/**
 * 页面头部组件
 * 提供统一的页面头部布局（标题、面包屑、操作按钮）
 */

import React from 'react'
import { PageHeader as AntPageHeader, Breadcrumb, Space, Button } from 'antd'
import { ArrowLeftOutlined, HomeOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import type { PageHeaderProps as AntPageHeaderProps } from 'antd'

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

export interface PageHeaderProps extends Omit<AntPageHeaderProps, 'onBack'> {
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
  className,
  ...restProps
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
    <div className={className}>
      {renderBreadcrumb()}
      <AntPageHeader
        title={title}
        subTitle={subTitle}
        onBack={showBack ? handleBack : undefined}
        backIcon={showBack ? <ArrowLeftOutlined /> : false}
        extra={renderActions()}
        tags={tags}
        footer={footer}
        style={{
          padding: '16px 0',
          background: 'transparent'
        }}
        {...restProps}
      />
    </div>
  )
}

export default PageHeader

