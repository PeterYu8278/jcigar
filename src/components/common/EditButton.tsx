import React from 'react'
import { Button } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

interface EditButtonProps {
  /** 要编辑的项目ID */
  itemId: string
  /** 要编辑的项目名称（用于调试） */
  itemName?: string
  /** 编辑成功后的回调 */
  onEdit: (item: any) => void
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large'
  /** 按钮类型 */
  type?: 'link' | 'default' | 'primary' | 'dashed' | 'text'
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义样式 */
  style?: React.CSSProperties
  /** 按钮文本 */
  buttonText?: string
  /** 是否显示图标 */
  showIcon?: boolean
  /** 加载状态 */
  loading?: boolean
}

const EditButton: React.FC<EditButtonProps> = ({
  itemId,
  itemName,
  onEdit,
  size = 'small',
  type = 'link',
  disabled = false,
  style,
  buttonText,
  showIcon = true,
  loading = false
}) => {
  const { t } = useTranslation()

  const handleEdit = () => {
    console.log('Edit button clicked for item:', itemId)
    console.log('Item name:', itemName)
    
    // 这里可以添加更多逻辑，比如获取完整的项目数据
    onEdit({ id: itemId, name: itemName })
  }

  return (
    <Button
      type={type}
      icon={showIcon ? <EditOutlined /> : undefined}
      size={size}
      disabled={disabled || loading}
      loading={loading}
      onClick={handleEdit}
      style={style}
    >
      {buttonText || t('common.edit')}
    </Button>
  )
}

export default EditButton
