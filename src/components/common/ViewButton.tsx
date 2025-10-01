import React from 'react'
import { Button } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

interface ViewButtonProps {
  /** 要查看的项目ID */
  itemId: string
  /** 要查看的项目名称（用于调试） */
  itemName?: string
  /** 查看成功后的回调 */
  onView: (item: any) => void
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

const ViewButton: React.FC<ViewButtonProps> = ({
  itemId,
  itemName,
  onView,
  size = 'small',
  type = 'link',
  disabled = false,
  style,
  buttonText,
  showIcon = true,
  loading = false
}) => {
  const { t } = useTranslation()

  const handleView = () => {
    console.log('View button clicked for item:', itemId)
    console.log('Item name:', itemName)
    
    // 这里可以添加更多逻辑，比如获取完整的项目数据
    onView({ id: itemId, name: itemName })
  }

  return (
    <Button
      type={type}
      icon={showIcon ? <EyeOutlined /> : undefined}
      size={size}
      disabled={disabled || loading}
      loading={loading}
      onClick={handleView}
      style={style}
    >
    </Button>
  )
}

export default ViewButton
