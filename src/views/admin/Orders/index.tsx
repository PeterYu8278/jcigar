// 订单管理页面
import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Table, Button, Tag, Space, Typography, Input, Select, DatePicker, message, Modal, Form, InputNumber, Switch, Descriptions } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, ShoppingOutlined } from '@ant-design/icons'
import type { Order, User, Cigar } from '../../../types'
import { getAllOrders, getUsers, getCigars, updateDocument, deleteDocument, COLLECTIONS, createDirectSaleOrder, createDocument } from '../../../services/firebase/firestore'

const { Title } = Typography
const { Search } = Input
const { Option } = Select

const AdminOrders: React.FC = () => {
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
      message.error('加载数据失败')
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
      case 'pending': return '待确认'
      case 'confirmed': return '已确认'
      case 'shipped': return '已发货'
      case 'delivered': return '已送达'
      case 'cancelled': return '已取消'
      default: return '未知'
    }
  }

  const getPaymentText = (method: string) => {
    switch (method) {
      case 'credit': return '信用卡'
      case 'paypal': return 'PayPal'
      case 'bank_transfer': return '银行转账'
      default: return '未知'
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
      title: '订单ID',
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
      title: '用户',
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
      title: '商品',
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
              +{record.items.length - 2} 更多...
            </div>
          )}
        </div>
      ),
    },
    {
      title: '总金额',
      dataIndex: 'total',
      key: 'total',
      render: (total: number) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          RM{total.toFixed(2)}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '支付方式',
      dataIndex: ['payment', 'method'],
      key: 'payment',
      render: (method: string) => getPaymentText(method),
    },
    {
      title: '配送地址',
      dataIndex: ['shipping', 'address'],
      key: 'shipping',
      render: (address: string) => (
        <span style={{ fontSize: '12px' }}>
          {address ? (address.length > 20 ? `${address.substring(0, 20)}...` : address) : '-'}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Order) => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} size="small" onClick={() => { setViewing(record); setIsEditingInView(false) }}>
            查看
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
        <Title level={2}>订单管理</Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreating(true); createForm.resetFields(); createForm.setFieldsValue({ items: [{ cigarId: undefined, quantity: 1 }], paymentMethod: 'bank_transfer' }) }}>手动创建订单</Button>
          
          <Button onClick={() => { 
            setKeyword('')
            setStatusFilter(undefined)
            setPaymentFilter(undefined)
            setDateRange(null)
            setSelectedRowKeys([])
          }}>
            重置筛选
          </Button>
        </Space>
      </div>

      {/* 搜索和筛选 */}
      {!isMobile ? (
        <div style={{ marginBottom: 16, padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
          <Space size="middle" wrap>
            <Search
              placeholder="搜索订单ID、用户姓名或邮箱"
              allowClear
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Select placeholder="选择状态" style={{ width: 120 }} allowClear value={statusFilter} onChange={setStatusFilter}>
              <Option value="pending">待确认</Option>
              <Option value="confirmed">已确认</Option>
              <Option value="shipped">已发货</Option>
              <Option value="delivered">已送达</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
            <Select placeholder="支付方式" style={{ width: 120 }} allowClear value={paymentFilter} onChange={setPaymentFilter}>
              <Option value="credit">信用卡</Option>
              <Option value="paypal">PayPal</Option>
              <Option value="bank_transfer">银行转账</Option>
            </Select>
            <DatePicker.RangePicker 
              placeholder={['开始日期', '结束日期']}
              value={dateRange}
              onChange={setDateRange}
            />
            <Button type="primary" icon={<SearchOutlined />}>
              搜索
            </Button>
          </Space>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <Search
              placeholder="搜索订单ID、用户姓名或邮箱"
              allowClear
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', width: '48%' }}>
            <Select
              placeholder="全部状态"
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="pending">处理中</Option>
              <Option value="confirmed">已确认</Option>
              <Option value="shipped">已发货</Option>
              <Option value="delivered">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </div>
          <div style={{ position: 'relative', width: '48%' }}>
            <Select
              placeholder="支付方式"
              allowClear
              value={paymentFilter}
              onChange={setPaymentFilter}
              style={{ width: '100%' }}
            >
              <Option value="bank_transfer">银行转账</Option>
              <Option value="credit">信用卡</Option>
              <Option value="paypal">PayPal</Option>
            </Select>
          </div>
            <Button type="link" onClick={() => setSortDesc(v => !v)} style={{ color: '#f4af25', paddingInline: 6 }}>
              排序
            </Button>
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
                  message.success('已批量确认')
                  loadData()
                  setSelectedRowKeys([])
                } finally {
                  setLoading(false)
                }
              }}>
                批量确认
              </Button>
              <Button disabled={selectedRowKeys.length === 0} onClick={async () => {
                setLoading(true)
                try {
                  await Promise.all(selectedRowKeys.map(id => updateDocument<Order>(COLLECTIONS.ORDERS, String(id), { status: 'delivered' } as any)))
                  message.success('已批量标记送达')
                  loadData()
                  setSelectedRowKeys([])
                } finally {
                  setLoading(false)
                }
              }}>
                批量送达
              </Button>
              <Button disabled={selectedRowKeys.length === 0} onClick={async () => {
                setLoading(true)
                try {
                  await Promise.all(selectedRowKeys.map(id => updateDocument<Order>(COLLECTIONS.ORDERS, String(id), { status: 'cancelled' } as any)))
                  message.success('已批量取消')
                  loadData()
                  setSelectedRowKeys([])
                } finally {
                  setLoading(false)
                }
              }}>
                批量取消
              </Button>
              <Button danger disabled={selectedRowKeys.length === 0} onClick={() => {
                Modal.confirm({
                  title: '批量删除确认',
                  content: `确定删除选中的 ${selectedRowKeys.length} 个订单吗？`,
                  okButtonProps: { danger: true },
                  onOk: async () => {
                    setLoading(true)
                    try {
                      await Promise.all(selectedRowKeys.map(id => deleteDocument(COLLECTIONS.ORDERS, String(id))))
                      message.success('已批量删除')
                      loadData()
                      setSelectedRowKeys([])
                    } finally {
                      setLoading(false)
                    }
                  }
                })
              }}>
                批量删除
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
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>订单号: {order.id}</div>
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
                <Button type="primary" style={{ background: 'linear-gradient(145deg, #f4d03f, #d4af37)', color: '#221c10', boxShadow: '0 4px 15px rgba(244,175,37,0.4)', borderRadius: 9999 }} size="small" onClick={() => { setViewing(order); setIsEditingInView(false) }}>
                  查看详情
                </Button>
              </div>
            </div>
          ))}
          {filteredSorted.length === 0 && (
            <div style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>暂无数据</div>
          )}
        </div>
      )}

      {/* 查看订单详情 */}
      <Modal
        title="订单详情"
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
                    <Button onClick={async () => { await updateDocument(COLLECTIONS.ORDERS, viewing.id, { status: 'confirmed' } as any); message.success('订单已确认'); loadData() }}>确认订单</Button>
                    <Button onClick={async () => { await updateDocument(COLLECTIONS.ORDERS, viewing.id, { status: 'shipped' } as any); message.success('订单已发货'); loadData() }}>标记发货</Button>
                    <Button onClick={async () => { await updateDocument(COLLECTIONS.ORDERS, viewing.id, { status: 'delivered' } as any); message.success('订单已送达'); loadData() }}>标记送达</Button>
                    <Button danger onClick={async () => { await updateDocument(COLLECTIONS.ORDERS, viewing.id, { status: 'cancelled' } as any); message.success('订单已取消'); loadData() }}>取消订单</Button>
                  </>
                )}
                <Button type={isEditingInView ? 'default' : 'primary'} onClick={() => { setIsEditingInView(v => !v); form.setFieldsValue({ status: viewing.status, trackingNumber: viewing.shipping.trackingNumber || '', addItems: [{ cigarId: undefined, quantity: 1 }] }) }}>{isEditingInView ? '完成' : '编辑'}</Button>
                <Button danger onClick={() => {
                  Modal.confirm({
                    title: '删除订单确认',
                    content: `确认删除订单 ${viewing.id} 吗？`,
                    okButtonProps: { danger: true },
                    onOk: async () => {
                      const res = await deleteDocument(COLLECTIONS.ORDERS, viewing.id)
                      if (res.success) { message.success('订单已删除'); setViewing(null); loadData() }
                    }
                  })
                }}>删除</Button>
                <Button onClick={() => { setViewing(null); setIsEditingInView(false) }}>关闭</Button>
              </Space>
            </div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="订单ID" span={2}>
                <span style={{ fontFamily: 'monospace' }}>{viewing.id}</span>
              </Descriptions.Item>
              <Descriptions.Item label="用户">
                {getUserInfo(viewing.userId)}
              </Descriptions.Item>
              <Descriptions.Item label="订单状态">
                <Tag color={getStatusColor(viewing.status)}>
                  {getStatusText(viewing.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="总金额">
                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                  RM{viewing.total.toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="支付方式">
                {getPaymentText(viewing.payment.method)}
              </Descriptions.Item>
              <Descriptions.Item label="交易ID">
                {viewing.payment.transactionId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="支付时间">
                {viewing.payment.paidAt ? dayjs(viewing.payment.paidAt).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="配送地址" span={2}>
                {viewing.shipping.address || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="运单号">
                {viewing.shipping.trackingNumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(viewing.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>
            
            <div style={{ marginTop: 16 }}>
              <Title level={5}>商品明细</Title>
              <Table
                size="small"
                dataSource={viewing.items}
                rowKey={(item) => `${viewing.id}_${item.cigarId}`}
                columns={[
                  {
                    title: '雪茄',
                    key: 'cigar',
                    render: (_, item) => getCigarInfo(item.cigarId),
                  },
                  {
                    title: '数量',
                    dataIndex: 'quantity',
                    key: 'quantity',
                  },
                  {
                    title: '单价',
                    dataIndex: 'price',
                    key: 'price',
                    render: (price: number) => `RM${price.toFixed(2)}`,
                  },
                  {
                    title: '小计',
                    key: 'subtotal',
                    render: (_, item) => `RM${(item.price * item.quantity).toFixed(2)}`,
                  },
                ]}
                pagination={false}
              />
            </div>
            {isEditingInView && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>编辑</Title>
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
                      message.success('订单已更新')
                      loadData()
                    }
                  } finally {
                    setLoading(false)
                  }
                }}>
                  <Form.Item label="订单状态" name="status" rules={[{ required: true, message: '请选择订单状态' }]}>
                    <Select>
                      <Option value="pending">待确认</Option>
                      <Option value="confirmed">已确认</Option>
                      <Option value="shipped">已发货</Option>
                      <Option value="delivered">已送达</Option>
                      <Option value="cancelled">已取消</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item label="运单号" name="trackingNumber">
                    <Input placeholder="输入运单号" />
                  </Form.Item>
                  <Form.List name="addItems" initialValue={[{ cigarId: undefined, quantity: 1 }]}>
                    {(fields, { add, remove }) => (
                      <div>
                        <Title level={5}>添加商品</Title>
                        {fields.map((field) => (
                          <Space key={`add-${field.key}`} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                            <Form.Item
                              {...field}
                              name={[field.name, 'cigarId']}
                              fieldKey={[field.fieldKey!, 'cigarId'] as any}
                              rules={[{ required: true, message: '请选择商品' }]}
                              style={{ minWidth: 280 }}
                            >
                              <Select placeholder="请选择商品">
                                {cigars.map(c => (
                                  <Select.Option key={c.id} value={c.id}>{c.name} - RM{(c as any)?.price ?? 0}</Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                            <Form.Item
                              {...field}
                              name={[field.name, 'quantity']}
                              fieldKey={[field.fieldKey!, 'quantity'] as any}
                              rules={[{ required: true, message: '请输入数量' }]}
                            >
                              <InputNumber min={1} placeholder="数量" />
                            </Form.Item>
                            {fields.length > 1 && (
                              <Button danger onClick={() => remove(field.name)}>移除</Button>
                            )}
                          </Space>
                        ))}
                        <Form.Item>
                          <Button type="dashed" onClick={() => add({ quantity: 1 })} icon={<PlusOutlined />}>添加商品</Button>
                        </Form.Item>
                      </div>
                    )}
                  </Form.List>
                  <Form.Item>
                    <Space>
                      <Button type="primary" onClick={() => form.submit()} loading={loading}>保存</Button>
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
        title="手动创建订单"
        open={creating}
        onCancel={() => setCreating(false)}
        onOk={() => createForm.submit()}
        confirmLoading={loading}
        width={720}
      >
        <Form form={createForm} layout="vertical" onFinish={async (values: any) => {
          const userId: string = values.userId
          const items: { cigarId: string; quantity: number }[] = (values.items || []).filter((it: any) => it?.cigarId && it?.quantity > 0)
          if (!userId) { message.warning('请选择用户'); return }
          if (items.length === 0) { message.warning('请添加至少一件商品'); return }
          setLoading(true)
          try {
            const res = await createDirectSaleOrder({ userId, items, note: values.note })
            if (res.success) {
              message.success('订单已创建')
              setCreating(false)
              createForm.resetFields()
              loadData()
            } else {
              message.error('创建失败')
            }
          } finally {
            setLoading(false)
          }
        }}>
          <Form.Item label="选择用户" name="userId" rules={[{ required: true, message: '请选择用户' }]}> 
            <Select showSearch placeholder="请选择用户">
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
                      rules={[{ required: true, message: '请选择商品' }]}
                      style={{ minWidth: 320 }}
                    >
                      <Select placeholder="请选择商品">
                        {cigars.map(c => (
                          <Select.Option key={c.id} value={c.id}>{c.name} - RM{c.price}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'quantity']}
                      fieldKey={[field.fieldKey!, 'quantity'] as any}
                      rules={[{ required: true, message: '请输入数量' }]}
                    >
                      <InputNumber min={1} placeholder="数量" />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button danger onClick={() => remove(field.name)}>移除</Button>
                    )}
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ quantity: 1 })} icon={<PlusOutlined />}>添加商品</Button>
                </Form.Item>
              </div>
            )}
          </Form.List>

          <Form.Item label="备注" name="note">
            <Input placeholder="备注（选填）" />
          </Form.Item>
          <Form.Item label="配送地址" name="address">
            <Input placeholder="配送地址（选填）" />
          </Form.Item>
          <Form.Item label="支付方式" name="paymentMethod" initialValue="bank_transfer">
            <Select>
              <Select.Option value="bank_transfer">银行转账</Select.Option>
              <Select.Option value="credit">信用卡</Select.Option>
              <Select.Option value="paypal">PayPal</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AdminOrders
