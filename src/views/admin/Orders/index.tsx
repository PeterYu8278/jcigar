// 订单管理页面
import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Table, Space, Input, Select, DatePicker, message, Modal } from 'antd'
import { SearchOutlined, CheckOutlined, ClockCircleOutlined } from '@ant-design/icons'
import BatchDeleteButton from '../../../components/common/BatchDeleteButton'
import CreateButton from '../../../components/common/CreateButton'
import OrderDetails from './OrderDetails'
import CreateOrderForm from './CreateOrderForm'
import { useOrderColumns } from './useOrderColumns'
import type { Order, User, Cigar, Transaction, OutboundOrder, InventoryMovement, AppConfig } from '../../../types'
import { getAllOrders, getUsers, getCigars, updateDocument, deleteDocument, COLLECTIONS, getAllTransactions, getAllOutboundOrders, getAllInventoryMovements, deleteOutboundOrder } from '../../../services/firebase/firestore'
import { getOrdersPaginated } from '../../../services/firebase/paginatedQueries'
import { usePaginatedData } from '../../../hooks/usePaginatedData'
import { useTranslation } from 'react-i18next'
import { filterOrders, sortOrders, getStatusColor, getStatusText, getUserName, getUserPhone } from './helpers'
import { getModalThemeStyles, getModalWidth, getResponsiveModalConfig } from '../../../config/modalTheme'
import { getAppConfig } from '../../../services/firebase/appConfig'

const { Search } = Input
const { Option } = Select

const AdminOrders: React.FC = () => {
  const { t } = useTranslation()
  const [orders, setOrders] = useState<Order[]>([]) // 保留用于搜索和筛选
  const [loading, setLoading] = useState(false)
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  
  // 服务端分页
  const {
    data: paginatedOrders,
    loading: paginatedLoading,
    hasMore,
    currentPage,
    loadPage,
    refresh: refreshPaginated
  } = usePaginatedData(
    async (pageSize, lastDoc, filters) => {
      const result = await getOrdersPaginated(pageSize, lastDoc, filters)
      return result
    },
    {
      pageSize: 20, // 桌面端20条/页
      mobilePageSize: 10, // 移动端10条/页
      initialLoad: false // 手动控制加载
    }
  )
  const [viewing, setViewing] = useState<Order | null>(null)
  const [isEditingInView, setIsEditingInView] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [cigars, setCigars] = useState<Cigar[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [creating, setCreating] = useState(false)
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null)

  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [paymentFilter, setPaymentFilter] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [matchStatusTab, setMatchStatusTab] = useState<'all' | 'matched' | 'unmatched'>('all')
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
    loadData() // 加载关联数据
    loadAppConfig()
    // 初始加载订单数据
    const filters: any = {}
    if (statusFilter) filters.status = statusFilter
    if (paymentFilter) filters.paymentMethod = paymentFilter
    if (dateRange && dateRange[0] && dateRange[1]) {
      filters.startDate = dateRange[0].toDate()
      filters.endDate = dateRange[1].toDate()
    }
    loadPage(1, Object.keys(filters).length > 0 ? filters : undefined)
  }, [])

  const loadAppConfig = async () => {
    try {
      const config = await getAppConfig()
      if (config) {
        setAppConfig(config)
      }
    } catch (error) {
      console.error('加载应用配置失败:', error)
    }
  }

  // 筛选条件变化时重新加载分页数据
  useEffect(() => {
    const filters: any = {}
    if (statusFilter) filters.status = statusFilter
    if (paymentFilter) filters.paymentMethod = paymentFilter
    if (dateRange && dateRange[0] && dateRange[1]) {
      filters.startDate = dateRange[0].toDate()
      filters.endDate = dateRange[1].toDate()
    }
    
    loadPage(1, Object.keys(filters).length > 0 ? filters : undefined)
  }, [statusFilter, paymentFilter, dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

  // 加载关联数据（用户、雪茄、交易）- 这些数据量较小，可以一次性加载
  const loadData = async () => {
    setLoading(true)
    try {
      const [usersData, cigarsData, transactionsData] = await Promise.all([
        getUsers(),
        getCigars(),
        getAllTransactions()
      ])
      setUsers(usersData)
      setCigars(cigarsData)
      setTransactions(transactionsData)
    } catch (error) {
      message.error(t('messages.dataLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 处理搜索和数据源
  useEffect(() => {
    // 判断是否有筛选条件
    const hasFilters = statusFilter || paymentFilter || (dateRange && dateRange[0] && dateRange[1])
    
    if (keyword.trim() || !hasFilters) {
      // 有搜索关键词或没有筛选条件时，加载所有订单
      setLoading(true)
      getAllOrders()
        .then(ordersData => {
          setOrders(ordersData)
        })
        .catch(e => {
          message.error(t('messages.dataLoadFailed'))
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      // 有筛选条件但没有搜索关键词时，使用分页数据
      setOrders(paginatedOrders)
    }
  }, [keyword, paginatedOrders, statusFilter, paymentFilter, dateRange, t])

  // 分页处理函数
  const handlePaginationChange = async (page: number, pageSize?: number) => {
    const hasFilters = statusFilter || paymentFilter || (dateRange && dateRange[0] && dateRange[1])
    
    const newPagination = {
      current: page,
      pageSize: pageSize || pagination.pageSize,
      total: filteredSorted.length
    }
    setPagination(newPagination)
    localStorage.setItem('orders-pagination', JSON.stringify(newPagination))
    
    // 如果有筛选条件但没有搜索关键词，需要加载服务端分页数据
    if (hasFilters && !keyword.trim()) {
      const filters: any = {}
      if (statusFilter) filters.status = statusFilter
      if (paymentFilter) filters.paymentMethod = paymentFilter
      if (dateRange && dateRange[0] && dateRange[1]) {
        filters.startDate = dateRange[0].toDate()
        filters.endDate = dateRange[1].toDate()
      }
      await loadPage(page, Object.keys(filters).length > 0 ? filters : undefined)
    }
  }

  // 删除订单相关的出库记录
  const deleteOrderOutboundRecords = async (orderId: string) => {
    try {
      const outboundOrders = await getAllOutboundOrders()
      
      // 查找匹配的出库订单
      const relatedOutboundOrders = outboundOrders.filter((order: OutboundOrder) => 
        order.referenceNo === orderId
      )
      
      // 删除出库订单（会自动删除关联的 inventory_movements）
      if (relatedOutboundOrders.length > 0) {
        await Promise.all(relatedOutboundOrders.map((order: OutboundOrder) => 
          deleteOutboundOrder(order.id)
        ))
      }
    } catch (error) {
      console.error('❌ [Orders] Error deleting outbound records:', error)
      // 静默处理错误，不影响订单删除
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
    }
  }

  const [sortDesc, setSortDesc] = useState<boolean>(true)

  // 计算订单匹配状态（需要在filtered之前定义）
  const getOrderMatchStatus = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return { matched: 0, total: 0, status: 'none' }
    
    const orderTotal = Number(order.total || 0)
    const matchedAmount = transactions
      .filter(t => {
        const relatedOrders = (t as any)?.relatedOrders || []
        return relatedOrders.some((ro: any) => ro.orderId === orderId)
      })
      .reduce((sum, t) => {
        const relatedOrders = (t as any)?.relatedOrders || []
        const orderMatch = relatedOrders.find((ro: any) => ro.orderId === orderId)
        return sum + (orderMatch ? Number(orderMatch.amount || 0) : 0)
      }, 0)
    
    if (matchedAmount >= orderTotal) {
      return { matched: matchedAmount, total: orderTotal, status: 'fully' }
    } else if (matchedAmount > 0) {
      return { matched: matchedAmount, total: orderTotal, status: 'partial' }
    } else {
      return { matched: matchedAmount, total: orderTotal, status: 'none' }
    }
  }

  // 获取雪茄信息
  const getCigarName = (cigarId: string) => {
    const cigar = cigars.find(c => c.id === cigarId)
    return cigar ? cigar.name : cigarId
  }

  const filtered = useMemo(() => {
    // 判断是否有筛选条件
    const hasFilters = statusFilter || paymentFilter || (dateRange && dateRange[0] && dateRange[1])
    
    // 确定使用的数据源
    let dataSource: Order[]
    if (keyword.trim() || !hasFilters) {
      // 有搜索关键词或没有筛选条件时，使用所有订单数据
      dataSource = orders
    } else {
      // 有筛选条件但没有搜索关键词时，使用分页数据
      dataSource = paginatedOrders
    }
    
    // 如果有搜索关键词，进行客户端筛选
    if (keyword.trim()) {
      dataSource = filterOrders(dataSource, users, keyword, undefined, undefined, undefined, cigars)
    }
    
    // 按匹配状态筛选
      if (matchStatusTab === 'matched') {
      dataSource = dataSource.filter(order => {
          const matchStatus = getOrderMatchStatus(order.id)
          return matchStatus.status === 'fully'
        })
      } else if (matchStatusTab === 'unmatched') {
      dataSource = dataSource.filter(order => {
          const matchStatus = getOrderMatchStatus(order.id)
          return matchStatus.status !== 'fully'
        })
      }
      
    return dataSource
  }, [orders, paginatedOrders, users, keyword, cigars, matchStatusTab, transactions, statusFilter, paymentFilter, dateRange])

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
      await deleteOrderOutboundRecords(id)
      // 删除订单
      return await deleteDocument(COLLECTIONS.ORDERS, id)
    },
    onOrderUpdate: async () => {
      await refreshPaginated()
    }
  })

  const filteredSorted = useMemo(() => {
    return sortOrders(filtered, sortDesc)
  }, [filtered, sortDesc])

  return (
    <div
      style={{
        height: isMobile ? '90vh' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        overflow: isMobile ? 'hidden' : 'visible'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              background: appConfig?.colorTheme?.primaryButton 
                ? `linear-gradient(to right, ${appConfig.colorTheme.primaryButton.startColor}, ${appConfig.colorTheme.primaryButton.endColor})`
                : 'linear-gradient(to right,#FDE08D,#C48D3A)', 
              color: '#111', 
              fontWeight: 700, 
              border: 'none',
              cursor: 'pointer' 
            }}
          />
        </Space>
      </div>

      {/* 置顶筛选区开始 */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'transparent',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(244,175,37,0.2)'
        }}
      >
      {/* 财务匹配状态标签 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(244,175,37,0.2)' }}>
          {(['all', 'matched', 'unmatched'] as const).map((tabKey) => {
            const isActive = matchStatusTab === tabKey
            const matchedCount = orders.filter(o => getOrderMatchStatus(o.id).status === 'fully').length
            const unmatchedCount = orders.length - matchedCount
            
            const getTabLabel = () => {
              switch (tabKey) {
                case 'all':
                  return `${t('common.all')} (${orders.length})`
                case 'matched':
                  return `${t('financeAdmin.fullyMatched')} (${matchedCount})`
                case 'unmatched':
                  return `${t('financeAdmin.partialMatched')} (${unmatchedCount})`
              }
            }
            
            const getTabIcon = () => {
              switch (tabKey) {
                case 'matched':
                  return <CheckOutlined style={{ color: isActive ? '#52c41a' : '#A0A0A0', fontSize: 14 }} />
                case 'unmatched':
                  return <ClockCircleOutlined style={{ color: isActive ? '#faad14' : '#A0A0A0', fontSize: 14 }} />
                default:
                  return null
              }
            }
            
            const baseStyle: React.CSSProperties = {
              padding: '12px 12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              position: 'relative',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }
            
            const activeStyle: React.CSSProperties = {
              color: '#FDE08D',
            }
            
            const inactiveStyle: React.CSSProperties = {
              color: '#A0A0A0',
            }
            
            return (
              <button
                key={tabKey}
                onClick={() => setMatchStatusTab(tabKey)}
                style={{ ...baseStyle, ...(isActive ? activeStyle : inactiveStyle) }}
              >
                {getTabIcon()}
                {getTabLabel()}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                    borderRadius: '1px'
                  }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 搜索和筛选 */}
      {!isMobile ? (
      <div style={{ 
        marginBottom: 16, 
        padding: '16px', 
        background: 'rgba(255, 255, 255, 0.05)', 
        borderRadius: 12,
        border: '1px solid rgba(244, 175, 37, 0.6)',
        backdropFilter: 'blur(10px)'
      }}>
        <Space size="middle" wrap>
          <Search
              placeholder={t('ordersAdmin.searchPlaceholder')}
            allowClear
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="points-config-form"
          />
            <Select 
              placeholder={t('ordersAdmin.selectStatus')} 
              style={{ width: 120 }} 
              allowClear 
              value={statusFilter} 
              onChange={setStatusFilter}
              className="points-config-form"
            >
              <Option value="pending">{t('ordersAdmin.status.pending')}</Option>
              <Option value="confirmed">{t('ordersAdmin.status.confirmed')}</Option>
              <Option value="shipped">{t('ordersAdmin.status.shipped')}</Option>
              <Option value="delivered">{t('ordersAdmin.status.delivered')}</Option>
              <Option value="cancelled">{t('ordersAdmin.status.cancelled')}</Option>
          </Select>
            <Select 
              placeholder={t('ordersAdmin.payment.title')} 
              style={{ width: 120 }} 
              allowClear 
              value={paymentFilter} 
              onChange={setPaymentFilter}
              className="points-config-form"
            >
              <Option value="credit">{t('ordersAdmin.payment.credit')}</Option>
            <Option value="paypal">PayPal</Option>
              <Option value="bank_transfer">{t('ordersAdmin.payment.bankTransfer')}</Option>
          </Select>
          <DatePicker.RangePicker 
              placeholder={[t('common.startDate'), t('common.endDate')]}
            value={dateRange}
            onChange={setDateRange}
            className="points-config-form"
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
            style={{ 
              padding: '6px 12px', 
              borderRadius: 6, 
              border: '1px solid rgba(255, 255, 255, 0.2)', 
              background: 'rgba(255, 255, 255, 0.1)', 
              color: '#FFFFFF',
              cursor: 'pointer' 
            }}
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
              className="points-config-form"
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              placeholder={[t('common.startDate'), t('common.endDate')]}
              value={dateRange}
              onChange={setDateRange}
              className="points-config-form"
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
              className="points-config-form"
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
              className="points-config-form"
            >
              <Option value="bank_transfer">{t('ordersAdmin.payment.bankTransfer')}</Option>
              <Option value="credit">{t('ordersAdmin.payment.credit')}</Option>
              <Option value="paypal">PayPal</Option>
            </Select>
          </div>
            
          </div>
        </div>
      )}
      </div>

      {/* 列表滚动容器开始：仅列表滚动 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: 8,
          paddingBottom: 16
        }}
      >
      {!isMobile ? (
      <div className="points-config-form">
      <Table
        columns={columns}
          dataSource={filteredSorted}
        rowKey="id"
        loading={loading || paginatedLoading}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        scroll={{
          y: 'calc(100vh - 350px)', // 启用虚拟滚动
          x: 'max-content'
        }}
        title={() => (
          <Space>
              <button 
                type="button" 
                disabled={selectedRowKeys.length === 0} 
                onClick={async () => {
              setLoading(true)
              try {
                await Promise.all(selectedRowKeys.map(id => updateDocument<Order>(COLLECTIONS.ORDERS, String(id), { status: 'confirmed' } as any)))
                  message.success(t('ordersAdmin.batchConfirmed'))
                await refreshPaginated()
                setSelectedRowKeys([])
              } finally {
                setLoading(false)
              }
                }} 
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: 6, 
                  border: '1px solid rgba(255, 255, 255, 0.2)', 
                  background: selectedRowKeys.length === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)', 
                  color: '#FFFFFF',
                  cursor: selectedRowKeys.length === 0 ? 'not-allowed' : 'pointer', 
                  opacity: selectedRowKeys.length === 0 ? 0.6 : 1 
                }}
              >
                {t('ordersAdmin.batchConfirm')}
            </button>
              <button 
                type="button" 
                disabled={selectedRowKeys.length === 0} 
                onClick={async () => {
                setLoading(true)
                try {
                  await Promise.all(selectedRowKeys.map(id => updateDocument<Order>(COLLECTIONS.ORDERS, String(id), { status: 'delivered' } as any)))
                  message.success(t('ordersAdmin.batchDelivered'))
                await refreshPaginated()
                setSelectedRowKeys([])
              } finally {
                setLoading(false)
              }
                }} 
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: 6, 
                  border: '1px solid rgba(255, 255, 255, 0.2)', 
                  background: selectedRowKeys.length === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)', 
                  color: '#FFFFFF',
                  cursor: selectedRowKeys.length === 0 ? 'not-allowed' : 'pointer', 
                  opacity: selectedRowKeys.length === 0 ? 0.6 : 1 
                }}
              >
                {t('ordersAdmin.batchDeliver')}
            </button>
              <button 
                type="button" 
                disabled={selectedRowKeys.length === 0} 
                onClick={async () => {
              setLoading(true)
              try {
                  await Promise.all(selectedRowKeys.map(id => updateDocument<Order>(COLLECTIONS.ORDERS, String(id), { status: 'cancelled' } as any)))
                  message.success(t('ordersAdmin.batchCancelled'))
                await refreshPaginated()
                setSelectedRowKeys([])
              } finally {
                setLoading(false)
              }
                }} 
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: 6, 
                  border: '1px solid rgba(255, 255, 255, 0.2)', 
                  background: selectedRowKeys.length === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)', 
                  color: '#FFFFFF',
                  cursor: selectedRowKeys.length === 0 ? 'not-allowed' : 'pointer', 
                  opacity: selectedRowKeys.length === 0 ? 0.6 : 1 
                }}
              >
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
                await Promise.all(ids.map(id => deleteOrderOutboundRecords(id)))
                // 最后删除订单
                await Promise.all(ids.map(id => deleteDocument(COLLECTIONS.ORDERS, id)))
                return { success: true }
              }}
              onSuccess={async () => {
                    await refreshPaginated()
                    setSelectedRowKeys([])
              }}
              itemTypeName="订单"
              size="middle"
              type="default"
              danger={true}
              showIcon={true}
              style={{
                background: 'rgba(255, 77, 79, 0.8)',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: 700
              }}
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
        style={{
          background: 'transparent'
        }}
      />
      </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredSorted.map(order => {
            const matchStatus = getOrderMatchStatus(order.id)
            const createdDate = order.createdAt ? 
              (typeof (order.createdAt as any).toDate === 'function' ? (order.createdAt as any).toDate() : order.createdAt) 
              : new Date()
            const formattedDate = dayjs(createdDate).isValid() ? dayjs(createdDate).format('YYYY-MM-DD') : '-'
            
            return (
              <div key={order.id} style={{ border: '1px solid rgba(244,175,37,0.2)', borderRadius: 12, padding: 12, background: 'rgba(34,28,16,0.5)', backdropFilter: 'blur(10px)' }}>
                {/* 订单号和日期同行 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                    {t('ordersAdmin.orderNo')}: {order.id.substring(0, 20)}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    {formattedDate}
                  </div>
                </div>
                
                {/* 用户名和状态同行 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                    {getUserName(order.userId, users)}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: getStatusColor(order.status) === 'green' ? '#34d399' : getStatusColor(order.status) === 'red' ? '#f87171' : getStatusColor(order.status) === 'orange' ? '#fb923c' : getStatusColor(order.status) === 'blue' ? '#60a5fa' : '#a78bfa' }}>
                    {getStatusText(order.status, t)}
                  </span>
                </div>
                
                {/* 手机号和查看按钮同行 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                    {getUserPhone(order.userId, users) || '-'}
                  </div>
                  <button style={{ padding: '4px 8px', borderRadius: 6, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => { setViewing(order); setIsEditingInView(false) }}>
                    {t('common.viewDetails')}
                  </button>
                </div>
                
                {/* 商品列表和金额 */}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(244,175,37,0.1)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  {/* 商品列表 */}
                  <div style={{ flex: 1 }}>
                    {order.items.slice(0, 2).map((item, index) => (
                      <div key={`${order.id}_${item.cigarId}_${index}`} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                        • {getCigarName(item.cigarId)} × {item.quantity}
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                        +{order.items.length - 2} {t('common.more')}
                      </div>
                    )}
                  </div>
                  
                  {/* 金额和财务匹配状态 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#f4af25' }}>RM {order.total.toFixed(2)}</div>
                      {/* 财务匹配状态 */}
                      {matchStatus.status === 'fully' && (
                        <CheckOutlined style={{ color: '#34d399', fontSize: '16px' }} />
                      )}
                    </div>
                    {matchStatus.status === 'partial' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <ClockCircleOutlined style={{ color: '#fb923c', fontSize: '14px' }} />
                        <span style={{ fontSize: 10, color: '#fb923c' }}>RM{matchStatus.matched.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {filteredSorted.length === 0 && (
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', padding: '24px 0' }}>{t('common.noData')}</div>
          )}
        </div>
      )}
      </div>

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
        styles={getModalThemeStyles(isMobile, true)}
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
            onOrderUpdate={async () => {
              await refreshPaginated()
            }}
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
        {...getResponsiveModalConfig(isMobile, true, 960)}
        className="create-order-modal"
        footer={[
          <button 
            key="cancel" 
            type="button" 
            onClick={() => setCreating(false)} 
            style={{ 
              padding: '6px 14px', 
              borderRadius: 8, 
              border: '1px solid rgba(255, 255, 255, 0.2)', 
              background: 'rgba(255, 255, 255, 0.1)', 
              color: '#FFFFFF',
              cursor: 'pointer' 
            }}
          >
            {t('common.cancel')}
          </button>,
          <button 
            key="submit" 
            type="button" 
            className="cigar-btn-gradient" 
            onClick={() => {
            const formEl = document.getElementById('createOrderForm') as HTMLFormElement | null
            if (formEl) formEl.requestSubmit()
            }} 
            style={{ 
              padding: '6px 14px', 
              borderRadius: 8, 
              cursor: 'pointer' 
            }}
          >
            {t('common.create')}
          </button>
        ]}
        okButtonProps={{
          style: {
            background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
            border: 'none',
            color: '#111',
            fontWeight: 700
          }
        }}
        cancelButtonProps={{
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF'
          }
        }}
        styles={{
          content: {
            background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
            border: '1px solid rgba(244, 175, 37, 0.6)'
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(244, 175, 37, 0.6)'
          },
          body: {
            background: 'transparent'
          },
          footer: {
            background: 'transparent',
            borderTop: '1px solid rgba(244, 175, 37, 0.6)'
          }
        }}
      >
        <CreateOrderForm
          users={users}
          cigars={cigars}
          onCreateSuccess={async () => {
              message.success(t('ordersAdmin.created'))
              setCreating(false)
              await refreshPaginated()
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
