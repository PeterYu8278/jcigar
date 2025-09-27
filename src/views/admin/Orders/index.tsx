// 订单管理页面
import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Table, Button, Tag, Space, Typography, Input, Select, DatePicker, message, Modal, Form, InputNumber, Switch, Descriptions } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, ShoppingOutlined, ArrowLeftOutlined } from '@ant-design/icons'
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
        <span style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', whiteSpace: 'normal' }}>
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
    <div style={{ minHeight: '100vh' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent', marginBottom: 12 }}>{t('navigation.orders')}</h1>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <button onClick={() => { setCreating(true); createForm.resetFields(); createForm.setFieldsValue({ items: [{ cigarId: undefined, quantity: 1 }], paymentMethod: 'bank_transfer' }) }} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, padding: '8px 16px', background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 700, cursor: 'pointer' }}>
            <PlusOutlined />
            {t('ordersAdmin.createManual')}
          </button>
          
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
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}>
            <SearchOutlined />
            {t('common.search')}
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{getUserName(order.userId)} {getUserPhone(order.userId) || '-'}</div>

                </div>
                <div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: getStatusColor(order.status) === 'green' ? '#34d399' : getStatusColor(order.status) === 'red' ? '#f87171' : getStatusColor(order.status) === 'orange' ? '#fb923c' : getStatusColor(order.status) === 'blue' ? '#60a5fa' : '#a78bfa' }}>
                  {getStatusText(order.status)}
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
          border: 'none',
          boxShadow: 'none'
        }}
        styles={{
          body: { 
            padding: 0, 
            background: 'linear-gradient(180deg, #221c10 0%, #181611 0%)', 
            minHeight: isMobile ? '100vh' : 'auto' 
          },
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
          content: {
            border: 'none',
            boxShadow: 'none',
            background: 'linear-gradient(180deg, #221c10 0%, #181611 0%)'
          }
        }}
        className="order-details-modal"
        closable={false}
        
      >
        {viewing && (
          <div style={{ 
            background: 'transparent', 
            minHeight: isMobile ? '100vh' : 'auto',
            color: '#FFFFFF'
          }}>
            {/* Header */}
            <div style={{ 
              position: 'sticky', 
              top: 0, 
              zIndex: 10, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '16px',
              background: 'transparent',
              backdropFilter: 'blur(10px)'
            }}>
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined />}
                onClick={() => { setViewing(null); setIsEditingInView(false) }}
                style={{ color: '#FFFFFF', fontSize: '20px' }}
              />
              <h1 style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#FFFFFF', 
                margin: 0
              }}>
                {t('ordersAdmin.orderDetails')}
              </h1>
              <Button 
                type="text" 
                onClick={() => { setViewing(null); setIsEditingInView(false) }}
                style={{ color: '#FFFFFF', fontSize: '32px', minWidth: 'auto' }}
              >
                ×
              </Button>
            </div>

            {/* Content */}
            <div style={{ padding: '0 16px 28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* 商品列表 */}
                <section style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(39, 35, 27, 0.5)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(57, 51, 40, 0.7)'
                }}>
                  <h2 style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: '#FFFFFF', 
                    marginBottom: '16px',
                    margin: '0 0 16px 0'
                  }}>
                    {t('ordersAdmin.itemDetails')}
                  </h2>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {viewing.items.map((item, index) => {
                      const cigar = cigars.find(c => c.id === item.cigarId)
                      return (
                        <li key={`${viewing.id}_${item.cigarId}`} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '16px' 
                        }}>
                          <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '8px',
                            background: 'rgba(244, 175, 37, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            color: '#f4af25'
                          }}>
                            🚬
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ 
                              fontWeight: 'bold', 
                              color: '#FFFFFF', 
                              margin: '0 0 4px 0',
                              fontSize: '14px'
                            }}>
                              {cigar?.name || item.cigarId}
                            </p>
                            <p style={{ 
                              fontSize: '12px', 
                              color: '#bab09c',
                              margin: 0
                            }}>
                              {t('ordersAdmin.item.quantity')}: {item.quantity}
                            </p>
                          </div>
                          <p style={{ 
                            fontWeight: '600', 
                            color: '#FFFFFF',
                            margin: 0,
                            fontSize: '14px'
                          }}>
                            RM{item.price.toFixed(2)}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                  <div style={{ 
                    marginTop: '16px', 
                    paddingTop: '16px', 
                    borderTop: '1px solid #393328',
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                  }}>
                    <p style={{ color: '#bab09c', margin: 0, fontSize: '14px' }}>
                      {t('ordersAdmin.totalAmount')}:
                    </p>
                    <p style={{ 
                      fontSize: '20px', 
                      fontWeight: 'bold', 
                      color: '#f4af25',
                      margin: 0
                    }}>
                      RM{viewing.total.toFixed(2)}
                    </p>
                  </div>
                </section>

                {/* 订单信息 */}
                <section style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(39, 35, 27, 0.5)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(57, 51, 40, 0.7)'
                }}>
                  <h2 style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: '#FFFFFF', 
                    marginBottom: '16px',
                    margin: '0 0 16px 0'
                  }}>
                    {t('ordersAdmin.orderInfo')}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <p style={{ color: '#bab09c', margin: 0 }}>{t('ordersAdmin.orderId')}</p>
                      <p style={{ color: '#FFFFFF', margin: 0, fontFamily: 'monospace', justifyContent: "right", wordBreak: 'break-all', whiteSpace: 'normal' }}>{viewing.id}</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <p style={{ color: '#bab09c', margin: 0 }}>{t('ordersAdmin.status.title')}</p>
                      <Tag color={getStatusColor(viewing.status)} style={{ margin: 0 }}>
                  {getStatusText(viewing.status)}
                </Tag>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <p style={{ color: '#bab09c', margin: 0 }}>{t('ordersAdmin.createdAt')}</p>
                      <p style={{ color: '#FFFFFF', margin: 0 }}>{dayjs(viewing.createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <p style={{ color: '#bab09c', margin: 0 }}>{t('ordersAdmin.payment.title')}</p>
                      <p style={{ color: '#FFFFFF', margin: 0 }}>{getPaymentText(viewing.payment.method)}</p>
                    </div>
                    {viewing.payment.transactionId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <p style={{ color: '#bab09c', margin: 0 }}>{t('ordersAdmin.transactionId')}</p>
                        <p style={{ color: '#FFFFFF', margin: 0, fontFamily: 'monospace', wordBreak: 'break-all', whiteSpace: 'normal' }}>{viewing.payment.transactionId}</p>
                      </div>
                    )}
                    {viewing.payment.paidAt && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <p style={{ color: '#bab09c', margin: 0 }}>{t('ordersAdmin.paidAt')}</p>
                        <p style={{ color: '#FFFFFF', margin: 0 }}>{dayjs(viewing.payment.paidAt).format('YYYY-MM-DD HH:mm')}</p>
                      </div>
                    )}
                    {viewing.shipping.trackingNumber && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <p style={{ color: '#bab09c', margin: 0 }}>{t('ordersAdmin.trackingNumber')}</p>
                        <p style={{ color: '#FFFFFF', margin: 0, fontFamily: 'monospace', wordBreak: 'break-all', whiteSpace: 'normal' }}>{viewing.shipping.trackingNumber}</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* 收货信息 */}
                <section style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(39, 35, 27, 0.5)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(57, 51, 40, 0.7)'
                }}>
                  <h2 style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: '#FFFFFF', 
                    marginBottom: '16px',
                    margin: '0 0 16px 0'
                  }}>
                    {t('ordersAdmin.shippingInfo')}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <p style={{ color: '#bab09c', margin: 0 }}>{t('ordersAdmin.user')}</p>
                      <p style={{ color: '#FFFFFF', margin: 0 }}>{getUserName(viewing.userId)}</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <p style={{ color: '#bab09c', margin: 0 }}>{t('ordersAdmin.phone')}</p>
                      <p style={{ color: '#FFFFFF', margin: 0 }}>{getUserPhone(viewing.userId) || '-'}</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '14px' }}>
                      <p style={{ color: '#bab09c', margin: 0, whiteSpace: 'nowrap', marginRight: '16px' }}>{t('ordersAdmin.address')}</p>
                      <p style={{ color: '#FFFFFF', margin: 0, textAlign: 'right' }}>{viewing.shipping.address || '-'}</p>
                    </div>
                  </div>
                </section>
            </div>
          </div>

            {/* Action Buttons */}
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              background: 'rgba(24, 22, 17, 0.8)',
              backdropFilter: 'blur(10px)',
              padding: '12px 16px',
              borderTop: '1px solid #393328'
            }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {!isEditingInView && (
                  <>
                    <button 
                      onClick={async () => { 
                        await updateDocument(COLLECTIONS.ORDERS, viewing.id, { status: 'confirmed' } as any); 
                        message.success(t('ordersAdmin.orderConfirmed')); 
                        loadData() 
                      }}
                      style={{ 
                        flex: 1, 
                        height: '40px',
                        background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                        color: '#111',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {t('ordersAdmin.confirmOrder')}
                    </button>
                    <button 
                      onClick={async () => { 
                        await updateDocument(COLLECTIONS.ORDERS, viewing.id, { status: 'shipped' } as any); 
                        message.success(t('ordersAdmin.orderShipped')); 
                        loadData() 
                      }}
                      style={{ 
                        flex: 1, 
                        height: '40px',
                        background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                        color: '#111',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {t('ordersAdmin.markShipped')}
                    </button>
                    <button 
                      onClick={async () => { 
                        await updateDocument(COLLECTIONS.ORDERS, viewing.id, { status: 'delivered' } as any); 
                        message.success(t('ordersAdmin.orderDelivered')); 
                        loadData() 
                      }}
                      style={{ 
                        flex: 1, 
                        height: '40px',
                        background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                        color: '#111',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {t('ordersAdmin.markDelivered')}
                    </button>
                  </>
                )}
                <button 
                  onClick={() => { 
                    setIsEditingInView(v => !v); 
                    form.setFieldsValue({ 
                      status: viewing.status, 
                      trackingNumber: viewing.shipping.trackingNumber || ''
                    }) 
                  }}
                  style={{ 
                    height: '40px',
                    background: isEditingInView ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(to right,#FDE08D,#C48D3A)',
                    color: isEditingInView ? '#ccc' : '#111',
                    fontWeight: 'bold',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isEditingInView ? t('common.done') : t('common.edit')}
                </button>
                <Button 
                  danger 
                  onClick={() => {
                    Modal.confirm({
                      title: t('ordersAdmin.deleteConfirm'),
                      content: t('ordersAdmin.deleteContent', { id: viewing.id }),
                      okButtonProps: { danger: true },
                      onOk: async () => {
                        const res = await deleteDocument(COLLECTIONS.ORDERS, viewing.id)
                        if (res.success) { message.success(t('ordersAdmin.deleted')); setViewing(null); loadData() }
                      }
                    })
                  }}
                  style={{ height: '40px' }}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
            {isEditingInView && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>{t('common.edit')}</Title>
        <Form form={form} layout="vertical" onFinish={async (values: any) => {
                  if (!viewing) return
          setLoading(true)
          try {
            const updateData: Partial<Order> = {
              status: values.status,
              shipping: {
                        ...viewing.shipping,
                trackingNumber: values.trackingNumber,
              }
            }
                    const res = await updateDocument<Order>(COLLECTIONS.ORDERS, viewing.id, updateData)
            if (res.success) {
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
                  <Form.Item>
                    <Space>
                      <button onClick={() => form.submit()} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease', opacity: loading ? 0.6 : 1 }}>{t('common.save')}</button>
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
