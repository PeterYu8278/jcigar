/**
 * 模态框 Hook
 * 提供统一的模态框管理逻辑
 */

import { useState, useCallback } from 'react'

/**
 * 模态框配置
 */
export interface UseModalConfig {
  /** 初始打开状态 */
  defaultOpen?: boolean
  /** 打开时的回调 */
  onOpen?: () => void
  /** 关闭时的回调 */
  onClose?: () => void
  /** 确认时的回调 */
  onConfirm?: () => void | Promise<void>
  /** 取消时的回调 */
  onCancel?: () => void
}

/**
 * 模态框状态
 */
export interface UseModalState {
  /** 是否打开 */
  isOpen: boolean
  /** 是否加载中（用于确认操作） */
  loading: boolean
  /** 模态框数据 */
  data: any
}

/**
 * 模态框操作
 */
export interface UseModalActions {
  /** 打开模态框 */
  open: (data?: any) => void
  /** 关闭模态框 */
  close: () => void
  /** 切换模态框状态 */
  toggle: () => void
  /** 确认操作 */
  confirm: () => Promise<void>
  /** 取消操作 */
  cancel: () => void
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void
  /** 设置数据 */
  setData: (data: any) => void
}

/**
 * 模态框 Hook 返回值
 */
export interface UseModalReturn extends UseModalState, UseModalActions {}

/**
 * 模态框 Hook
 * 
 * @example
 * ```tsx
 * const {
 *   isOpen,
 *   loading,
 *   data,
 *   open,
 *   close,
 *   confirm
 * } = useModal({
 *   onConfirm: async () => {
 *     await saveData(data)
 *   }
 * })
 * 
 * <Button onClick={() => open({ id: 1, name: 'Test' })}>
 *   打开模态框
 * </Button>
 * 
 * <Modal
 *   open={isOpen}
 *   onOk={confirm}
 *   onCancel={close}
 *   confirmLoading={loading}
 * >
 *   <div>数据: {data?.name}</div>
 * </Modal>
 * ```
 */
export function useModal(config: UseModalConfig = {}): UseModalReturn {
  const {
    defaultOpen = false,
    onOpen,
    onClose,
    onConfirm,
    onCancel
  } = config

  // 状态
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  /**
   * 打开模态框
   */
  const open = useCallback(
    (modalData?: any) => {
      setIsOpen(true)
      if (modalData !== undefined) {
        setData(modalData)
      }
      if (onOpen) {
        onOpen()
      }
    },
    [onOpen]
  )

  /**
   * 关闭模态框
   */
  const close = useCallback(() => {
    setIsOpen(false)
    setLoading(false)
    // 延迟清空数据，避免关闭动画时数据消失
    setTimeout(() => {
      setData(null)
    }, 300)
    if (onClose) {
      onClose()
    }
  }, [onClose])

  /**
   * 切换模态框状态
   */
  const toggle = useCallback(() => {
    if (isOpen) {
      close()
    } else {
      open()
    }
  }, [isOpen, open, close])

  /**
   * 确认操作
   */
  const confirm = useCallback(async () => {
    try {
      setLoading(true)
      
      if (onConfirm) {
        await onConfirm()
      }
      
      close()
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }, [onConfirm, close])

  /**
   * 取消操作
   */
  const cancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    }
    close()
  }, [onCancel, close])

  return {
    // 状态
    isOpen,
    loading,
    data,

    // 操作
    open,
    close,
    toggle,
    confirm,
    cancel,
    setLoading,
    setData
  }
}

/**
 * 多个模态框管理 Hook
 * 用于管理页面中的多个模态框
 * 
 * @example
 * ```tsx
 * const modals = useModals({
 *   create: {},
 *   edit: {},
 *   delete: {
 *     onConfirm: async () => {
 *       await deleteItem(modals.delete.data.id)
 *     }
 *   }
 * })
 * 
 * <Button onClick={() => modals.create.open()}>创建</Button>
 * <Button onClick={() => modals.edit.open({ id: 1 })}>编辑</Button>
 * <Button onClick={() => modals.delete.open({ id: 1 })}>删除</Button>
 * 
 * <Modal open={modals.create.isOpen} onCancel={modals.create.close}>
 *   创建表单
 * </Modal>
 * 
 * <Modal open={modals.edit.isOpen} onCancel={modals.edit.close}>
 *   编辑表单
 * </Modal>
 * 
 * <Modal open={modals.delete.isOpen} onOk={modals.delete.confirm} onCancel={modals.delete.close}>
 *   确认删除？
 * </Modal>
 * ```
 */
export function useModals<T extends Record<string, UseModalConfig>>(
  configs: T
): Record<keyof T, UseModalReturn> {
  const modals: any = {}

  for (const key in configs) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    modals[key] = useModal(configs[key])
  }

  return modals
}

/**
 * 表单模态框 Hook
 * 结合 useModal 和 useForm，用于表单模态框
 * 
 * @example
 * ```tsx
 * import { useFormModal } from '@/hooks/useModal'
 * import { useForm } from '@/hooks/useForm'
 * 
 * const MyComponent = () => {
 *   const form = useForm<UserFormData>({
 *     onSubmit: async (values) => {
 *       await createUser(values)
 *     }
 *   })
 * 
 *   const modal = useFormModal(form, {
 *     onOpen: () => {
 *       form.reset()
 *     }
 *   })
 * 
 *   return (
 *     <>
 *       <Button onClick={modal.open}>创建用户</Button>
 *       <Modal
 *         open={modal.isOpen}
 *         onOk={modal.confirm}
 *         onCancel={modal.close}
 *         confirmLoading={modal.loading || form.submitting}
 *       >
 *         <Form form={form.form}>
 *           <Form.Item name="name" label="姓名">
 *             <Input />
 *           </Form.Item>
 *         </Form>
 *       </Modal>
 *     </>
 *   )
 * }
 * ```
 */
export function useFormModal(
  form: { submit: () => Promise<void>; reset: () => void },
  config: UseModalConfig = {}
): UseModalReturn {
  return useModal({
    ...config,
    onConfirm: async () => {
      await form.submit()
      if (config.onConfirm) {
        await config.onConfirm()
      }
    }
  })
}

