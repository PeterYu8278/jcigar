// 库存管理页面
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Table, Button, Tag, Space, Typography, Input, Select, Progress, Modal, Form, InputNumber, message, Dropdown, Checkbox, Card, Upload } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, WarningOutlined, UploadOutlined, DownloadOutlined, MinusCircleOutlined, EyeOutlined } from '@ant-design/icons'
import type { Cigar, InventoryLog } from '../../../types'
import { getCigars, createDocument, updateDocument, deleteDocument, COLLECTIONS, getAllInventoryLogs, getAllOrders, getUsers } from '../../../services/firebase/firestore'

const { Title } = Typography
const { Search } = Input
const { Option } = Select

const AdminInventory: React.FC = () => {
  const { t } = useTranslation()
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
      case 'mild': return t('shop.mild')
      case 'medium': return t('shop.medium')
      case 'full': return t('shop.full')
      default: return t('profile.unknown')
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
      case 'normal': return t('inventory.stockNormal')
      case 'low': return t('inventory.stockLow')
      case 'critical': return t('inventory.stockCritical')
      default: return t('profile.unknown')
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
      title: t('inventory.cigarName'),
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
      title: t('inventory.spec'),
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
      title: t('inventory.price'),
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `RM${price}`,
      sorter: (a: any, b: any) => a.price - b.price,
    },
    {
      title: t('inventory.stockStatus'),
      key: 'stockStatus',
      render: (_: any, record: any) => (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>{t('inventory.currentStock')}: {(record as any)?.inventory?.stock ?? 0}</span>
            <span>{t('inventory.reserved')}: {(record as any)?.inventory?.reserved ?? 0}</span>
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
      title: t('inventory.actions'),
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="small" style={{ justifyContent: 'center', width: '100%' }}>
          <Button type="link" icon={<EyeOutlined />} size="small" onClick={() => {
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
          </Button>
        </Space>
      ),
    },
  ]
  const columns = columnsAll.filter(c => visibleCols[c.key as string] !== false)

  const logColumns = [
    { title: t('inventory.time'), dataIndex: 'createdAt', key: 'createdAt', render: (v: any) => v ? new Date(v).toLocaleString() : '-' },
    { title: t('inventory.product'), dataIndex: 'cigarId', key: 'cigarId', render: (id: string) => items.find(i => i.id === id)?.name || id },
    { title: t('inventory.type'), dataIndex: 'type', key: 'type', render: (type: string) => type === 'in' ? t('inventory.stockIn') : t('inventory.stockOut') },
    { title: t('inventory.quantity'), dataIndex: 'quantity', key: 'quantity' },
    { 
      title: t('inventory.referenceNo'), 
      dataIndex: 'referenceNo', 
      key: 'referenceNo', 
      render: (v: any) => v ? (
        <Button type="link" onClick={() => setViewingReference(v)}>
          {v}
        </Button>
      ) : '-'
    },
    { title: t('inventory.reason'), dataIndex: 'reason', key: 'reason', render: (v: any) => v || '-' },
    { title: t('inventory.operator'), dataIndex: 'operatorId', key: 'operatorId', render: (v: any) => v || '-' },
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
    { title: t('inventory.time'), dataIndex: 'createdAt', key: 'createdAt', render: (v: any) => v ? new Date(v).toLocaleString() : '-' },
    { title: t('inventory.orderId'), dataIndex: 'orderId', key: 'orderId' },
    { title: t('inventory.user'), dataIndex: 'user', key: 'user' },
    { title: t('inventory.product'), dataIndex: 'cigarName', key: 'cigarName' },
    { title: t('inventory.quantity'), dataIndex: 'quantity', key: 'quantity' },
    { title: t('inventory.source'), dataIndex: 'source', key: 'source', render: (s: string) => s === 'event' ? t('inventory.event') : t('inventory.directSale') },
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
        <Title level={2} style={{ margin: 10, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent'}}>{t('navigation.inventory')}</Title>
      </div>

      {/* 自定义标签页 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(244,175,37,0.2)' }}>
          {(['list', 'in', 'out'] as const).map((tabKey) => {
            const isActive = activeTab === tabKey
            const baseStyle: React.CSSProperties = {
              flex: 1,
              padding: '10px 0',
              fontWeight: 800,
              fontSize: 12,
              outline: 'none',
              borderBottom: isActive ? '2px solid #f4af25' : '2px solid transparent',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
            }
            const activeStyle: React.CSSProperties = {
              color: 'transparent',
              backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
              WebkitBackgroundClip: 'text',
            }
            const inactiveStyle: React.CSSProperties = {
              color: '#A0A0A0',
            }
            return (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                style={{ ...baseStyle, ...(isActive ? activeStyle : inactiveStyle) }}
              >
                {tabKey === 'list' ? t('inventory.product') : tabKey === 'in' ? t('inventory.stockIn') : t('inventory.stockOut')}
              </button>
            )
          })}
        </div>
        <div style={{ marginTop: 12 }}>
          {activeTab === 'list' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
                  {selectedRowKeys.length > 1 && (
                    <>
                      <Button onClick={async () => {
                        setLoading(true)
                        try {
                          await Promise.all(selectedRowKeys.map(id => updateDocument(COLLECTIONS.CIGARS, String(id), { status: 'inactive' } as any)))
                          message.success(t('inventory.batchDisabled'))
                          const list = await getCigars()
                          setItems(list)
                          setSelectedRowKeys([])
                        } finally {
                          setLoading(false)
                        }
                      }}>{t('inventory.batchDisable')}</Button>
                      <Button danger onClick={() => {
                        Modal.confirm({
                          title: t('inventory.batchDeleteConfirm'),
                          content: t('inventory.batchDeleteContent', { count: selectedRowKeys.length }),
                          okButtonProps: { danger: true },
                          onOk: async () => {
                            setLoading(true)
                            try {
                              await Promise.all(selectedRowKeys.map(id => deleteDocument(COLLECTIONS.CIGARS, String(id))))
                              message.success(t('inventory.batchDeleted'))
                              const list = await getCigars()
                              setItems(list)
                              setSelectedRowKeys([])
                            } finally {
                              setLoading(false)
                            }
                          }
                        })
                      }}>{t('inventory.batchDelete')}</Button>
                    </>
                  )}
        </Space>
        </div>

              {!isMobile && (
       <div style={{ marginBottom: 16, padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
         <Space size="middle" wrap>
           <Search
               placeholder={t('inventory.search')}
             allowClear
             style={{ width: 300 }}
             prefix={<SearchOutlined />}
                     value={keyword}
                     onChange={(e) => setKeyword(e.target.value)}
                   />
                   <Select placeholder={t('inventory.origin')} style={{ width: 140 }} allowClear value={originFilter} onChange={setOriginFilter}>
                     {[...new Set(items.map(i => i.origin).filter(Boolean))].map(org => (
                       <Option key={org} value={org}>{org}</Option>
                     ))}
           </Select>
                   <Select placeholder={t('inventory.strength')} style={{ width: 120 }} allowClear value={strengthFilter} onChange={setStrengthFilter}>
             <Option value="mild">{t('inventory.mild')} </Option>
             <Option value="medium">{t('inventory.medium')}</Option>
             <Option value="full">{t('inventory.full')}</Option>
           </Select>
                   <Select placeholder= {t('inventory.stockStatus')} style={{ width: 140 }} allowClear value={statusFilter} onChange={setStatusFilter}>
             <Option value="normal">{t('inventory.stockNormal')}</Option>
             <Option value="low">{t('inventory.stockLow')}</Option>
             <Option value="critical">{t('inventory.stockCritical')}</Option>
           </Select>
           <Button onClick={() => { setKeyword(''); setOriginFilter(undefined); setStrengthFilter(undefined); setStatusFilter(undefined); setSelectedRowKeys([]) }} style={{ color: '#000000' }}>{t('common.resetFilters')}</Button>
           <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreating(true); form.resetFields() }} style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }}>
             {t('inventory.addProduct')}
           </Button>
         </Space>
       </div>
              )}

              {/* Mobile search + pills */}
              {isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Search
                      placeholder= {t('inventory.search')}
                      allowClear
                      style={{ flex: 1 }}
                      prefix={<SearchOutlined style={{ color: '#f4af25' }} />}
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreating(true); form.resetFields() }} style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }}>
                      {t('inventory.addProduct')}
                    </Button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Select
                      placeholder={t('inventory.allBrands')}
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
                      placeholder={t('inventory.stockStatus')}
                      allowClear
                      value={statusFilter as any}
                      onChange={setStatusFilter}
                      style={{ flex: 1 }}
                    >
                      <Option value="normal">{t('inventory.stockNormal')}</Option>
                      <Option value="low">{t('inventory.stockLow')}</Option>
                      <Option value="critical">{t('inventory.stockCritical')}</Option>
                    </Select>
                    <Button onClick={() => { setKeyword(''); setOriginFilter(undefined); setStrengthFilter(undefined); setStatusFilter(undefined); setSelectedRowKeys([]) }} style={{ color: '#000000' }}>
                      {t('common.resetFilters')}
                    </Button>
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
                                  const text = st === 'normal' ? t('inventory.stockNormal') : st === 'low' ? t('inventory.stockLow') : t('inventory.stockCritical')
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
                            <Button type="primary" style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }} onClick={() => {
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
                              {t('common.edit')}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {groupedByBrand.length === 0 && (
                    <div style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>{t('common.noData')}</div>
                  )}
                </div>
              )}
            </div>
          )}
          {activeTab === 'in' && (
            <Card>
              <Form form={inForm} layout="vertical" onFinish={async (values: { referenceNo?: string; reason?: string; items: { cigarId: string; quantity: number }[] }) => {
                const lines = (values.items || []).filter(it => it?.cigarId && it?.quantity > 0)
                if (lines.length === 0) { message.warning(t('inventory.pleaseAddAtLeastOneInStockDetail')); return }
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
                      reason: values.reason || t('inventory.inStock'),
                      referenceNo: values.referenceNo,
                      operatorId: 'system',
                      createdAt: new Date(),
                    } as any)
                  }
                  message.success(t('inventory.inStockSuccess'))
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
                            rules={[{ required: true, message: t('inventory.pleaseSelectProduct') }]}
                            style={{ minWidth: 320 }}
                          >
                            <Select placeholder={t('inventory.pleaseSelectProduct')}>
                              {items.map(i => (
                                <Option key={i.id} value={i.id}>{i.name} - RM{i.price}（{t('inventory.stock')}：{(i as any)?.inventory?.stock ?? 0}）</Option>
                              ))}
                            </Select>
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'quantity']}
                            rules={[{ required: true, message: t('inventory.pleaseInputQuantity') }]}
                          >
                            <InputNumber min={1} placeholder={t('inventory.quantity')} />
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
                <Form.Item label={t('inventory.referenceNo')} name="referenceNo">
                  <Input placeholder={t('inventory.pleaseInputReferenceNo')} />
                </Form.Item>
                <Form.Item label={t('inventory.reason')} name="reason">
                  <Input placeholder={t('inventory.forExample') + t('inventory.purchaseInStock')} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }}>{t('inventory.confirmInStock')}</Button>
                </Form.Item>
              </Form>
              <Table
                style={{ marginTop: 16 }}
                title={() => t('inventory.inStockRecord')}
                columns={logColumns}
                dataSource={inLogs}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          )}
          {activeTab === 'out' && (
            <div>
              <Card style={{ marginBottom: 16 }}>
                <Form form={outForm} layout="vertical" onFinish={async (values: { referenceNo?: string; reason?: string; items: { cigarId: string; quantity: number }[] }) => {
                  const lines = (values.items || []).filter(it => it?.cigarId && it?.quantity > 0)
                  if (lines.length === 0) { message.warning(t('inventory.pleaseAddAtLeastOneOutStockDetail')); return }
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
                        reason: values.reason || t('inventory.outStock'),
                        referenceNo: values.referenceNo,
                        operatorId: 'system',
                        createdAt: new Date(),
                      } as any)
                    }
                    message.success(t('inventory.outStockSuccess'))
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
                              rules={[{ required: true, message: t('inventory.pleaseSelectProduct') }]}
                              style={{ minWidth: 320 }}
                            >
                              <Select placeholder={t('inventory.pleaseSelectProduct')}>
                                {items.map(i => (
                                  <Option key={i.id} value={i.id}>{i.name} - RM{i.price}（{t('inventory.stock')}：{(i as any)?.inventory?.stock ?? 0}）</Option>
                                ))}
                              </Select>
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[name, 'quantity']}
                              rules={[{ required: true, message: t('inventory.pleaseInputQuantity') }]}
                            >
                              <InputNumber min={1} placeholder={t('inventory.quantity')} />
                            </Form.Item>
                            {fields.length > 1 && (
                              <MinusCircleOutlined onClick={() => remove(name)} />
                            )}
                          </Space>
                        ))}
                        <Form.Item>
                          <Button type="dashed" onClick={() => add({ quantity: 1 })} icon={<PlusOutlined />}>{t('inventory.addDetail')}</Button>
                        </Form.Item>
                      </div>
                    )}
                  </Form.List>
                  <Form.Item label={t('inventory.referenceNo')} name="referenceNo">
                    <Input placeholder={t('inventory.pleaseInputReferenceNo')} />
                  </Form.Item>
                  <Form.Item label={t('inventory.reason')} name="reason">
                    <Input placeholder={t('inventory.forExample') + t('inventory.salesOutStock')} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }}>{t('inventory.confirmOutStock')}</Button>
                  </Form.Item>
                </Form>
              </Card>
            <Card>
              <Table
                title={() => t('inventory.outStockRecordFromOrders')}
                columns={outOrderColumns}
                dataSource={outFromOrders}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </Card>
            </div>
          )}
        </div>
      </div>

      {/* 创建/编辑 弹窗 */}
      <Modal
        title={editing ? t('common.edit') : t('common.add')}
        open={creating || !!editing}
        onCancel={() => { setCreating(false); setEditing(null) }}
        width={isMobile ? '100%' : 600}
        footer={isMobile ? (
          <div style={{ padding: '8px 0' }}>
            <Button type="primary" block loading={loading} onClick={() => form.submit()} style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10', boxShadow: '0 4px 15px -5px rgba(244,175,37,0.5)' }}>{t('common.save')}</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Space>
              {editing && (
                <>
                  <Button danger onClick={() => {
                    Modal.confirm({
                      title: t('common.deleteProduct'),
                      content: `确定删除产品 ${(editing as any)?.name || ''} 吗？`,
                      okButtonProps: { danger: true },
                      onOk: async () => {
                        setLoading(true)
                        try {
                          const res = await deleteDocument(COLLECTIONS.CIGARS, (editing as any).id)
                          if (res.success) {
                            message.success(t('common.deleted'))
                            setItems(await getCigars())
                            setEditing(null)
                          }
                        } finally {
                          setLoading(false)
                        }
                      }
                    })
                  }}>{t('common.delete')}</Button>
                </>
              )}
            </Space>
            <Space>
              <Button onClick={() => { setCreating(false); setEditing(null) }}>{t('common.cancel')}</Button>
              <Button type="primary" loading={loading} onClick={() => form.submit()} style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }}>{t('common.confirm')}</Button>
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
                    {t('common.upload')}
                  </div>
                )}
              </Upload>
              <div style={{ fontSize: 12, color: 'rgba(244,175,37,0.8)' }}>{t('common.uploadProductImage')}</div>
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
              if (res.success) message.success(t('common.saved'))
            } else {
              await createDocument<Cigar>(COLLECTIONS.CIGARS, { ...payload, createdAt: new Date(), images: [], description: '', metadata: { rating: 0, reviews: 0, tags: [] } } as any)
              message.success(t('common.created'))
            }
            const list = await getCigars()
            setItems(list)
            setCreating(false)
            setEditing(null)
          } finally {
            setLoading(false)
          }
        }}>
          <Form.Item label={isMobile ? t('inventory.productName') : t('common.name')} name="name" rules={[{ required: true, message: t('common.pleaseInputName') }]}> 
            <Input />
          </Form.Item>
          <Form.Item label="SKU" name="sku">
            <Input />
          </Form.Item>
          <Form.Item label={t('inventory.brand')} name="brand" rules={[{ required: true, message: t('common.pleaseInputBrand') }]}>
            <Input />
          </Form.Item>
          <Form.Item label={t('inventory.origin')} name="origin" rules={[{ required: true, message: t('common.pleaseInputOrigin') }]}>
            <Input />
          </Form.Item>
          <Form.Item label={isMobile ? t('inventory.specification') : t('inventory.size')} name="size" rules={[{ required: true, message: t('common.pleaseInputSize') }]}> 
            <Input />
          </Form.Item>
          <Form.Item label={t('inventory.strength')} name="strength" rules={[{ required: true, message: t('common.pleaseSelectStrength') }]}>
            <Select>
              <Option value="mild">{t('inventory.mild')}</Option>
              <Option value="medium">{t('inventory.medium')}</Option>
              <Option value="full">{t('inventory.full')}</Option>
            </Select>
          </Form.Item>
          <Form.Item label={t('inventory.price')} name="price" rules={[{ required: true, message: t('common.pleaseInputPrice') }]}> 
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label={isMobile ? t('inventory.stock') : t('inventory.currentStock')} name="stock"> 
            <InputNumber min={0} style={{ width: '100%' }} disabled readOnly />
          </Form.Item>
          <Form.Item label={t('inventory.minStock')} name="minStock">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 入库/出库 弹窗 */}
      <Modal
        title={adjustingIn ? `${t('inventory.inStock')} - ${(adjustingIn as any)?.name}` : adjustingOut ? `${t('inventory.outStock')} - ${(adjustingOut as any)?.name}` : ''}
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
              reason: values.reason || (adjustingIn ? t('inventory.inStock') : t('inventory.outStock')),
              referenceNo: values.referenceNo,
              operatorId: 'system',
              createdAt: new Date(),
            } as any)
            message.success(t('inventory.stockUpdated'))
            setItems(await getCigars())
            setAdjustingIn(null)
            setAdjustingOut(null)
          } finally {
            setLoading(false)
          }
        }}>
          <Form.Item label={t('inventory.quantity')} name="quantity" rules={[{ required: true, message: t('common.pleaseInputQuantity') }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          {adjustingIn && (
            <Form.Item label={t('inventory.referenceNo')} name="referenceNo">
              <Input placeholder={t('inventory.pleaseInputReferenceNo')} />
            </Form.Item>
          )}
          <Form.Item label={t('inventory.reason')} name="reason">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* 删除确认 */}
      <Modal
        title={t('common.deleteProduct')}
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onOk={async () => {
          if (!deleting) return
          setLoading(true)
          try {
            const res = await deleteDocument(COLLECTIONS.CIGARS, (deleting as any).id)
            if (res.success) {
              message.success(t('common.deleted'))
              setItems(await getCigars())
            }
          } finally {
            setLoading(false)
            setDeleting(null)
          }
        }}
        okButtonProps={{ danger: true }}
      >
        {t('common.confirmDeleteProduct')} {(deleting as any)?.name}？{t('common.thisOperationCannotBeUndone')}
      </Modal>

      {/* 单号详情弹窗 */}
      <Modal
        title={`${t('inventory.referenceNo')} - ${viewingReference}`}
        open={!!viewingReference}
        onCancel={() => setViewingReference(null)}
        footer={null}
        width={800}
      >
        <Table
          columns={[
            { title: t('inventory.time'), dataIndex: 'createdAt', key: 'createdAt', render: (v: any) => v ? new Date(v).toLocaleString() : '-' },
            { title: t('inventory.product'), dataIndex: 'cigarId', key: 'cigarId', render: (id: string) => items.find(i => i.id === id)?.name || id },
            { title: t('inventory.quantity'), dataIndex: 'quantity', key: 'quantity' },
            { title: t('inventory.reason'), dataIndex: 'reason', key: 'reason', render: (v: any) => v || '-' },
            { title: t('inventory.operator'), dataIndex: 'operatorId', key: 'operatorId', render: (v: any) => v || '-' },
          ]}
          dataSource={currentReferenceLogs}
          rowKey="id"
          pagination={false}
          size="small"
        />
        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{t('inventory.referenceNo')}</div>
          <div>{t('inventory.totalProductTypes')}：{currentReferenceLogs.length} {t('inventory.types')}</div>
          <div>{t('inventory.totalInStockQuantity')}：{currentReferenceLogs.reduce((sum, log) => sum + (log.quantity || 0), 0)} {t('inventory.sticks')}</div>
        </div>
      </Modal>
    </div>
  )
}

export default AdminInventory
