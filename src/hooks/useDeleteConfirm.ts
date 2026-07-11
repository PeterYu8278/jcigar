// 替代约 15 个视图中重复的 Modal.confirm 删除确认模式

import { useCallback } from 'react'
import { Modal, message } from 'antd'

interface UseDeleteConfirmOptions {
  title?: string
  content?: string
  successMessage?: string
  errorMessage?: string
  onSuccess?: () => void
}

interface UseDeleteConfirmResult {
  confirmDelete: (id: string) => void
}

/**
 * 通用删除确认 Hook
 *
 * 用法：
 *   const { confirmDelete } = useDeleteConfirm({
 *     onConfirm: (id) => deleteUser(id),
 *     onSuccess: refresh,
 *   })
 *
 *   <Button danger onClick={() => confirmDelete(record.id)}>删除</Button>
 */
export function useDeleteConfirm(
  onConfirm: (id: string) => Promise<{ success: boolean; error?: unknown }>,
  options: UseDeleteConfirmOptions = {}
): UseDeleteConfirmResult {
  const {
    title = '确认删除',
    content = '此操作不可恢复，是否继续？',
    successMessage = '删除成功',
    errorMessage = '删除失败',
    onSuccess,
  } = options

  const confirmDelete = useCallback(
    (id: string) => {
      Modal.confirm({
        title,
        content,
        okText: '确认',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          const result = await onConfirm(id)
          if (result.success) {
            message.success(successMessage)
            onSuccess?.()
          } else {
            message.error(`${errorMessage}: ${result.error}`)
          }
        },
      })
    },
    [onConfirm, title, content, successMessage, errorMessage, onSuccess]
  )

  return { confirmDelete }
}
