// 替代约 10 个视图中重复的 selectedItem + drawerOpen useState 模式

import { useState, useCallback } from 'react'

interface UseDetailDrawerResult<T> {
  item: T | null
  open: boolean
  openDrawer: (item: T) => void
  closeDrawer: () => void
}

/**
 * 通用详情抽屉状态管理 Hook
 *
 * 用法：
 *   const { item, open, openDrawer, closeDrawer } = useDetailDrawer<Order>()
 *
 *   <Button onClick={() => openDrawer(record)}>查看</Button>
 *   <Drawer open={open} onClose={closeDrawer}>
 *     {item && <OrderDetails order={item} />}
 *   </Drawer>
 */
export function useDetailDrawer<T>(): UseDetailDrawerResult<T> {
  const [item, setItem] = useState<T | null>(null)
  const [open, setOpen] = useState(false)

  const openDrawer = useCallback((selectedItem: T) => {
    setItem(selectedItem)
    setOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    setOpen(false)
    // 延迟清空，避免关闭动画期间内容闪烁
    setTimeout(() => setItem(null), 300)
  }, [])

  return { item, open, openDrawer, closeDrawer }
}
