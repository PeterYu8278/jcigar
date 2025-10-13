import { Modal } from 'antd'
import { ExclamationCircleOutlined, QuestionCircleOutlined, InfoCircleOutlined, WarningOutlined } from '@ant-design/icons'
import type { ModalFuncProps } from 'antd'

export interface ConfirmOptions extends Omit<ModalFuncProps, 'type'> {
  /** 确认类型 */
  type?: 'warning' | 'info' | 'success' | 'error' | 'confirm'
  /** 标题 */
  title?: React.ReactNode
  /** 内容 */
  content?: React.ReactNode
  /** 确认按钮文字 */
  okText?: string
  /** 取消按钮文字 */
  cancelText?: string
  /** 确认回调 */
  onOk?: () => void | Promise<void>
  /** 取消回调 */
  onCancel?: () => void
  /** 确认按钮类型 */
  okType?: 'primary' | 'danger' | 'dashed' | 'link' | 'text' | 'default'
  /** 是否显示取消按钮 */
  showCancel?: boolean
}

/**
 * 统一的确认对话框
 * 替代原生的 window.confirm
 * 
 * @example
 * ```tsx
 * // 基础确认
 * confirmDialog({
 *   title: '确认删除',
 *   content: '删除后无法恢复，确定要删除吗？',
 *   onOk: () => handleDelete()
 * })
 * 
 * // 危险操作
 * confirmDialog({
 *   type: 'error',
 *   title: '危险操作',
 *   content: '此操作不可逆，请谨慎操作！',
 *   okType: 'danger',
 *   okText: '确认删除',
 *   onOk: async () => {
 *     await deleteData()
 *   }
 * })
 * 
 * // 信息提示
 * confirmDialog({
 *   type: 'info',
 *   title: '提示',
 *   content: '操作完成后需要刷新页面',
 *   okText: '知道了',
 *   showCancel: false
 * })
 * ```
 */
export const confirmDialog = (options: ConfirmOptions) => {
  const {
    type = 'confirm',
    title = '确认操作',
    content,
    okText = '确定',
    cancelText = '取消',
    onOk,
    onCancel,
    okType,
    showCancel = true,
    ...restProps
  } = options

  // 根据类型选择图标和默认样式
  const getIconAndOkType = () => {
    switch (type) {
      case 'warning':
        return {
          icon: <WarningOutlined style={{ color: '#faad14' }} />,
          defaultOkType: 'primary' as const
        }
      case 'error':
        return {
          icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
          defaultOkType: 'danger' as const
        }
      case 'info':
        return {
          icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
          defaultOkType: 'primary' as const
        }
      case 'success':
        return {
          icon: <ExclamationCircleOutlined style={{ color: '#52c41a' }} />,
          defaultOkType: 'primary' as const
        }
      case 'confirm':
      default:
        return {
          icon: <QuestionCircleOutlined style={{ color: '#faad14' }} />,
          defaultOkType: 'primary' as const
        }
    }
  }

  const { icon, defaultOkType } = getIconAndOkType()

  return Modal.confirm({
    title,
    content,
    icon,
    okText,
    cancelText,
    okType: okType ?? defaultOkType,
    cancelButtonProps: showCancel ? undefined : { style: { display: 'none' } },
    onOk,
    onCancel,
    centered: true,
    ...restProps
  })
}

/**
 * 删除确认对话框（快捷方法）
 */
export const confirmDelete = (
  itemName?: string,
  onOk?: () => void | Promise<void>
) => {
  return confirmDialog({
    type: 'error',
    title: '确认删除',
    content: itemName 
      ? `确定要删除"${itemName}"吗？删除后无法恢复。`
      : '确定要删除吗？删除后无法恢复。',
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    onOk
  })
}

/**
 * 批量删除确认对话框（快捷方法）
 */
export const confirmBatchDelete = (
  count: number,
  onOk?: () => void | Promise<void>
) => {
  return confirmDialog({
    type: 'error',
    title: '批量删除确认',
    content: `确定要删除选中的 ${count} 项吗？删除后无法恢复。`,
    okText: `删除 ${count} 项`,
    okType: 'danger',
    cancelText: '取消',
    onOk
  })
}

/**
 * 保存确认对话框（快捷方法）
 */
export const confirmSave = (
  content?: string,
  onOk?: () => void | Promise<void>
) => {
  return confirmDialog({
    type: 'confirm',
    title: '确认保存',
    content: content ?? '确定要保存修改吗？',
    okText: '保存',
    cancelText: '取消',
    onOk
  })
}

/**
 * 离开确认对话框（快捷方法）
 */
export const confirmLeave = (
  onOk?: () => void | Promise<void>
) => {
  return confirmDialog({
    type: 'warning',
    title: '确认离开',
    content: '有未保存的修改，确定要离开吗？',
    okText: '离开',
    okType: 'danger',
    cancelText: '取消',
    onOk
  })
}

/**
 * 信息提示对话框（快捷方法）
 */
export const showInfo = (
  title: string,
  content?: React.ReactNode,
  onOk?: () => void
) => {
  return confirmDialog({
    type: 'info',
    title,
    content,
    okText: '知道了',
    showCancel: false,
    onOk
  })
}

export default confirmDialog

