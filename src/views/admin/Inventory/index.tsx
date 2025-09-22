// 库存管理页面
import React, { useEffect, useMemo, useState } from 'react'
import { Table, Button, Tag, Space, Typography, Input, Select, Progress, Modal, Form, InputNumber, message, Dropdown, Checkbox, Tabs, Card } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, WarningOutlined, UploadOutlined, DownloadOutlined, MinusCircleOutlined } from '@ant-design/icons'
import type { Cigar, InventoryLog } from '../../../types'
import { getCigars, createDocument, updateDocument, deleteDocument, COLLECTIONS, getAllInventoryLogs, getAllOrders, getUsers } from '../../../services/firebase/firestore'

const { Title } = Typography
const { Search } = Input
const { Option } = Select

const AdminInventory: React.FC = () => {
  const [items, setItems] = useState<Cigar[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Cigar | null>(null)
  const [deleting, setDeleting] = useState<Cigar | null>(null)
  const [adjustingIn, setAdjustingIn] = useState<Cigar | null>(null)
  const [adjustingOut, setAdjustingOut] = useState<Cigar | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [form] = Form.useForm()
  const [adjForm] = Form.useForm()
  const [inForm] = Form.useForm()
  const [outForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState<string>('list')
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  const [keyword, setKeyword] = useState('')
  const [originFilter, setOriginFilter] = useState<string | undefined>()
  const [strengthFilter, setStrengthFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    id: true,
    name: true,
    spec: true,
    price: true,
    stockStatus: true,
    action: true,
  })

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const list = await getCigars()
        setItems(list)
        const logs = await getAllInventoryLogs()
        setInventoryLogs(logs)
        const [os, us] = await Promise.all([getAllOrders(), getUsers()])
        setOrders(os)
        setUsers(us)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'mild': return 'green'
      case 'medium': return 'orange'
      case 'full': return 'red'
      default: return 'default'
    }
  }

  const getStrengthText = (strength: string) => {
    switch (strength) {
      case 'mild': return '温和'
      case 'medium': return '中等'
      case 'full': return '浓郁'
      default: return '未知'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'green'
      case 'low': return 'orange'
      case 'critical': return 'red'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'normal': return '正常'
      case 'low': return '库存偏低'
      case 'critical': return '库存告急'
      default: return '未知'
    }
  }

  const getStockProgress = (stock: number, minStock: number) => {
    const percentage = (stock / (minStock * 2)) * 100
    return Math.min(percentage, 100)
  }

  const getProgressStatus = (stock: number, minStock: number) => {
    if (stock <= minStock) return 'exception'
    if (stock <= minStock * 1.5) return 'active'
    return 'success'
  }

  const filtered = useMemo(() => {
    return items.filter(i => {
      const kw = keyword.trim().toLowerCase()
      const passKw = !kw || i.name?.toLowerCase().includes(kw) || i.brand?.toLowerCase().includes(kw)
      const passOrigin = !originFilter || i.origin === originFilter
      const status = ((i as any)?.inventory?.stock ?? 0) <= ((i as any)?.inventory?.minStock ?? 0) ? 'critical' : ((i as any)?.inventory?.stock ?? 0) <= (((i as any)?.inventory?.minStock ?? 0) * 1.5) ? 'low' : 'normal'
      const passStatus = !statusFilter || status === statusFilter
      const passStrength = !strengthFilter || i.strength === strengthFilter
      return passKw && passOrigin && passStatus && passStrength
    })
  }, [items, keyword, originFilter, strengthFilter, statusFilter])

  const columnsAll = [
    {
      title: '产品ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '雪茄名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.brand} - {record.origin}
          </div>
        </div>
      ),
    },
    {
      title: '规格',
      key: 'spec',
      render: (_: any, record: any) => (
        <div>
          <div>{record.size}</div>
          <Tag color={getStrengthColor(record.strength)}>
            {getStrengthText(record.strength)}
          </Tag>
        </div>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `¥${price}`,
      sorter: (a: any, b: any) => a.price - b.price,
    },
    {
      title: '库存状态',
      key: 'stockStatus',
      render: (_: any, record: any) => (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>当前库存: {(record as any)?.inventory?.stock ?? 0}</span>
            <span>已预留: {(record as any)?.inventory?.reserved ?? 0}</span>
          </div>
          <Progress
            percent={getStockProgress((record as any)?.inventory?.stock ?? 0, (record as any)?.inventory?.minStock ?? 0)}
            status={getProgressStatus((record as any)?.inventory?.stock ?? 0, (record as any)?.inventory?.minStock ?? 0)}
            size="small"
            format={() => `${(record as any)?.inventory?.stock ?? 0}/${(((record as any)?.inventory?.minStock ?? 0) * 2)}`}
          />
          <Tag color={getStatusColor(((record as any)?.inventory?.stock ?? 0) <= ((record as any)?.inventory?.minStock ?? 0) ? 'critical' : ((record as any)?.inventory?.stock ?? 0) <= (((record as any)?.inventory?.minStock ?? 0) * 1.5) ? 'low' : 'normal')} style={{ marginTop: 4 }}>
            {getStatusText(((record as any)?.inventory?.stock ?? 0) <= ((record as any)?.inventory?.minStock ?? 0) ? 'critical' : ((record as any)?.inventory?.stock ?? 0) <= (((record as any)?.inventory?.minStock ?? 0) * 1.5) ? 'low' : 'normal')}
          </Tag>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} size="small" onClick={() => {
            setEditing(record)
            form.setFieldsValue({
              name: record.name,
              brand: record.brand,
              origin: record.origin,
              size: record.size,
              strength: record.strength,
              price: record.price,
              stock: (record as any)?.inventory?.stock ?? 0,
              minStock: (record as any)?.inventory?.minStock ?? 0,
              reserved: (record as any)?.inventory?.reserved ?? 0,
            })
          }}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => { setAdjustingIn(record); adjForm.setFieldsValue({ quantity: 1, reason: '入库' }) }}>
            入库
          </Button>
          <Button type="link" size="small" onClick={() => { setAdjustingOut(record); adjForm.setFieldsValue({ quantity: 1, reason: '出库' }) }}>
            出库
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} size="small" onClick={() => setDeleting(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]
  const columns = columnsAll.filter(c => visibleCols[c.key as string] !== false)

  const logColumns = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: any) => v ? new Date(v).toLocaleString() : '-' },
    { title: '产品', dataIndex: 'cigarId', key: 'cigarId', render: (id: string) => items.find(i => i.id === id)?.name || id },
    { title: '类型', dataIndex: 'type', key: 'type', render: (t: string) => t === 'in' ? '入库' : '出库' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '单号', dataIndex: 'referenceNo', key: 'referenceNo', render: (v: any) => v || '-' },
    { title: '原因', dataIndex: 'reason', key: 'reason', render: (v: any) => v || '-' },
    { title: '操作人', dataIndex: 'operatorId', key: 'operatorId', render: (v: any) => v || '-' },
  ]

  const inLogs = useMemo(() => inventoryLogs.filter(l => (l as any).type === 'in'), [inventoryLogs])
  const outLogs = useMemo(() => inventoryLogs.filter(l => (l as any).type === 'out'), [inventoryLogs])

  const outFromOrders = useMemo(() => {
    // 将订单按商品拆分为出库行
    const userMap = new Map(users.map((u: any) => [u.id, u]))
    const cigarMap = new Map(items.map((c: any) => [c.id, c]))
    const rows: any[] = []
    for (const o of orders) {
      const createdAt = (o as any).createdAt
      const user = userMap.get(o.userId)
      const source = (o as any).source?.type || 'direct'
      for (const it of (o.items || [])) {
        const cigar = cigarMap.get(it.cigarId)
        rows.push({
          id: `${o.id}_${it.cigarId}`,
          orderId: o.id,
          createdAt,
          user: user ? `${user.displayName} <${user.email}>` : o.userId,
          cigarName: cigar ? cigar.name : it.cigarId,
          quantity: it.quantity,
          source,
        })
      }
    }
    // 按时间倒序
    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [orders, users, items])

  const outOrderColumns = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: any) => v ? new Date(v).toLocaleString() : '-' },
    { title: '订单ID', dataIndex: 'orderId', key: 'orderId' },
    { title: '用户', dataIndex: 'user', key: 'user' },
    { title: '产品', dataIndex: 'cigarName', key: 'cigarName' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '来源', dataIndex: 'source', key: 'source', render: (s: string) => s === 'event' ? '活动' : '直接销售' },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>库存管理</Title>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'list',
          label: '产品',
          children: (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Space>
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'export',
                          label: '导出 CSV',
                          icon: <DownloadOutlined />,
                          onClick: () => {
                            const header = ['id','name','brand','origin','size','strength','price','stock','reserved','minStock']
                            const rows = filtered.map((r: any) => [
                              r.id, r.name, r.brand, r.origin, r.size, r.strength, r.price,
                              r?.inventory?.stock ?? 0, r?.inventory?.reserved ?? 0, r?.inventory?.minStock ?? 0,
                            ])
                            const csv = [header.join(','), ...rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g,'""')}"`).join(','))].join('\n')
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = 'inventory.csv'
                            a.click()
                            URL.revokeObjectURL(url)
                          }
                        },
                        { type: 'divider', key: 'd1' },
                        {
                          key: 'columns',
                          label: (
                            <div style={{ padding: 8 }}>
                              <div style={{ fontWeight: 500, marginBottom: 8 }}>列显示</div>
                              {Object.keys(visibleCols).map((k) => (
                                <div key={k} style={{ marginBottom: 4 }}>
                                  <Checkbox checked={visibleCols[k] !== false} onChange={(e) => setVisibleCols(v => ({ ...v, [k]: e.target.checked }))}>{k}</Checkbox>
                                </div>
                              ))}
                            </div>
                          )
                        }
                      ]
                    }}
                  >
                    <Button>更多</Button>
                  </Dropdown>
                  <Button onClick={() => { setKeyword(''); setOriginFilter(undefined); setStrengthFilter(undefined); setStatusFilter(undefined); setSelectedRowKeys([]) }}>重置筛选</Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreating(true); form.resetFields() }}>
                    添加产品
                  </Button>
                  <Button icon={<WarningOutlined />}>库存预警</Button>
                </Space>
              </div>

              <div style={{ marginBottom: 16, padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
                <Space size="middle" wrap>
                  <Search
                    placeholder="搜索产品名称或品牌"
                    allowClear
                    style={{ width: 300 }}
                    prefix={<SearchOutlined />}
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                  <Select placeholder="选择产地" style={{ width: 140 }} allowClear value={originFilter} onChange={setOriginFilter}>
                    {[...new Set(items.map(i => i.origin).filter(Boolean))].map(org => (
                      <Option key={org} value={org}>{org}</Option>
                    ))}
                  </Select>
                  <Select placeholder="选择强度" style={{ width: 120 }} allowClear value={strengthFilter} onChange={setStrengthFilter}>
                    <Option value="mild">温和</Option>
                    <Option value="medium">中等</Option>
                    <Option value="full">浓郁</Option>
                  </Select>
                  <Select placeholder="库存状态" style={{ width: 140 }} allowClear value={statusFilter} onChange={setStatusFilter}>
                    <Option value="normal">正常</Option>
                    <Option value="low">库存偏低</Option>
                    <Option value="critical">库存告急</Option>
                  </Select>
                </Space>
              </div>

              {(() => null)()}

              <Table
                columns={columns}
                dataSource={filtered}
                rowKey="id"
                loading={loading}
                rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                pagination={{
                  total: items.length,
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
                }}
              />
            </div>
          )
        },
        {
          key: 'in',
          label: '入库',
          children: (
            <Card>
              <Form form={inForm} layout="vertical" onFinish={async (values: { referenceNo?: string; reason?: string; items: { cigarId: string; quantity: number }[] }) => {
                const lines = (values.items || []).filter(it => it?.cigarId && it?.quantity > 0)
                if (lines.length === 0) { message.warning('请添加至少一条入库明细'); return }
                setLoading(true)
                try {
                  for (const line of lines) {
                    const target = items.find(i => i.id === line.cigarId) as any
                    if (!target) continue
                    const qty = Math.max(1, Math.floor(line.quantity || 1))
                    const current = target?.inventory?.stock ?? 0
                    const next = current + qty
                    await updateDocument(COLLECTIONS.CIGARS, target.id, { inventory: { ...target.inventory, stock: next } } as any)
                    await createDocument(COLLECTIONS.INVENTORY_LOGS, {
                      cigarId: target.id,
                      type: 'in',
                      quantity: qty,
                      reason: values.reason || '入库',
                      referenceNo: values.referenceNo,
                      operatorId: 'system',
                      createdAt: new Date(),
                    } as any)
                  }
                  message.success('入库成功')
                  inForm.resetFields()
                  setItems(await getCigars())
                  setInventoryLogs(await getAllInventoryLogs())
                } finally {
                  setLoading(false)
                }
              }}>
                <Form.List name="items" initialValue={[{ cigarId: undefined, quantity: 1 }]}> 
                  {(fields, { add, remove }) => (
                    <div>
                      {fields.map(({ key, name, ...restField }) => (
                        <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                          <Form.Item
                            {...restField}
                            name={[name, 'cigarId']}
                            rules={[{ required: true, message: '请选择产品' }]}
                            style={{ minWidth: 320 }}
                          >
                            <Select placeholder="请选择产品">
                              {items.map(i => (
                                <Option key={i.id} value={i.id}>{i.name} - ¥{i.price}（库存：{(i as any)?.inventory?.stock ?? 0}）</Option>
                              ))}
                            </Select>
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'quantity']}
                            rules={[{ required: true, message: '请输入数量' }]}
                          >
                            <InputNumber min={1} placeholder="数量" />
                          </Form.Item>
                          {fields.length > 1 && (
                            <MinusCircleOutlined onClick={() => remove(name)} />
                          )}
                        </Space>
                      ))}
                      <Form.Item>
                        <Button type="dashed" onClick={() => add({ quantity: 1 })} icon={<PlusOutlined />}>新增明细</Button>
                      </Form.Item>
                    </div>
                  )}
                </Form.List>
                <Form.Item label="单号" name="referenceNo">
                  <Input placeholder="请输入入库单号（可选）" />
                </Form.Item>
                <Form.Item label="原因" name="reason">
                  <Input placeholder="例如：采购入库" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>确认入库</Button>
                </Form.Item>
              </Form>
              <Table
                style={{ marginTop: 16 }}
                title={() => '入库记录'}
                columns={logColumns}
                dataSource={inLogs}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          )
        },
        {
          key: 'out',
          label: '出库',
          children: (
            <Card>
              <Table
                title={() => '出库记录（来源订单）'}
                columns={outOrderColumns}
                dataSource={outFromOrders}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          )
        }
      ]} />

      {/* 创建/编辑 弹窗 */}
      <Modal
        title={editing ? '编辑产品' : '添加产品'}
        open={creating || !!editing}
        onCancel={() => { setCreating(false); setEditing(null) }}
        onOk={() => form.submit()}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={async (values: any) => {
          setLoading(true)
          try {
            const payload: Partial<Cigar> = {
              name: values.name,
              brand: values.brand,
              origin: values.origin,
              size: values.size,
              strength: values.strength,
              price: values.price,
              inventory: {
                stock: values.stock ?? 0,
                reserved: values.reserved ?? 0,
                minStock: values.minStock ?? 0,
              } as any,
              updatedAt: new Date(),
            } as any
            if (editing) {
              const res = await updateDocument<Cigar>(COLLECTIONS.CIGARS, editing.id, payload)
              if (res.success) message.success('已保存')
            } else {
              await createDocument<Cigar>(COLLECTIONS.CIGARS, { ...payload, createdAt: new Date(), images: [], description: '', metadata: { rating: 0, reviews: 0, tags: [] } } as any)
              message.success('已创建')
            }
            const list = await getCigars()
            setItems(list)
            setCreating(false)
            setEditing(null)
          } finally {
            setLoading(false)
          }
        }}>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="品牌" name="brand" rules={[{ required: true, message: '请输入品牌' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="产地" name="origin" rules={[{ required: true, message: '请输入产地' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="尺寸" name="size" rules={[{ required: true, message: '请输入尺寸' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="强度" name="strength" rules={[{ required: true, message: '请选择强度' }]}>
            <Select>
              <Option value="mild">温和</Option>
              <Option value="medium">中等</Option>
              <Option value="full">浓郁</Option>
            </Select>
          </Form.Item>
          <Form.Item label="价格 (¥)" name="price" rules={[{ required: true, message: '请输入价格' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="当前库存" name="stock">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="已预留" name="reserved">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="最低库存" name="minStock">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 入库/出库 弹窗 */}
      <Modal
        title={adjustingIn ? `入库 - ${(adjustingIn as any)?.name}` : adjustingOut ? `出库 - ${(adjustingOut as any)?.name}` : ''}
        open={!!adjustingIn || !!adjustingOut}
        onCancel={() => { setAdjustingIn(null); setAdjustingOut(null) }}
        onOk={() => adjForm.submit()}
        confirmLoading={loading}
      >
        <Form form={adjForm} layout="vertical" onFinish={async (values: { quantity: number; reason?: string; referenceNo?: string }) => {
          const target = adjustingIn || adjustingOut
          if (!target) return
          const delta = (adjustingIn ? 1 : -1) * Math.max(1, Math.floor(values.quantity || 1))
          const current = (target as any)?.inventory?.stock ?? 0
          const next = Math.max(0, current + delta)
          setLoading(true)
          try {
            await updateDocument<Cigar>(COLLECTIONS.CIGARS, (target as any).id, { inventory: { ...(target as any).inventory, stock: next } } as any)
            await createDocument<InventoryLog>(COLLECTIONS.INVENTORY_LOGS, {
              cigarId: (target as any).id,
              type: adjustingIn ? 'in' : 'out',
              quantity: Math.abs(delta),
              reason: values.reason || (adjustingIn ? '入库' : '出库'),
              referenceNo: values.referenceNo,
              operatorId: 'system',
              createdAt: new Date(),
            } as any)
            message.success('已更新库存')
            setItems(await getCigars())
            setAdjustingIn(null)
            setAdjustingOut(null)
          } finally {
            setLoading(false)
          }
        }}>
          <Form.Item label="数量" name="quantity" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          {adjustingIn && (
            <Form.Item label="单号" name="referenceNo">
              <Input placeholder="请输入入库单号（可选）" />
            </Form.Item>
          )}
          <Form.Item label="原因" name="reason">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* 删除确认 */}
      <Modal
        title="删除产品"
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onOk={async () => {
          if (!deleting) return
          setLoading(true)
          try {
            const res = await deleteDocument(COLLECTIONS.CIGARS, (deleting as any).id)
            if (res.success) {
              message.success('已删除')
              setItems(await getCigars())
            }
          } finally {
            setLoading(false)
            setDeleting(null)
          }
        }}
        okButtonProps={{ danger: true }}
      >
        确认删除产品 {(deleting as any)?.name}？该操作不可撤销。
      </Modal>
    </div>
  )
}

export default AdminInventory
