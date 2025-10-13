/**
 * 表单操作组件
 * 提供统一的表单操作按钮布局
 */

import React from 'react'
import { Space, Button, Divider } from 'antd'
import { useTranslation } from 'react-i18next'
import { COMMON_ACTIONS } from '../../i18n/constants'

export interface FormAction {
  key: string
  label: string
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text'
  danger?: boolean
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  onClick?: () => void
  htmlType?: 'button' | 'submit' | 'reset'
}

export interface FormActionsProps {
  // 操作配置
  actions: FormAction[]
  
  // 布局配置
  align?: 'left' | 'center' | 'right'
  direction?: 'horizontal' | 'vertical'
  size?: 'small' | 'middle' | 'large'
  
  // 样式配置
  style?: React.CSSProperties
  className?: string
  
  // 分隔符
  showDivider?: boolean
  dividerText?: string
}

const FormActions: React.FC<FormActionsProps> = ({
  actions,
  align = 'right',
  direction = 'horizontal',
  size = 'middle',
  style,
  className,
  showDivider = true,
  dividerText
}) => {
  const { t } = useTranslation()
  
  // 获取对齐样式
  const getAlignStyle = () => {
    switch (align) {
      case 'left':
        return { justifyContent: 'flex-start' }
      case 'center':
        return { justifyContent: 'center' }
      case 'right':
        return { justifyContent: 'flex-end' }
      default:
        return { justifyContent: 'flex-end' }
    }
  }
  
  return (
    <>
      {showDivider && (
        <Divider 
          style={{ 
            margin: '24px 0 16px 0',
            borderColor: 'var(--cigar-border-primary)'
          }}
        >
          {dividerText}
        </Divider>
      )}
      
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          ...getAlignStyle(),
          ...style
        }}
        className={className}
      >
        <Space direction={direction} size={size}>
          {actions.map((action) => (
            <Button
              key={action.key}
              type={action.type}
              danger={action.danger}
              loading={action.loading}
              disabled={action.disabled}
              icon={action.icon}
              onClick={action.onClick}
              htmlType={action.htmlType || 'button'}
              size={size}
            >
              {action.label}
            </Button>
          ))}
        </Space>
      </div>
    </>
  )
}

/**
 * 表单操作预设Hook
 * 使用国际化的表单操作按钮组合
 */
export const useFormActionPresets = () => {
  const { t } = useTranslation()
  
  return {
    // 保存/取消
    saveCancel: (onSave: () => void, onCancel: () => void, loading = false): FormAction[] => [
      {
        key: 'cancel',
        label: t(COMMON_ACTIONS.CANCEL),
        onClick: onCancel,
        disabled: loading
      },
      {
        key: 'save',
        label: t(COMMON_ACTIONS.SAVE),
        type: 'primary',
        onClick: onSave,
        loading,
        htmlType: 'submit'
      }
    ],
    
    // 创建/取消
    createCancel: (onCreate: () => void, onCancel: () => void, loading = false): FormAction[] => [
      {
        key: 'cancel',
        label: t(COMMON_ACTIONS.CANCEL),
        onClick: onCancel,
        disabled: loading
      },
      {
        key: 'create',
        label: t(COMMON_ACTIONS.CREATE),
        type: 'primary',
        onClick: onCreate,
        loading,
        htmlType: 'submit'
      }
    ],
    
    // 编辑/删除/取消
    editDeleteCancel: (
      onEdit: () => void, 
      onDelete: () => void, 
      onCancel: () => void, 
      loading = false
    ): FormAction[] => [
      {
        key: 'cancel',
        label: t(COMMON_ACTIONS.CANCEL),
        onClick: onCancel,
        disabled: loading
      },
      {
        key: 'delete',
        label: t(COMMON_ACTIONS.DELETE),
        type: 'primary',
        danger: true,
        onClick: onDelete,
        disabled: loading
      },
      {
        key: 'edit',
        label: t(COMMON_ACTIONS.EDIT),
        type: 'primary',
        onClick: onEdit,
        loading,
        htmlType: 'submit'
      }
    ],
    
    // 提交/重置
    submitReset: (onSubmit: () => void, onReset: () => void, loading = false): FormAction[] => [
      {
        key: 'reset',
        label: t(COMMON_ACTIONS.RESET),
        onClick: onReset,
        disabled: loading
      },
      {
        key: 'submit',
        label: t(COMMON_ACTIONS.SUBMIT),
        type: 'primary',
        onClick: onSubmit,
        loading,
        htmlType: 'submit'
      }
    ],
    
    // 确认/取消
    confirmCancel: (onConfirm: () => void, onCancel: () => void, loading = false): FormAction[] => [
      {
        key: 'cancel',
        label: t(COMMON_ACTIONS.CANCEL),
        onClick: onCancel,
        disabled: loading
      },
      {
        key: 'confirm',
        label: t(COMMON_ACTIONS.CONFIRM),
        type: 'primary',
        onClick: onConfirm,
        loading,
        htmlType: 'submit'
      }
    ]
  }
}

/**
 * @deprecated 使用 useFormActionPresets Hook 代替
 * 为保持向后兼容性暂时保留，但会在下个版本移除
 */
export const FormActionPresets = {
  saveCancel: (onSave: () => void, onCancel: () => void, loading = false): FormAction[] => [
    { key: 'cancel', label: '取消', onClick: onCancel, disabled: loading },
    { key: 'save', label: '保存', type: 'primary', onClick: onSave, loading, htmlType: 'submit' }
  ],
  createCancel: (onCreate: () => void, onCancel: () => void, loading = false): FormAction[] => [
    { key: 'cancel', label: '取消', onClick: onCancel, disabled: loading },
    { key: 'create', label: '创建', type: 'primary', onClick: onCreate, loading, htmlType: 'submit' }
  ],
  editDeleteCancel: (onEdit: () => void, onDelete: () => void, onCancel: () => void, loading = false): FormAction[] => [
    { key: 'cancel', label: '取消', onClick: onCancel, disabled: loading },
    { key: 'delete', label: '删除', type: 'primary', danger: true, onClick: onDelete, disabled: loading },
    { key: 'edit', label: '编辑', type: 'primary', onClick: onEdit, loading, htmlType: 'submit' }
  ],
  submitReset: (onSubmit: () => void, onReset: () => void, loading = false): FormAction[] => [
    { key: 'reset', label: '重置', onClick: onReset, disabled: loading },
    { key: 'submit', label: '提交', type: 'primary', onClick: onSubmit, loading, htmlType: 'submit' }
  ],
  confirmCancel: (onConfirm: () => void, onCancel: () => void, loading = false): FormAction[] => [
    { key: 'cancel', label: '取消', onClick: onCancel, disabled: loading },
    { key: 'confirm', label: '确认', type: 'primary', onClick: onConfirm, loading, htmlType: 'submit' }
  ]
}

export default FormActions
