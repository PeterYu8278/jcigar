/**
 * 通知中心组件
 * 管理应用内通知
 */

import React, { useState } from 'react'
import { Badge, Dropdown, List, Button, Empty, Tabs } from 'antd'
import { BellOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'

export interface Notification {
  id: string
  title: string
  content: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: Date
  action?: {
    label: string
    onClick: () => void
  }
}

export interface NotificationCenterProps {
  /** 通知列表 */
  notifications: Notification[]
  /** 标记为已读 */
  onMarkAsRead?: (id: string) => void
  /** 标记全部为已读 */
  onMarkAllAsRead?: () => void
  /** 删除通知 */
  onDelete?: (id: string) => void
  /** 清空所有通知 */
  onClearAll?: () => void
  /** 自定义样式 */
  style?: React.CSSProperties
}

/**
 * 通知中心组件
 * 
 * @example
 * ```tsx
 * const [notifications, setNotifications] = useState<Notification[]>([])
 * 
 * <NotificationCenter
 *   notifications={notifications}
 *   onMarkAsRead={(id) => markAsRead(id)}
 *   onMarkAllAsRead={() => markAllAsRead()}
 *   onDelete={(id) => deleteNotification(id)}
 *   onClearAll={() => clearAllNotifications()}
 * />
 * ```
 */
const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
  style
}) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('all')

  // 计算未读数量
  const unreadCount = notifications.filter(n => !n.read).length

  // 筛选通知
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.read
    return true
  })

  /**
   * 渲染通知列表
   */
  const renderNotifications = () => {
    if (filteredNotifications.length === 0) {
      return (
        <div style={{ padding: 20 }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t(CONTAINER_KEYS.NO_NOTIFICATIONS)}
          />
        </div>
      )
    }

    return (
      <List
        dataSource={filteredNotifications}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            style={{
              padding: '12px 16px',
              background: item.read ? 'transparent' : 'rgba(244, 175, 37, 0.05)',
              cursor: 'pointer'
            }}
            actions={[
              !item.read && onMarkAsRead && (
                <Button
                  type="text"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => onMarkAsRead(item.id)}
                />
              ),
              onDelete && (
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onDelete(item.id)}
                />
              )
            ].filter(Boolean)}
          >
            <List.Item.Meta
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!item.read && (
                    <Badge color="#F4AF25" />
                  )}
                  <span>{item.title}</span>
                </div>
              }
              description={
                <div>
                  <div style={{ marginBottom: 4 }}>{item.content}</div>
                  <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.45)' }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
              }
            />
          </List.Item>
        )}
      />
    )
  }

  /**
   * 下拉内容
   */
  const dropdownContent = (
    <div
      style={{
        width: 400,
        maxHeight: 500,
        background: 'rgba(24, 22, 17, 0.98)',
        borderRadius: 8,
        border: '1px solid rgba(244, 175, 37, 0.3)',
        overflow: 'hidden',
        ...style
      }}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(244, 175, 37, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>通知中心</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {unreadCount > 0 && onMarkAllAsRead && (
              <Button size="small" type="link" onClick={onMarkAllAsRead}>
                全部已读
              </Button>
            )}
            {notifications.length > 0 && onClearAll && (
              <Button size="small" type="link" danger onClick={onClearAll}>
                清空
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'all', label: `全部 (${notifications.length})` },
          { key: 'unread', label: `未读 (${unreadCount})` }
        ]}
        style={{ margin: 0 }}
      />

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {renderNotifications()}
      </div>
    </div>
  )

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      placement="bottomRight"
    >
      <Badge count={unreadCount} offset={[-5, 5]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          style={{ color: 'rgba(255, 255, 255, 0.85)' }}
        />
      </Badge>
    </Dropdown>
  )
}

export default NotificationCenter

