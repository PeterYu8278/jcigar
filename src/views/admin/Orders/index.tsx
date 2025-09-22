// 订单管理页面
import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Table, Button, Tag, Space, Typography, Input, Select, DatePicker, message, Modal, Form, InputNumber, Switch, Dropdown, Checkbox, Descriptions } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, ShoppingOutlined } from '@ant-design/icons'
import type { Order, User, Cigar } from '../../../types'
import { getAllOrders, getUsers, getCigars, updateDocument, deleteDocument, COLLECTIONS, createDirectSaleOrder } from '../../../services/firebase/firestore'

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
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    id: true,
    userId: true,
    items: true,
    total: true,
    status: true,
    payment: true,
    shipping: true,
    createdAt: true,
    action: true,
  })

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
    return user ? `${user.displayName} (${user.email})` : userId
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
          <div style={{ fontWeight: 'bold' }}>{getUserInfo(userId)}</div>
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
          ¥{total.toFixed(2)}
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
  const columns = columnsAll.filter(c => visibleCols[c.key as string] !== false)

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>订单管理</Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreating(true); createForm.resetFields(); createForm.setFieldsValue({ items: [{ cigarId: undefined, quantity: 1 }], paymentMethod: 'bank_transfer' }) }}>手动创建订单</Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'export',
                  label: '导出 CSV',
                  onClick: () => {
                    const data = filtered
                    const header = ['id','userId','total','status','payment.method','shipping.address','createdAt']
                    const rows = data.map((order: Order) => [
                      order.id,
                      getUserInfo(order.userId),
                      order.total,
                      order.status,
                      order.payment.method,
                      order.shipping.address,
                      dayjs(order.createdAt).format('YYYY-MM-DD HH:mm'),
                    ])
                    const csv = [header.join(','), ...rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g,'""')}"`).join(','))].join('\n')
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'orders.csv'
                    a.click()
                    URL.revokeObjectURL(url)
                  },
                },
                { type: 'divider', key: 'd1' },
                {
                  key: 'columns',
                  label: (
                    <div style={{ padding: 8 }}>
                      <div style={{ fontWeight: 500, marginBottom: 8 }}>列显示</div>
                      {Object.keys(visibleCols).map((k) => (
                        <div key={k} style={{ marginBottom: 4 }}>
                          <Checkbox
                            checked={visibleCols[k] !== false}
                            onChange={(e) => setVisibleCols(v => ({ ...v, [k]: e.target.checked }))}
                          >
                            {k}
                          </Checkbox>
                        </div>
                      ))}
                    </div>
                  ),
                },
              ],
            }}
          >
            <Button>更多</Button>
          </Dropdown>
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

      <Table
        columns={columns}
        dataSource={filtered}
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
          total: filtered.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
        }}
      />

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
                <Button type={isEditingInView ? 'default' : 'primary'} onClick={() => { setIsEditingInView(v => !v); form.setFieldsValue({ status: viewing.status, trackingNumber: viewing.shipping.trackingNumber || '' }) }}>{isEditingInView ? '完成' : '编辑'}</Button>
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
                  ¥{viewing.total.toFixed(2)}
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
                    render: (price: number) => `¥${price.toFixed(2)}`,
                  },
                  {
                    title: '小计',
                    key: 'subtotal',
                    render: (_, item) => `¥${(item.price * item.quantity).toFixed(2)}`,
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
                    const updateData: Partial<Order> = {
                      status: values.status,
                      shipping: {
                        ...viewing.shipping,
                        trackingNumber: values.trackingNumber,
                      }
                    }
                    const res = await updateDocument<Order>(COLLECTIONS.ORDERS, viewing.id, updateData)
                    if (res.success) {
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
                <Select.Option key={u.id} value={u.id}>{u.displayName} ({u.email})</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.List name="items" initialValue={[{ cigarId: undefined, quantity: 1 }]}>
            {(fields, { add, remove }) => (
              <div>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'cigarId']}
                      fieldKey={[field.fieldKey!, 'cigarId'] as any}
                      rules={[{ required: true, message: '请选择商品' }]}
                      style={{ minWidth: 320 }}
                    >
                      <Select placeholder="请选择商品">
                        {cigars.map(c => (
                          <Select.Option key={c.id} value={c.id}>{c.name} - ¥{c.price}</Select.Option>
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
            <Input placeholder="备注（可选）" />
          </Form.Item>
          <Form.Item label="配送地址" name="address">
            <Input placeholder="配送地址（可选）" />
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
