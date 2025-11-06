import React from 'react'
import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

interface CreateButtonProps {
  /** 创建成功后的回调 */
  onCreate: () => void
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large'
  /** 按钮类型 */
  type?: 'default' | 'primary' | 'dashed' | 'text'
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
  /** 按钮形状 */
  shape?: 'default' | 'circle' | 'round'
}

const CreateButton: React.FC<CreateButtonProps> = ({
  onCreate,
  size = 'middle',
  type = 'default',
  disabled = false,
  style,
  buttonText,
  showIcon = true,
  loading = false,
  shape = 'default'
}) => {
  const { t } = useTranslation()

  const handleCreate = () => {
    onCreate()
  }

  return (
    <Button
      type={type}
      icon={showIcon ? <PlusOutlined /> : undefined}
      size={size}
      disabled={disabled || loading}
      loading={loading}
      onClick={handleCreate}
      style={style}
      shape={shape}
    >
      {buttonText || t('common.add')}
    </Button>
  )
}

export default CreateButton
