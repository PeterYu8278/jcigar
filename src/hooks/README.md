# Hooks 使用指南

## useFirestoreQuery — 替代手动 loading/data/error 模式

**之前（约 30 个视图中的重复写法）：**
```tsx
const [loading, setLoading] = useState(false)
const [users, setUsers] = useState<User[]>([])
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  const fetch = async () => {
    setLoading(true)
    const result = await getUsers()
    if (result.success) setUsers(result.data ?? [])
    else setError(String(result.error))
    setLoading(false)
  }
  fetch()
}, [])
```

**之后：**
```tsx
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'

const { data: users, loading, error, refresh } = useFirestoreQuery(getUsers)
```

带依赖项（userId 变化时重新拉取）：
```tsx
const { data: orders, loading } = useFirestoreQuery(
  () => getOrdersByUser(userId),
  [userId]
)
```

---

## useDetailDrawer — 替代手动 selectedItem + open 模式

**之前：**
```tsx
const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
const [drawerOpen, setDrawerOpen] = useState(false)

// 打开
setSelectedOrder(record)
setDrawerOpen(true)

// 关闭
setDrawerOpen(false)
```

**之后：**
```tsx
import { useDetailDrawer } from '@/hooks/useDetailDrawer'

const { item: selectedOrder, open: drawerOpen, openDrawer, closeDrawer } = useDetailDrawer<Order>()

// 打开
openDrawer(record)

// JSX
<Drawer open={drawerOpen} onClose={closeDrawer}>
  {selectedOrder && <OrderDetails order={selectedOrder} />}
</Drawer>
```

---

## useDeleteConfirm — 替代手动 Modal.confirm 模式

**之前（约 15 个视图中的重复写法）：**
```tsx
Modal.confirm({
  title: '确认删除',
  content: '此操作不可恢复',
  okButtonProps: { danger: true },
  onOk: async () => {
    const result = await deleteUser(id)
    if (result.success) {
      message.success('删除成功')
      refresh()
    } else {
      message.error('删除失败')
    }
  }
})
```

**之后：**
```tsx
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'

const { confirmDelete } = useDeleteConfirm(deleteUser, { onSuccess: refresh })

<Button danger onClick={() => confirmDelete(record.id)}>删除</Button>
```

---

## ServiceResponse\<T\> — 统一 Service 返回类型

```tsx
import type { ServiceResponse } from '@/types'

// Service 函数签名统一为：
async function getUsers(): Promise<ServiceResponse<User[]>>
async function createUser(data: Partial<User>): Promise<ServiceResponse<string>>
async function deleteUser(id: string): Promise<ServiceResponse>
```
