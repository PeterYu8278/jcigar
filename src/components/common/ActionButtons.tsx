import React from 'react'
import { Space } from 'antd'
import ViewButton from './ViewButton'
import EditButton from './EditButton'
import DeleteButton from './DeleteButton'

interface ActionButtonsProps {
  /** 项目ID */
  itemId: string
  /** 项目名称 */
  itemName?: string
  /** 查看回调 */
  onView?: (item: any) => void
  /** 编辑回调 */
  onEdit?: (item: any) => void
  /** 删除回调 */
  onDelete?: (id: string) => Promise<{ success: boolean; error?: string | Error }>
  /** 删除成功回调 */
  onDeleteSuccess?: () => void
  /** 删除失败回调 */
  onDeleteError?: (error: Error) => void
  /** 删除确认标题 */
  deleteConfirmTitle?: string
  /** 删除确认内容 */
  deleteConfirmContent?: string
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large'
  /** 按钮类型 */
  type?: 'link' | 'default' | 'primary' | 'dashed' | 'text'
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义样式 */
  style?: React.CSSProperties
  /** 是否显示查看按钮 */
  showView?: boolean
  /** 是否显示编辑按钮 */
  showEdit?: boolean
  /** 是否显示删除按钮 */
  showDelete?: boolean
  /** 是否显示图标 */
  showIcon?: boolean
  /** 加载状态 */
  loading?: boolean
  /** 按钮间距 */
  size?: 'small' | 'middle' | 'large'
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  itemId,
  itemName,
  onView,
  onEdit,
  onDelete,
  onDeleteSuccess,
  onDeleteError,
  deleteConfirmTitle,
  deleteConfirmContent,
  size = 'small',
  type = 'link',
  disabled = false,
  style,
  showView = true,
  showEdit = true,
  showDelete = true,
  showIcon = true,
  loading = false
}) => {
  return (
    <Space size="small" style={{ justifyContent: 'center', width: '100%', ...style }}>
      {showView && onView && (
        <ViewButton
          itemId={itemId}
          itemName={itemName}
          onView={onView}
          size={size}
          type={type}
          disabled={disabled}
          showIcon={showIcon}
          loading={loading}
        />
      )}
      {showEdit && onEdit && (
        <EditButton
          itemId={itemId}
          itemName={itemName}
          onEdit={onEdit}
          size={size}
          type={type}
          disabled={disabled}
          showIcon={showIcon}
          loading={loading}
        />
      )}
      {showDelete && onDelete && (
        <DeleteButton
          itemId={itemId}
          itemName={itemName}
          confirmTitle={deleteConfirmTitle}
          confirmContent={deleteConfirmContent}
          onDelete={onDelete}
          onSuccess={onDeleteSuccess}
          onError={onDeleteError}
          size={size}
          type={type}
          danger={true}
          disabled={disabled}
          showIcon={showIcon}
          loading={loading}
        />
      )}
    </Space>
  )
}

export default ActionButtons
