// 订单管理页面
import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Table, Button, Tag, Space, Typography, Input, Select, DatePicker, message, Modal, Form, InputNumber, Switch, Descriptions } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, ShoppingOutlined } from '@ant-design/icons'
import type { Order, User, Cigar } from '../../../types'
import { getAllOrders, getUsers, getCigars, updateDocument, deleteDocument, COLLECTIONS, createDirectSaleOrder, createDocument } from '../../../services/firebase/firestore'
import { useTranslation } from 'react-i18next'

const { Title } = Typography
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
  const [form] = Form.useForm()
  const [createForm] = Form.useForm()
  const [creating, setCreating] = useState(false)

  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [paymentFilter, setPaymentFilter] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [ordersData, usersData, cigarsData] = await Promise.all([
        getAllOrders(),
        getUsers(),
        getCigars()
      ])
      setOrders(ordersData)
      setUsers(usersData)
      setCigars(cigarsData)
    } catch (error) {
      message.error(t('messages.dataLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return orders.filter(order => {
      const kw = keyword.trim().toLowerCase()
      const user = users.find(u => u.id === order.userId)
      const passKw = !kw || 
        order.id.toLowerCase().includes(kw) ||
        (user?.displayName?.toLowerCase().includes(kw)) ||
        (user?.email?.toLowerCase().includes(kw))
      
      const passStatus = !statusFilter || order.status === statusFilter
      const passPayment = !paymentFilter || order.payment.method === paymentFilter
      
      const passDate = !dateRange || !dateRange[0] || !dateRange[1] || (
        dayjs(order.createdAt).isAfter(dateRange[0]) && 
        dayjs(order.createdAt).isBefore(dateRange[1])
      )
      
      return passKw && passStatus && passPayment && passDate
    })
  }, [orders, users, keyword, statusFilter, paymentFilter, dateRange])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange'
      case 'confirmed': return 'blue'
      case 'shipped': return 'purple'
      case 'delivered': return 'green'
      case 'cancelled': return 'red'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t('ordersAdmin.status.pending')
      case 'confirmed': return t('ordersAdmin.status.confirmed')
      case 'shipped': return t('ordersAdmin.status.shipped')
      case 'delivered': return t('ordersAdmin.status.delivered')
      case 'cancelled': return t('ordersAdmin.status.cancelled')
      default: return t('profile.unknown')
    }
  }

  const getPaymentText = (method: string) => {
    switch (method) {
      case 'credit': return t('ordersAdmin.payment.credit')
      case 'paypal': return 'PayPal'
      case 'bank_transfer': return t('ordersAdmin.payment.bankTransfer')
      default: return t('profile.unknown')
    }
  }

  const getUserInfo = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (!user) return userId
    const name = user.displayName || user.email || user.id
    const email = user.email || ''
    return email ? `${name} (${email})` : name
  }

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user ? (user.displayName || user.email || user.id) : userId
  }
  const getUserPhone = (userId: string) => {
    const user = users.find(u => u.id === userId) as any
    return user ? (user?.profile?.phone || '') : ''
  }

  const getCigarInfo = (cigarId: string) => {
    const cigar = cigars.find(c => c.id === cigarId)
    return cigar ? `${cigar.name} (${cigar.brand})` : cigarId
  }

  const columnsAll = [
    {
      title: t('ordersAdmin.orderId'),
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {id.substring(0, 8)}...
        </span>
      ),
    },
    {
      title: t('ordersAdmin.user'),
      dataIndex: 'userId',
      key: 'userId',
      render: (userId: string) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{getUserName(userId)}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{getUserPhone(userId) || '-'}</div>
        </div>
      ),
    },
    {
      title: t('ordersAdmin.items'),
      key: 'items',
      render: (_: any, record: Order) => (
        <div>
          {record.items.slice(0, 2).map((item) => (
            <div key={`${record.id}_${item.cigarId}`} style={{ fontSize: '12px', marginBottom: 2 }}>
              {getCigarInfo(item.cigarId)} × {item.quantity}
            </div>
          ))}
          {record.items.length > 2 && (
            <div style={{ fontSize: '11px', color: '#666' }}>
              +{record.items.length - 2} {t('common.more')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('ordersAdmin.totalAmount'),
      dataIndex: 'total',
      key: 'total',
      render: (total: number) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          RM{total.toFixed(2)}
        </span>
      ),
    },
    {
      title: t('ordersAdmin.status.title'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: t('ordersAdmin.payment.title'),
      dataIndex: ['payment', 'method'],
      key: 'payment',
      render: (method: string) => getPaymentText(method),
    },
    {
      title: t('ordersAdmin.address'),
      dataIndex: ['shipping', 'address'],
      key: 'shipping',
      render: (address: string) => (
        <span style={{ fontSize: '12px' }}>
          {address ? (address.length > 20 ? `${address.substring(0, 20)}...` : address) : '-'}
        </span>
      ),
    },
    {
      title: t('ordersAdmin.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: t('ordersAdmin.actions'),
      key: 'action',
      render: (_: any, record: Order) => (
        <Space size="small" style={{ justifyContent: 'center', width: '100%' }}>
          <Button type="link" icon={<EyeOutlined />} size="small" onClick={() => { setViewing(record); setIsEditingInView(false) }}>
          </Button>
        </Space>
      ),
    },
  ]
  const columns = columnsAll

  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  const [sortDesc, setSortDesc] = useState<boolean>(true)

  const filteredSorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      const ta = new Date(a.createdAt as any).getTime()
      const tb = new Date(b.createdAt as any).getTime()
      return sortDesc ? (tb - ta) : (ta - tb)
    })
    return list
  }, [filtered, sortDesc])

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 10, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent'}}>{t('navigation.orders')}</Title>
        <Space>
          <Button type='primary' icon={<PlusOutlined />} onClick={() => { setCreating(true); createForm.resetFields(); createForm.setFieldsValue({ items: [{ cigarId: undefined, quantity: 1 }], paymentMethod: 'bank_transfer' }) }} style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }}>{t('ordersAdmin.createManual')}</Button>
          
          <Button onClick={() => { 
            setKeyword('')
            setStatusFilter(undefined)
            setPaymentFilter(undefined)
            setDateRange(null)
            setSelectedRowKeys([])
          }}>
            {t('common.resetFilters')}
          </Button>
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
          <Button type='primary' icon={<SearchOutlined />} style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }}>
              {t('common.search')}
          </Button>
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
            <Button disabled={selectedRowKeys.length === 0} onClick={async () => {
              setLoading(true)
              try {
                await Promise.all(selectedRowKeys.map(id => updateDocument<Order>(COLLECTIONS.ORDERS, String(id), { status: 'confirmed' } as any)))
                  message.success(t('ordersAdmin.batchConfirmed'))
                loadData()
                setSelectedRowKeys([])
              } finally {
                setLoading(false)
              }
            }}>
                {t('ordersAdmin.batchConfirm')}
            </Button>
              <Button disabled={selectedRowKeys.length === 0} onClick={async () => {
                setLoading(true)
                try {
                  await Promise.all(selectedRowKeys.map(id => updateDocument<Order>(COLLECTIONS.ORDERS, String(id), { status: 'delivered' } as any)))
                  message.success(t('ordersAdmin.batchDelivered'))
                loadData()
                setSelectedRowKeys([])
              } finally {
                setLoading(false)
              }
            }}>
                {t('ordersAdmin.batchDeliver')}
            </Button>
            <Button disabled={selectedRowKeys.length === 0} onClick={async () => {
              setLoading(true)
              try {
                await Promise.all(selectedRowKeys.map(id => updateDocument<Order>(COLLECTIONS.ORDERS, String(id), { status: 'cancelled' } as any)))
                  message.success(t('ordersAdmin.batchCancelled'))
                loadData()
                setSelectedRowKeys([])
              } finally {
                setLoading(false)
              }
            }}>
                {t('ordersAdmin.batchCancel')}
            </Button>
            <Button danger disabled={selectedRowKeys.length === 0} onClick={() => {
              Modal.confirm({
                  title: t('ordersAdmin.batchDeleteConfirm'),
                  content: t('ordersAdmin.batchDeleteContent', { count: selectedRowKeys.length }),
                okButtonProps: { danger: true },
                onOk: async () => {
                  setLoading(true)
                  try {
                    await Promise.all(selectedRowKeys.map(id => deleteDocument(COLLECTIONS.ORDERS, String(id))))
                      message.success(t('ordersAdmin.batchDeleted'))
                    loadData()
                    setSelectedRowKeys([])
                  } finally {
                    setLoading(false)
                  }
                }
              })
            }}>
                {t('ordersAdmin.batchDelete')}
            </Button>
          </Space>
        )}
        pagination={{
            total: filteredSorted.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
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
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{getUserName(order.userId)}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{getUserPhone(order.userId) || '-'}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: getStatusColor(order.status) === 'green' ? '#34d399' : getStatusColor(order.status) === 'red' ? '#f87171' : getStatusColor(order.status) === 'orange' ? '#fb923c' : getStatusColor(order.status) === 'blue' ? '#60a5fa' : '#a78bfa' }}>
                  {getStatusText(order.status)}
                </span>
              </div>
              
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#f4af25' }}>RM {order.total.toFixed(2)}</div>
                <Button type="primary" style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }} size="small" onClick={() => { setViewing(order); setIsEditingInView(false) }}>
                  {t('common.viewDetails')}
                </Button>
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
        title={t('ordersAdmin.orderDetails')}
        open={!!viewing}
        onCancel={() => { setViewing(null); setIsEditingInView(false) }}
        footer={null}
        width={820}
      >
        {viewing && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <Space>
                {!isEditingInView && (
                  <>
                    <Button onClick={async () => { await updateDocument(COLLECTIONS.ORDERS, viewing.id, { status: 'confirmed' } as any); message.success(t('ordersAdmin.orderConfirmed')); loadData() }}>{t('ordersAdmin.confirmOrder')}</Button>
                    <Button onClick={async () => { await updateDocument(COLLECTIONS.ORDERS, viewing.id, { status: 'shipped' } as any); message.success(t('ordersAdmin.orderShipped')); loadData() }}>{t('ordersAdmin.markShipped')}</Button>
                    <Button onClick={async () => { await updateDocument(COLLECTIONS.ORDERS, viewing.id, { status: 'delivered' } as any); message.success(t('ordersAdmin.orderDelivered')); loadData() }}>{t('ordersAdmin.markDelivered')}</Button>
                    <Button danger onClick={async () => { await updateDocument(COLLECTIONS.ORDERS, viewing.id, { status: 'cancelled' } as any); message.success(t('ordersAdmin.orderCancelled')); loadData() }}>{t('ordersAdmin.cancelOrder')}</Button>
                  </>
                )}
                <Button type={isEditingInView ? 'default' : 'primary'} onClick={() => { setIsEditingInView(v => !v); form.setFieldsValue({ status: viewing.status, trackingNumber: viewing.shipping.trackingNumber || '', addItems: [{ cigarId: undefined, quantity: 1 }] }) }}>{isEditingInView ? t('common.done') : t('common.edit')}</Button>
                <Button danger onClick={() => {
                  Modal.confirm({
                    title: t('ordersAdmin.deleteConfirm'),
                    content: t('ordersAdmin.deleteContent', { id: viewing.id }),
                    okButtonProps: { danger: true },
                    onOk: async () => {
                      const res = await deleteDocument(COLLECTIONS.ORDERS, viewing.id)
                      if (res.success) { message.success(t('ordersAdmin.deleted')); setViewing(null); loadData() }
                    }
                  })
                }}>{t('common.delete')}</Button>
                <Button onClick={() => { setViewing(null); setIsEditingInView(false) }}>{t('common.close')}</Button>
              </Space>
            </div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label={t('ordersAdmin.orderId')} span={2}>
                <span style={{ fontFamily: 'monospace' }}>{viewing.id}</span>
              </Descriptions.Item>
              <Descriptions.Item label={t('ordersAdmin.user')}>
                {getUserInfo(viewing.userId)}
              </Descriptions.Item>
              <Descriptions.Item label={t('ordersAdmin.status.title')}>
                <Tag color={getStatusColor(viewing.status)}>
                  {getStatusText(viewing.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('ordersAdmin.totalAmount')}>
                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                  RM{viewing.total.toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label={t('ordersAdmin.payment.title')}>
                {getPaymentText(viewing.payment.method)}
              </Descriptions.Item>
              <Descriptions.Item label={t('ordersAdmin.transactionId')}>
                {viewing.payment.transactionId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('ordersAdmin.paidAt')}>
                {viewing.payment.paidAt ? dayjs(viewing.payment.paidAt).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('ordersAdmin.address')} span={2}>
                {viewing.shipping.address || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('ordersAdmin.trackingNumber')}>
                {viewing.shipping.trackingNumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('ordersAdmin.createdAt')}>
                {dayjs(viewing.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>
            
            <div style={{ marginTop: 16 }}>
              <Title level={5}>{t('ordersAdmin.itemDetails')}</Title>
              <Table
                size="small"
                dataSource={viewing.items}
                rowKey={(item) => `${viewing.id}_${item.cigarId}`}
                columns={[
                  {
                    title: t('ordersAdmin.item.cigar'),
                    key: 'cigar',
                    render: (_, item) => getCigarInfo(item.cigarId),
                  },
                  {
                    title: t('ordersAdmin.item.quantity'),
                    dataIndex: 'quantity',
                    key: 'quantity',
                  },
                  {
                    title: t('ordersAdmin.item.price'),
                    dataIndex: 'price',
                    key: 'price',
                    render: (price: number) => `RM${price.toFixed(2)}`,
                  },
                  {
                    title: t('ordersAdmin.item.subtotal'),
                    key: 'subtotal',
                    render: (_, item) => `RM${(item.price * item.quantity).toFixed(2)}`,
                  },
                ]}
                pagination={false}
              />
            </div>
            {isEditingInView && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>{t('common.edit')}</Title>
        <Form form={form} layout="vertical" onFinish={async (values: any) => {
                  if (!viewing) return
          setLoading(true)
          try {
                    // 处理新增商品
                    const addLines: { cigarId: string; quantity: number }[] = (values.addItems || []).filter((it: any) => it?.cigarId && it?.quantity > 0)
                    const cigarMap = new Map(cigars.map(c => [c.id, c]))
                    const addItems = addLines.map(l => {
                      const cg = cigarMap.get(l.cigarId)
                      const price = (cg as any)?.price ?? 0
                      return { cigarId: l.cigarId, quantity: Math.max(1, Math.floor(l.quantity || 1)), price }
                    }) as any
                    const mergedItems = [...(viewing.items || []), ...addItems]
                    const newTotal = mergedItems.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 0), 0)

            const updateData: Partial<Order> = {
              status: values.status,
                      items: mergedItems as any,
                      total: newTotal,
              shipping: {
                        ...viewing.shipping,
                trackingNumber: values.trackingNumber,
              }
            }
                    const res = await updateDocument<Order>(COLLECTIONS.ORDERS, viewing.id, updateData)
            if (res.success) {
                      // 同步库存出库与出库日志
                      for (const it of addItems as any[]) {
                        const cigar = cigarMap.get(it.cigarId) as any
                        if (!cigar) continue
                        const current = (cigar?.inventory?.stock ?? 0)
                        const next = Math.max(0, current - (it.quantity || 0))
                        await updateDocument(COLLECTIONS.CIGARS, cigar.id, { inventory: { ...cigar.inventory, stock: next } } as any)
                        await createDocument(COLLECTIONS.INVENTORY_LOGS, {
                          cigarId: cigar.id,
                          type: 'out',
                          quantity: it.quantity || 0,
                          reason: '订单出库',
                          referenceNo: viewing.id,
                          operatorId: 'system',
                          createdAt: new Date(),
                        } as any)
                      }
                      message.success(t('ordersAdmin.updated'))
              loadData()
            }
          } finally {
            setLoading(false)
          }
        }}>
                  <Form.Item label={t('ordersAdmin.status.title')} name="status" rules={[{ required: true, message: t('ordersAdmin.pleaseSelectStatus') }]}>
            <Select>
                      <Option value="pending">{t('ordersAdmin.status.pending')}</Option>
                      <Option value="confirmed">{t('ordersAdmin.status.confirmed')}</Option>
                      <Option value="shipped">{t('ordersAdmin.status.shipped')}</Option>
                      <Option value="delivered">{t('ordersAdmin.status.delivered')}</Option>
                      <Option value="cancelled">{t('ordersAdmin.status.cancelled')}</Option>
            </Select>
          </Form.Item>
                  <Form.Item label={t('ordersAdmin.trackingNumber')} name="trackingNumber">
                    <Input placeholder={t('ordersAdmin.enterTrackingNo')} />
          </Form.Item>
                  <Form.List name="addItems" initialValue={[{ cigarId: undefined, quantity: 1 }]}>
                    {(fields, { add, remove }) => (
                      <div>
                        <Title level={5}>{t('ordersAdmin.addItems')}</Title>
                        {fields.map((field) => (
                          <Space key={`add-${field.key}`} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                            <Form.Item
                              {...field}
                              name={[field.name, 'cigarId']}
                              fieldKey={[field.fieldKey!, 'cigarId'] as any}
                              rules={[{ required: true, message: t('ordersAdmin.pleaseSelectItem') }]}
                              style={{ minWidth: 280 }}
                            >
                              <Select placeholder={t('ordersAdmin.selectItem')}>
                                {cigars.map(c => (
                                  <Select.Option key={c.id} value={c.id}>{c.name} - RM{(c as any)?.price ?? 0}</Select.Option>
                                ))}
            </Select>
          </Form.Item>
                            <Form.Item
                              {...field}
                              name={[field.name, 'quantity']}
                              fieldKey={[field.fieldKey!, 'quantity'] as any}
                              rules={[{ required: true, message: t('ordersAdmin.pleaseEnterQuantity') }]}
                            >
                              <InputNumber min={1} placeholder={t('ordersAdmin.quantity')} />
                            </Form.Item>
                            {fields.length > 1 && (
                              <Button danger onClick={() => remove(field.name)}>{t('common.remove')}</Button>
                            )}
                          </Space>
                        ))}
                        <Form.Item>
                          <Button type="dashed" onClick={() => add({ quantity: 1 })} icon={<PlusOutlined />}>{t('ordersAdmin.addItem')}</Button>
                        </Form.Item>
                      </div>
                    )}
                  </Form.List>
                  <Form.Item>
                    <Space>
                      <Button type='primary' onClick={() => form.submit()} loading={loading} style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }}>{t('common.save')}</Button>
                    </Space>
          </Form.Item>
        </Form>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 手动创建订单 */}
      <Modal
        title={t('ordersAdmin.createManual')}
        open={creating}
        onCancel={() => setCreating(false)}
        onOk={() => createForm.submit()}
        confirmLoading={loading}
        width={720}
      >
        <Form form={createForm} layout="vertical" onFinish={async (values: any) => {
          const userId: string = values.userId
          const items: { cigarId: string; quantity: number }[] = (values.items || []).filter((it: any) => it?.cigarId && it?.quantity > 0)
          if (!userId) { message.warning(t('ordersAdmin.pleaseSelectUser')); return }
          if (items.length === 0) { message.warning(t('ordersAdmin.pleaseAddAtLeastOneItem')); return }
          setLoading(true)
          try {
            const res = await createDirectSaleOrder({ userId, items, note: values.note })
            if (res.success) {
              message.success(t('ordersAdmin.created'))
              setCreating(false)
              createForm.resetFields()
              loadData()
            } else {
              message.error(t('ordersAdmin.createFailed'))
            }
          } finally {
            setLoading(false)
          }
        }}>
          <Form.Item label={t('ordersAdmin.selectUser')} name="userId" rules={[{ required: true, message: t('ordersAdmin.pleaseSelectUser') }]}> 
            <Select showSearch placeholder={t('ordersAdmin.selectUser')}>
              {users.map(u => (
                <Select.Option key={u.id} value={u.id}>{u.displayName} ({u.profile?.phone})</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.List name="items" initialValue={[{ cigarId: undefined, quantity: 1 }]}>
            {(fields, { add, remove }) => (
              <div>
                {fields.map((field) => (
                  <Space key={`create-${field.key}`} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'cigarId']}
                      fieldKey={[field.fieldKey!, 'cigarId'] as any}
                      rules={[{ required: true, message: t('ordersAdmin.pleaseSelectItem') }]}
                      style={{ minWidth: 320 }}
                    >
                      <Select placeholder={t('ordersAdmin.selectItem')}>
                        {cigars.map(c => (
                          <Select.Option key={c.id} value={c.id}>{c.name} - RM{c.price}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'quantity']}
                      fieldKey={[field.fieldKey!, 'quantity'] as any}
                      rules={[{ required: true, message: t('ordersAdmin.pleaseEnterQuantity') }]}
                    >
                      <InputNumber min={1} placeholder={t('ordersAdmin.quantity')} />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button danger onClick={() => remove(field.name)}>{t('common.remove')}</Button>
                    )}
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ quantity: 1 })} icon={<PlusOutlined />}>{t('ordersAdmin.addItem')}</Button>
                </Form.Item>
              </div>
            )}
          </Form.List>

          <Form.Item label={t('ordersAdmin.note')} name="note">
            <Input placeholder={t('ordersAdmin.noteOptional')} />
          </Form.Item>
          <Form.Item label={t('ordersAdmin.address')} name="address">
            <Input placeholder={t('ordersAdmin.addressOptional')} />
          </Form.Item>
          <Form.Item label={t('ordersAdmin.payment.title')} name="paymentMethod" initialValue="bank_transfer">
            <Select>
              <Select.Option value="bank_transfer">{t('ordersAdmin.payment.bankTransfer')}</Select.Option>
              <Select.Option value="credit">{t('ordersAdmin.payment.credit')}</Select.Option>
              <Select.Option value="paypal">PayPal</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AdminOrders
