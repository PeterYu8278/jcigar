// 库存管理页面
import React, { useEffect, useMemo, useState } from 'react'
import { Table, Button, Tag, Space, Typography, Input, Select, Progress, Modal, Form, InputNumber, message, Dropdown, Checkbox, Tabs, Card, Upload } from 'antd'
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
  const [viewingReference, setViewingReference] = useState<string | null>(null)
  const [imageList, setImageList] = useState<any[]>([])

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
      case 'mild': return 'Mild'
      case 'medium': return 'Medium'
      case 'full': return 'Full'
      default: return 'Unknown'
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
      case 'normal': return 'Normal'
      case 'low': return 'Low Stock'
      case 'critical': return 'Critical Stock'
      default: return 'Unknown'
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
      title: 'Cigar Name',
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
      title: 'Specification',
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
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `RM${price}`,
      sorter: (a: any, b: any) => a.price - b.price,
    },
    {
      title: 'Stock Status',
      key: 'stockStatus',
      render: (_: any, record: any) => (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Current Stock: {(record as any)?.inventory?.stock ?? 0}</span>
            <span>Reserved: {(record as any)?.inventory?.reserved ?? 0}</span>
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
      title: 'Actions',
      key: 'action',
      render: (_: any, record: any) => (
        <Button size="small" onClick={() => {
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
        }}>View</Button>
      ),
    },
  ]
  const columns = columnsAll.filter(c => visibleCols[c.key as string] !== false)

  const logColumns = [
    { title: 'Time', dataIndex: 'createdAt', key: 'createdAt', render: (v: any) => v ? new Date(v).toLocaleString() : '-' },
    { title: 'Product', dataIndex: 'cigarId', key: 'cigarId', render: (id: string) => items.find(i => i.id === id)?.name || id },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (t: string) => t === 'in' ? 'Inbound' : 'Outbound' },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
    { 
      title: 'Reference No', 
      dataIndex: 'referenceNo', 
      key: 'referenceNo', 
      render: (v: any) => v ? (
        <Button type="link" onClick={() => setViewingReference(v)}>
          {v}
        </Button>
      ) : '-'
    },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (v: any) => v || '-' },
    { title: 'Operator', dataIndex: 'operatorId', key: 'operatorId', render: (v: any) => v || '-' },
  ]

  const inLogs = useMemo(() => inventoryLogs.filter(l => (l as any).type === 'in'), [inventoryLogs])
  const outLogs = useMemo(() => inventoryLogs.filter(l => (l as any).type === 'out'), [inventoryLogs])
  
  // 按单号分组的入库记录
  const referenceGroups = useMemo(() => {
    const groups: Record<string, InventoryLog[]> = {}
    inLogs.forEach(log => {
      const refNo = (log as any).referenceNo
      if (refNo) {
        if (!groups[refNo]) {
          groups[refNo] = []
        }
        groups[refNo].push(log)
      }
    })
    return groups
  }, [inLogs])
  
  // 当前查看的单号相关记录
  const currentReferenceLogs = useMemo(() => {
    if (!viewingReference) return []
    return referenceGroups[viewingReference] || []
  }, [viewingReference, referenceGroups])

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
    { title: 'Time', dataIndex: 'createdAt', key: 'createdAt', render: (v: any) => v ? new Date(v).toLocaleString() : '-' },
    { title: '订单ID', dataIndex: 'orderId', key: 'orderId' },
    { title: '用户', dataIndex: 'user', key: 'user' },
    { title: '产品', dataIndex: 'cigarName', key: 'cigarName' },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
    { title: '来源', dataIndex: 'source', key: 'source', render: (s: string) => s === 'event' ? '活动' : '直接销售' },
  ]

  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false

  const brands = useMemo(() => {
    return Array.from(new Set(items.map(i => i.brand).filter(Boolean))) as string[]
  }, [items])

  const groupedByBrand = useMemo(() => {
    const map: Record<string, { display: string; items: Cigar[] }> = {}
    for (const it of filtered) {
      const raw = (it.brand || '其他').trim()
      const lower = raw.toLowerCase()
      if (!map[lower]) map[lower] = { display: raw, items: [] }
      map[lower].items.push(it)
    }
    const keys = Object.keys(map).sort((a, b) => map[a].display.localeCompare(map[b].display, undefined, { sensitivity: 'base' }))
    return keys.map(k => ({ key: map[k].display, items: map[k].items.sort((a, b) => (a.name || '').localeCompare(b.name || '')) }))
  }, [filtered])

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
                  {selectedRowKeys.length > 1 && (
                    <>
                      <Button onClick={async () => {
                        setLoading(true)
                        try {
                          await Promise.all(selectedRowKeys.map(id => updateDocument(COLLECTIONS.CIGARS, String(id), { status: 'inactive' } as any)))
                          message.success('已批量禁用')
                          const list = await getCigars()
                          setItems(list)
                          setSelectedRowKeys([])
                        } finally {
                          setLoading(false)
                        }
                      }}>批量禁用</Button>
                      <Button danger onClick={() => {
                        Modal.confirm({
                          title: '批量删除确认',
                          content: `确定删除选中的 ${selectedRowKeys.length} 个产品吗？`,
                          okButtonProps: { danger: true },
                          onOk: async () => {
                            setLoading(true)
                            try {
                              await Promise.all(selectedRowKeys.map(id => deleteDocument(COLLECTIONS.CIGARS, String(id))))
                              message.success('已批量删除')
                              const list = await getCigars()
                              setItems(list)
                              setSelectedRowKeys([])
                            } finally {
                              setLoading(false)
                            }
                          }
                        })
                      }}>批量删除</Button>
                    </>
                  )}
                  <Button onClick={() => { setKeyword(''); setOriginFilter(undefined); setStrengthFilter(undefined); setStatusFilter(undefined); setSelectedRowKeys([]) }}>重置筛选</Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreating(true); form.resetFields() }}>
            添加产品
          </Button>
                  <Button icon={<WarningOutlined />}>库存预警</Button>
        </Space>
      </div>

              {!isMobile && (
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
              )}

              {/* Mobile search + pills */}
              {isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  <div style={{ position: 'relative' }}>
                    <Search
                      placeholder="搜索品牌或商品"
                      allowClear
                      style={{ width: '100%' }}
                      prefix={<SearchOutlined style={{ color: '#f4af25' }} />}
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Select
                      placeholder="所有品牌"
                      allowClear
                      value={originFilter as any}
                      onChange={setOriginFilter}
                      style={{ flex: 1 }}
                    >
                      {[...new Set(items.map(i => i.origin).filter(Boolean))].map(org => (
                        <Option key={org} value={org}>{org}</Option>
                      ))}
                    </Select>
                    <Select
                      placeholder="库存状态"
                      allowClear
                      value={statusFilter as any}
                      onChange={setStatusFilter}
                      style={{ flex: 1 }}
                    >
                      <Option value="normal">正常</Option>
                      <Option value="low">低库存</Option>
                      <Option value="critical">缺货</Option>
                    </Select>
                    <Button type="primary" ghost onClick={() => setStatusFilter('low')}>低库存</Button>
                  </div>
                </div>
              )}

              {!isMobile ? (
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
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {groupedByBrand.map(group => (
                    <div key={group.key} style={{ border: '1px solid rgba(244,175,37,0.2)', borderRadius: 16, overflow: 'hidden', background: 'rgba(0,0,0,0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
                      <div style={{ padding: 12, background: 'rgba(0,0,0,0.3)' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{group.key}</div>
                      </div>
                      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {group.items.map(record => (
                          <div key={record.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}>
                              {/* 占位图，可接入真实图片字段 */}
                              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, color: '#fff' }}>{record.name}</div>
                              <div style={{ fontSize: 12, color: 'rgba(224,214,196,0.6)' }}>{record.size || ''} {record.size ? '|' : ''} SKU: {(record as any)?.sku || record.id}</div>
                              <div style={{ fontWeight: 700, color: '#f4af25', marginTop: 2 }}>RM{record.price?.toLocaleString?.() || record.price}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginTop: 4 }}>
                                {(() => {
                                  const st = ((record as any)?.inventory?.stock ?? 0) <= ((record as any)?.inventory?.minStock ?? 0)
                                    ? 'critical' : ((record as any)?.inventory?.stock ?? 0) <= (((record as any)?.inventory?.minStock ?? 0) * 1.5)
                                    ? 'low' : 'normal'
                                  const color = st === 'normal' ? '#16a34a' : st === 'low' ? '#f59e0b' : '#ef4444'
                                  const text = st === 'normal' ? '充足' : st === 'low' ? '低库存' : '缺货'
                                  return (
                                    <>
                                      <span style={{ width: 8, height: 8, borderRadius: 9999, background: color, display: 'inline-block' }} />
                                      <span style={{ color }}>{text}</span>
                                      <span style={{ color: 'rgba(224,214,196,0.6)' }}>|</span>
                                      <span style={{ color: '#fff' }}>{((record as any)?.inventory?.stock ?? 0)} 件</span>
                                    </>
                                  )
                                })()}
                              </div>
                            </div>
                            <Button type="primary" style={{ background: 'linear-gradient(to bottom, #f4af25, #c78d1a)', color: '#221c10' }} shape="circle" onClick={() => {
                              setEditing(record)
                              form.setFieldsValue({
                                name: (record as any).name,
                                brand: (record as any).brand,
                                origin: (record as any).origin,
                                size: (record as any).size,
                                strength: (record as any).strength,
                                price: (record as any).price,
                                stock: (record as any)?.inventory?.stock ?? 0,
                                minStock: (record as any)?.inventory?.minStock ?? 0,
                                reserved: (record as any)?.inventory?.reserved ?? 0,
                              })
                            }}>
                              编辑
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {groupedByBrand.length === 0 && (
                    <div style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>暂无数据</div>
                  )}
                </div>
              )}
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
                                <Option key={i.id} value={i.id}>{i.name} - RM{i.price}（库存：{(i as any)?.inventory?.stock ?? 0}）</Option>
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
                  <Input placeholder="请输入入库单号（选填）" />
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
            <div>
              <Card style={{ marginBottom: 16 }}>
                <Form form={outForm} layout="vertical" onFinish={async (values: { referenceNo?: string; reason?: string; items: { cigarId: string; quantity: number }[] }) => {
                  const lines = (values.items || []).filter(it => it?.cigarId && it?.quantity > 0)
                  if (lines.length === 0) { message.warning('请添加至少一条出库明细'); return }
                  setLoading(true)
                  try {
                    for (const line of lines) {
                      const target = items.find(i => i.id === line.cigarId) as any
                      if (!target) continue
                      const qty = Math.max(1, Math.floor(line.quantity || 1))
                      const current = target?.inventory?.stock ?? 0
                      const next = Math.max(0, current - qty)
                      await updateDocument(COLLECTIONS.CIGARS, target.id, { inventory: { ...target.inventory, stock: next } } as any)
                      await createDocument(COLLECTIONS.INVENTORY_LOGS, {
                        cigarId: target.id,
                        type: 'out',
                        quantity: qty,
                        reason: values.reason || '出库',
                        referenceNo: values.referenceNo,
                        operatorId: 'system',
                        createdAt: new Date(),
                      } as any)
                    }
                    message.success('出库成功')
                    outForm.resetFields()
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
                                  <Option key={i.id} value={i.id}>{i.name} - RM{i.price}（库存：{(i as any)?.inventory?.stock ?? 0}）</Option>
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
                    <Input placeholder="请输入出库单号（选填）" />
                  </Form.Item>
                  <Form.Item label="原因" name="reason">
                    <Input placeholder="例如：销售出库" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>确认出库</Button>
                  </Form.Item>
                </Form>
              </Card>
              <Card>
                <Table
                  title={() => '出库记录（来源订单）'}
                  columns={outOrderColumns}
                  dataSource={outFromOrders}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            </div>
          )
        }
      ]} />

      {/* 创建/编辑 弹窗 */}
      <Modal
        title={editing ? '编辑产品' : '添加产品'}
        open={creating || !!editing}
        onCancel={() => { setCreating(false); setEditing(null) }}
        width={isMobile ? '100%' : 600}
        footer={isMobile ? (
          <div style={{ padding: '8px 0' }}>
            <Button type="primary" block loading={loading} onClick={() => form.submit()} style={{ background: 'linear-gradient(to bottom, #f4af25, #c78d1a)', color: '#221c10', boxShadow: '0 4px 15px -5px rgba(244,175,37,0.5)' }}>保存</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Space>
              {editing && (
                <>
                  <Button danger onClick={() => {
                    Modal.confirm({
                      title: '删除产品',
                      content: `确定删除产品 ${(editing as any)?.name || ''} 吗？`,
                      okButtonProps: { danger: true },
                      onOk: async () => {
                        setLoading(true)
                        try {
                          const res = await deleteDocument(COLLECTIONS.CIGARS, (editing as any).id)
                          if (res.success) {
                            message.success('已删除')
                            setItems(await getCigars())
                            setEditing(null)
                          }
                        } finally {
                          setLoading(false)
                        }
                      }
                    })
                  }}>删除</Button>
                </>
              )}
            </Space>
            <Space>
              <Button onClick={() => { setCreating(false); setEditing(null) }}>取消</Button>
              <Button type="primary" loading={loading} onClick={() => form.submit()}>确认</Button>
            </Space>
          </div>
        )}
      >
        <div style={{ maxWidth: isMobile ? 520 : 'unset', margin: isMobile ? '0 auto' : undefined }}>
          {/* 图片上传占位 */}
          {isMobile && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Upload
                listType="picture-card"
                fileList={imageList}
                beforeUpload={() => false}
                onChange={({ fileList }) => setImageList(fileList)}
                showUploadList={{ showPreviewIcon: false }}
              >
                {imageList.length === 0 && (
                  <div style={{ width: 96, height: 96, border: '2px dashed rgba(244,175,37,0.5)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,28,16,0.5)', color: 'rgba(244,175,37,0.7)' }}>
                    上传
                  </div>
                )}
              </Upload>
              <div style={{ fontSize: 12, color: 'rgba(244,175,37,0.8)' }}>上传产品图片</div>
            </div>
          )}
        </div>
        <Form form={form} layout="horizontal" labelCol={{ flex: '100px' }} wrapperCol={{ flex: 'auto' }} onFinish={async (values: any) => {
          setLoading(true)
          try {
            const payload: Partial<Cigar> = {
              name: values.name,
              brand: values.brand,
              origin: values.origin,
              size: values.size,
              strength: values.strength,
              price: values.price,
              sku: values.sku,
              inventory: {
                // 库存为系统自动计算：编辑时保留原值；新增初始化为0
                stock: editing ? ((editing as any)?.inventory?.stock ?? 0) : 0,
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
          <Form.Item label={isMobile ? '产品名称' : '名称'} name="name" rules={[{ required: true, message: '请输入名称' }]}> 
            <Input />
          </Form.Item>
          <Form.Item label="SKU" name="sku">
            <Input />
          </Form.Item>
          <Form.Item label="品牌" name="brand" rules={[{ required: true, message: '请输入品牌' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="产地" name="origin" rules={[{ required: true, message: '请输入产地' }]}> 
            <Input />
          </Form.Item>
          <Form.Item label={isMobile ? '规格' : '尺寸'} name="size" rules={[{ required: true, message: '请输入尺寸' }]}> 
            <Input />
          </Form.Item>
          <Form.Item label="强度" name="strength" rules={[{ required: true, message: '请选择强度' }]}> 
            <Select>
              <Option value="mild">温和</Option>
              <Option value="medium">中等</Option>
              <Option value="full">浓郁</Option>
            </Select>
          </Form.Item>
          <Form.Item label="价格 (RM)" name="price" rules={[{ required: true, message: '请输入价格' }]}> 
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label={isMobile ? '库存' : '当前库存'} name="stock"> 
            <InputNumber min={0} style={{ width: '100%' }} disabled readOnly />
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
              <Input placeholder="请输入入库单号（选填）" />
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

      {/* 单号详情弹窗 */}
      <Modal
        title={`单号详情 - ${viewingReference}`}
        open={!!viewingReference}
        onCancel={() => setViewingReference(null)}
        footer={null}
        width={800}
      >
        <Table
          columns={[
            { title: 'Time', dataIndex: 'createdAt', key: 'createdAt', render: (v: any) => v ? new Date(v).toLocaleString() : '-' },
            { title: 'Product', dataIndex: 'cigarId', key: 'cigarId', render: (id: string) => items.find(i => i.id === id)?.name || id },
            { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
            { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (v: any) => v || '-' },
            { title: 'Operator', dataIndex: 'operatorId', key: 'operatorId', render: (v: any) => v || '-' },
          ]}
          dataSource={currentReferenceLogs}
          rowKey="id"
          pagination={false}
          size="small"
        />
        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>单号汇总</div>
          <div>总产品种类：{currentReferenceLogs.length} 种</div>
          <div>总入库数量：{currentReferenceLogs.reduce((sum, log) => sum + (log.quantity || 0), 0)} 支</div>
        </div>
      </Modal>
    </div>
  )
}

export default AdminInventory
