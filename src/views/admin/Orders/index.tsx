// 订单管理页面
import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Table, Space, Input, Select, DatePicker, message, Modal } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import BatchDeleteButton from '../../../components/common/BatchDeleteButton'
import CreateButton from '../../../components/common/CreateButton'
import OrderDetails from './OrderDetails'
import CreateOrderForm from './CreateOrderForm'
import { useOrderColumns } from './useOrderColumns'
import type { Order, User, Cigar, Transaction } from '../../../types'
import { getAllOrders, getUsers, getCigars, updateDocument, deleteDocument, COLLECTIONS, getAllInventoryLogs, getAllTransactions } from '../../../services/firebase/firestore'
import { useTranslation } from 'react-i18next'
import { filterOrders, sortOrders, getStatusColor, getStatusText, getUserName, getUserPhone } from './helpers'

const { Search } = Input
const { Option } = Select

const AdminOrders: React.FC = () => {
  const { t } = useTranslation()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [viewing, setViewing] = useState<Order | null>(null)
  const [isEditingInView, setIsEditingInView] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [cigars, setCigars] = useState<Cigar[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [creating, setCreating] = useState(false)

  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [paymentFilter, setPaymentFilter] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [pagination, setPagination] = useState(() => {
    const saved = localStorage.getItem('orders-pagination')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return { current: 1, pageSize: 10, total: 0 }
      }
    }
    return { current: 1, pageSize: 10, total: 0 }
  })
  

  useEffect(() => {
    loadData()
  }, [])

  // 筛选条件变化时重置分页到第一页
  useEffect(() => {
    setPagination((prev: any) => ({ ...prev, current: 1 }))
  }, [keyword, statusFilter, paymentFilter, dateRange])

  const loadData = async () => {
    setLoading(true)
    try {
      const [ordersData, usersData, cigarsData, transactionsData] = await Promise.all([
        getAllOrders(),
        getUsers(),
        getCigars(),
        getAllTransactions()
      ])
      setOrders(ordersData)
      setUsers(usersData)
      setCigars(cigarsData)
      setTransactions(transactionsData)
    } catch (error) {
      message.error(t('messages.dataLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 分页处理函数
  const handlePaginationChange = (page: number, pageSize?: number) => {
    const newPagination = {
      current: page,
      pageSize: pageSize || pagination.pageSize,
      total: pagination.total
    }
    setPagination(newPagination)
    localStorage.setItem('orders-pagination', JSON.stringify(newPagination))
  }

  // 删除订单相关的出库记录
  const deleteOrderInventoryLogs = async (orderId: string) => {
    try {
      const inventoryLogs = await getAllInventoryLogs()
      const relatedLogs = inventoryLogs.filter((log: any) => 
        log?.referenceNo?.startsWith(`ORDER:${orderId}`) && log?.type === 'out'
      )
      
      if (relatedLogs.length > 0) {
        await Promise.all(relatedLogs.map((log: any) => 
          deleteDocument(COLLECTIONS.INVENTORY_LOGS, log.id)
        ))
      }
    } catch (error) {
      // 静默处理错误
    }
  }

  // 删除参与者分配记录中的订单资料
  const deleteOrderFromEventAllocations = async (orderId: string) => {
    try {
      // 获取所有活动
      const { getEvents } = await import('../../../services/firebase/firestore')
      const events = await getEvents()
      
      // 查找包含该订单ID的活动
      for (const event of events) {
        const allocations = (event as any)?.allocations
        if (allocations) {
          let hasChanges = false
          const updatedAllocations = { ...allocations }
          
          // 遍历所有分配记录，移除包含该订单ID的记录
          for (const [userId, allocation] of Object.entries(allocations)) {
            if ((allocation as any)?.orderId === orderId) {
              // 移除订单ID，但保留其他分配信息
              updatedAllocations[userId] = {
                ...(allocation as any),
                orderId: undefined
              }
              hasChanges = true
            }
          }
          
          // 如果有变化，更新活动文档
          if (hasChanges) {
            await updateDocument(COLLECTIONS.EVENTS, event.id, {
              allocations: updatedAllocations
            } as any)
          }
        }
      }
    } catch (error) {
      console.error('Error deleting order from event allocations:', error)
    }
  }

  // 批量删除：在同一次更新中清理多个订单ID对应的分配记录，避免并发覆盖
  const deleteOrdersFromEventAllocations = async (orderIds: string[]) => {
    try {
      if (!orderIds || orderIds.length === 0) return
      const orderIdSet = new Set(orderIds.map(String))
      const { getEvents } = await import('../../../services/firebase/firestore')
      const events = await getEvents()

      for (const event of events) {
        const allocations = (event as any)?.allocations
        if (!allocations) continue

        let hasChanges = false
        const updatedAllocations: Record<string, any> = { ...allocations }

        for (const [userId, allocation] of Object.entries(allocations)) {
          const allocOrderId = (allocation as any)?.orderId
          if (allocOrderId && orderIdSet.has(String(allocOrderId))) {
            updatedAllocations[userId] = {
              ...(allocation as any),
              orderId: undefined,
            }
            hasChanges = true
          }
        }

        if (hasChanges) {
          await updateDocument(COLLECTIONS.EVENTS, (event as any).id, {
            allocations: updatedAllocations,
          } as any)
        }
      }
    } catch (error) {
      console.error('Error batch-deleting orders from event allocations:', error)
    }
  }

  const filtered = useMemo(() => {
    return filterOrders(orders, users, keyword, statusFilter, paymentFilter, dateRange)
  }, [orders, users, keyword, statusFilter, paymentFilter, dateRange])

  const columns = useOrderColumns({
    users,
    cigars,
    transactions,
    orders,
    onViewOrder: (order) => {
      setViewing(order)
      setIsEditingInView(false)
    },
    onDeleteOrder: async (id) => {
      // 删除参与者分配记录中的订单资料
      await deleteOrderFromEventAllocations(id)
      // 删除订单相关的出库记录
      await deleteOrderInventoryLogs(id)
      // 删除订单
      return await deleteDocument(COLLECTIONS.ORDERS, id)
    },
    onOrderUpdate: loadData
  })

  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  const [sortDesc, setSortDesc] = useState<boolean>(true)

  const filteredSorted = useMemo(() => {
    return sortOrders(filtered, sortDesc)
  }, [filtered, sortDesc])

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{t('navigation.orders')}</h1>
      
        <Space>
          <CreateButton
            onCreate={() => setCreating(true)}
            buttonText={t('ordersAdmin.createManual')}
            size="middle"
            type="default"
            showIcon={true}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              borderRadius: 8, 
              padding: '8px 16px', 
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
              color: '#111', 
              fontWeight: 700, 
              cursor: 'pointer' 
            }}
          />
        </Space>
      </div>

      {/* 搜索和筛选 */}
      {!isMobile ? (
      <div style={{ marginBottom: 16, padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
        <Space size="middle" wrap>
          <Search
              placeholder={t('ordersAdmin.searchPlaceholder')}
            allowClear
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
            <Select placeholder={t('ordersAdmin.selectStatus')} style={{ width: 120 }} allowClear value={statusFilter} onChange={setStatusFilter}>
              <Option value="pending">{t('ordersAdmin.status.pending')}</Option>
              <Option value="confirmed">{t('ordersAdmin.status.confirmed')}</Option>
              <Option value="shipped">{t('ordersAdmin.status.shipped')}</Option>
              <Option value="delivered">{t('ordersAdmin.status.delivered')}</Option>
              <Option value="cancelled">{t('ordersAdmin.status.cancelled')}</Option>
          </Select>
            <Select placeholder={t('ordersAdmin.payment.title')} style={{ width: 120 }} allowClear value={paymentFilter} onChange={setPaymentFilter}>
              <Option value="credit">{t('ordersAdmin.payment.credit')}</Option>
            <Option value="paypal">PayPal</Option>
              <Option value="bank_transfer">{t('ordersAdmin.payment.bankTransfer')}</Option>
          </Select>
          <DatePicker.RangePicker 
              placeholder={[t('common.startDate'), t('common.endDate')]}
            value={dateRange}
            onChange={setDateRange}
          />
          <button 
            type="button"
            onClick={() => { 
              setKeyword('')
              setStatusFilter(undefined)
              setPaymentFilter(undefined)
              setDateRange(null)
              setSelectedRowKeys([])
            }}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d9d9d9', background: '#fff', cursor: 'pointer' }}
          >
            {t('common.resetFilters')}
          </button>
        </Space>
      </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <Search
              placeholder={t('ordersAdmin.searchPlaceholder')}
              allowClear
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              placeholder={[t('common.startDate'), t('common.endDate')]}
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', width: '48%' }}>
            <Select
              placeholder={t('ordersAdmin.allStatus')}
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="pending">{t('ordersAdmin.status.pending')}</Option>
              <Option value="confirmed">{t('ordersAdmin.status.confirmed')}</Option>
              <Option value="shipped">{t('ordersAdmin.status.shipped')}</Option>
              <Option value="delivered">{t('ordersAdmin.status.delivered')}</Option>
              <Option value="cancelled">{t('ordersAdmin.status.cancelled')}</Option>
            </Select>
          </div>
          <div style={{ position: 'relative', width: '48%' }}>
            <Select
              placeholder={t('ordersAdmin.payment.title')}
              allowClear
              value={paymentFilter}
              onChange={setPaymentFilter}
              style={{ width: '100%' }}
            >
              <Option value="bank_transfer">{t('ordersAdmin.payment.bankTransfer')}</Option>
              <Option value="credit">{t('ordersAdmin.payment.credit')}</Option>
              <Option value="paypal">PayPal</Option>
            </Select>
          </div>
            
          </div>
        </div>
      )}

      {!isMobile ? (
      <Table
        columns={columns}
          dataSource={filteredSorted}
        rowKey="id"
        loading={loading}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        title={() => (
          <Space>
            <button type="button" disabled={selectedRowKeys.length === 0} onClick={async () => {
              setLoading(true)
              try {
                await Promise.all(selectedRowKeys.map(id => updateDocument<Order>(COLLECTIONS.ORDERS, String(id), { status: 'confirmed' } as any)))
                  message.success(t('ordersAdmin.batchConfirmed'))
                loadData()
                setSelectedRowKeys([])
              } finally {
                setLoading(false)
              }
            }} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d9d9d9', background: '#fff', cursor: selectedRowKeys.length === 0 ? 'not-allowed' : 'pointer', opacity: selectedRowKeys.length === 0 ? 0.6 : 1 }}>
                {t('ordersAdmin.batchConfirm')}
            </button>
              <button type="button" disabled={selectedRowKeys.length === 0} onClick={async () => {
                setLoading(true)
                try {
                  await Promise.all(selectedRowKeys.map(id => updateDocument<Order>(COLLECTIONS.ORDERS, String(id), { status: 'delivered' } as any)))
                  message.success(t('ordersAdmin.batchDelivered'))
                loadData()
                setSelectedRowKeys([])
              } finally {
                setLoading(false)
              }
            }} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d9d9d9', background: '#fff', cursor: selectedRowKeys.length === 0 ? 'not-allowed' : 'pointer', opacity: selectedRowKeys.length === 0 ? 0.6 : 1 }}>
                {t('ordersAdmin.batchDeliver')}
            </button>
            <button type="button" disabled={selectedRowKeys.length === 0} onClick={async () => {
              setLoading(true)
              try {
                await Promise.all(selectedRowKeys.map(id => updateDocument<Order>(COLLECTIONS.ORDERS, String(id), { status: 'cancelled' } as any)))
                  message.success(t('ordersAdmin.batchCancelled'))
                loadData()
                setSelectedRowKeys([])
              } finally {
                setLoading(false)
              }
            }} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d9d9d9', background: '#fff', cursor: selectedRowKeys.length === 0 ? 'not-allowed' : 'pointer', opacity: selectedRowKeys.length === 0 ? 0.6 : 1 }}>
                {t('ordersAdmin.batchCancel')}
            </button>
            <BatchDeleteButton
              selectedIds={selectedRowKeys}
              confirmTitle={t('ordersAdmin.batchDeleteConfirm')}
              confirmContent={t('ordersAdmin.batchDeleteContent', { count: selectedRowKeys.length })}
              onBatchDelete={async (ids) => {
                // 先批量清理活动分配记录中的订单资料（单次更新/每个活动，避免覆盖）
                await deleteOrdersFromEventAllocations(ids.map(String))
                // 再删除相关的出库记录
                await Promise.all(ids.map(id => deleteOrderInventoryLogs(id)))
                // 最后删除订单
                await Promise.all(ids.map(id => deleteDocument(COLLECTIONS.ORDERS, id)))
                return { success: true }
              }}
              onSuccess={() => {
                    loadData()
                    setSelectedRowKeys([])
              }}
              itemTypeName="订单"
              size="middle"
              type="default"
              danger={true}
              showIcon={true}
            />
          </Space>
        )}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
            total: filteredSorted.length,
          showSizeChanger: true,
          showQuickJumper: false,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          onChange: handlePaginationChange,
          onShowSizeChange: handlePaginationChange,
          pageSizeOptions: ['10', '20', '50', '100'],
          style: { color: '#fff' }
        }}
      />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredSorted.map(order => (
            <div key={order.id} style={{ border: '1px solid rgba(244,175,37,0.2)', borderRadius: 12, padding: 12, background: 'rgba(34,28,16,0.5)', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{t('ordersAdmin.orderNo')}: {order.id}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{dayjs(order.createdAt).format('YYYY-MM-DD')}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{getUserName(order.userId, users)} {getUserPhone(order.userId, users) || '-'}</div>

                </div>
                <div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: getStatusColor(order.status) === 'green' ? '#34d399' : getStatusColor(order.status) === 'red' ? '#f87171' : getStatusColor(order.status) === 'orange' ? '#fb923c' : getStatusColor(order.status) === 'blue' ? '#60a5fa' : '#a78bfa' }}>
                  {getStatusText(order.status, t)}
                </span>
              </div>
              
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#f4af25' }}>RM {order.total.toFixed(2)}</div>
                <button style={{ padding: '4px 8px', borderRadius: 6, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => { setViewing(order); setIsEditingInView(false) }}>
                  {t('common.viewDetails')}
                </button>
              </div>
            </div>
          ))}
          {filteredSorted.length === 0 && (
            <div style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>{t('common.noData')}</div>
          )}
        </div>
      )}

      {/* 查看订单详情 */}
      <Modal
        title={null}
        open={!!viewing}
        onCancel={() => { setViewing(null); setIsEditingInView(false) }}
        footer={null}
        width={isMobile ? '100%' : 820}
        style={{ 
          top: isMobile ? 0 : 20,
        }}
        styles={{
          body: { 
            background: 'linear-gradient(180deg, #221c10 0%, #181611 0%)', 
            minHeight: isMobile ? '100vh' : 'auto' 
          },
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
          content: {
            background: 'linear-gradient(180deg, #221c10 0%, #181611 0%)'
          }
        }}
        className="order-details-modal"
        closable={false}
      >
        {viewing && (
          <OrderDetails
            order={viewing}
            users={users}
            cigars={cigars}
            isMobile={isMobile}
            isEditingInView={isEditingInView}
            onClose={() => { setViewing(null); setIsEditingInView(false) }}
            onEditToggle={() => setIsEditingInView(v => !v)}
            onOrderUpdate={loadData}
          />
        )}
      </Modal>

      {/* 手动创建订单 */}
      <Modal
        title={t('ordersAdmin.createManual')}
        open={creating}
        onCancel={() => setCreating(false)}
        onOk={() => {/* Form submission handled by CreateOrderForm */}}
        confirmLoading={loading}
        destroyOnHidden
        centered
        width={960}
        styles={{
          body: {
            background: 'rgba(255,255, 255)',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: 16,
          },
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
          content: {
            background: 'rgba(255,255, 255)',
            border: '1px solid rgba(255, 215, 0, 0.2)'
          }
        }}
        className="create-order-modal"
        footer={[
          <button key="cancel" type="button" onClick={() => setCreating(false)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #d9d9d9', background: '#fff', cursor: 'pointer' }}>
            {t('common.cancel')}
          </button>,
          <button key="submit" type="button" className="cigar-btn-gradient" onClick={() => {
            const formEl = document.getElementById('createOrderForm') as HTMLFormElement | null
            if (formEl) formEl.requestSubmit()
          }} style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>
            {t('common.create')}
          </button>
        ]}
      >
        <CreateOrderForm
          users={users}
          cigars={cigars}
          onCreateSuccess={() => {
              message.success(t('ordersAdmin.created'))
              setCreating(false)
              loadData()
          }}
          onCreateError={(error) => {
            message.error(error)
          }}
          onCancel={() => setCreating(false)}
          loading={loading}
        />
      </Modal>
    </div>
  )
}

export default AdminOrders
