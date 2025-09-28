// 库存管理页面
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Table, Button, Tag, Space, Typography, Input, Select, Progress, Modal, Form, InputNumber, message, Dropdown, Checkbox, Card, Upload } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, WarningOutlined, UploadOutlined, DownloadOutlined, MinusCircleOutlined, EyeOutlined } from '@ant-design/icons'
import type { Cigar, InventoryLog, Brand } from '../../../types'
import { getCigars, createDocument, updateDocument, deleteDocument, COLLECTIONS, getAllInventoryLogs, getAllOrders, getUsers, getBrands, getBrandById } from '../../../services/firebase/firestore'
import ImageUpload from '../../../components/common/ImageUpload'

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
  
  // 品牌管理相关状态
  const [brandList, setBrandList] = useState<Brand[]>([])
  const [creatingBrand, setCreatingBrand] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null)
  const [brandForm] = Form.useForm()

  const [keyword, setKeyword] = useState('')
  const [brandFilter, setBrandFilter] = useState<string | undefined>()
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
        const [os, us, bs] = await Promise.all([getAllOrders(), getUsers(), getBrands()])
        setOrders(os)
        setUsers(us)
        setBrandList(bs)
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
      const passBrand = !brandFilter || i.brand === brandFilter
      const passOrigin = !originFilter || i.origin === originFilter
      const status = ((i as any)?.inventory?.stock ?? 0) <= ((i as any)?.inventory?.minStock ?? 0) ? 'critical' : ((i as any)?.inventory?.stock ?? 0) <= (((i as any)?.inventory?.minStock ?? 0) * 1.5) ? 'low' : 'normal'
      const passStatus = !statusFilter || status === statusFilter
      const passStrength = !strengthFilter || i.strength === strengthFilter
      return passKw && passBrand && passOrigin && passStatus && passStrength
    })
  }, [items, keyword, brandFilter, originFilter, strengthFilter, statusFilter])

  const columnsAll = [
    {
      title: t('inventory.cigarName'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => {
        // 根据品牌名称找到对应的品牌信息
        const brandInfo = brandList.find(brand => brand.name === record.brand)
        return (
          <div>
            <div style={{ fontWeight: 'bold' }}>{name}</div>
            <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
              {brandInfo?.logo && (
                <img 
                  src={brandInfo.logo} 
                  alt={record.brand} 
                  style={{ width: 16, height: 16, borderRadius: 2 }}
                />
              )}
              <span>{record.brand}</span>
              {brandInfo?.country && (
                <span style={{ color: '#999' }}>- {brandInfo.country}</span>
              )}
              <span>- {record.origin}</span>
            </div>
          </div>
        )
      },
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
    <div style={{ minHeight: '10vh'}}>
      
           <h1 style={{ fontSize: 22, fontWeight: 800, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent', paddingInline: 0, marginBottom: 12 }}>{t('navigation.inventory')}</h1>
 
      {/* 自定义标签页 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(244,175,37,0.2)' }}>
          {(['list', 'brand', 'in', 'out'] as const).map((tabKey) => {
            const isActive = activeTab === tabKey
            const baseStyle: React.CSSProperties = {
              flex: 1,
              padding: '10px 0',
              fontWeight: 800,
              fontSize: 12,
              outline: 'none',
              borderBottom: isActive ? '2px solid #f4af25' : '2px solid transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              background: 'none',
            }
            const activeStyle: React.CSSProperties = {
              color: 'transparent',
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
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
                {tabKey === 'list' ? t('inventory.product') : tabKey === 'brand' ? t('inventory.brandManagement') : tabKey === 'in' ? t('inventory.stockIn') : t('inventory.stockOut')}
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
                   <Select placeholder={t('inventory.brand')} style={{ width: 140 }} allowClear value={brandFilter} onChange={setBrandFilter}>
                    {brandList
                      .filter(brand => brand.status === 'active')
                      .map(brand => (
                        <Option key={brand.id} value={brand.name}>
                          <Space>
                            {brand.logo && (
                              <img 
                                src={brand.logo} 
                                alt={brand.name} 
                                style={{ width: 16, height: 16, borderRadius: 2 }}
                              />
                            )}
                            <span>{brand.name}</span>
                          </Space>
                        </Option>
                      ))}
                  </Select>
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
           <Button onClick={() => { setKeyword(''); setBrandFilter(undefined); setOriginFilter(undefined); setStrengthFilter(undefined); setStatusFilter(undefined); setSelectedRowKeys([]) }} style={{ color: '#000000' }}>{t('common.resetFilters')}</Button>
           <button onClick={() => { setCreating(true); form.resetFields() }} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, padding: '8px 16px', background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 700, cursor: 'pointer' }}>
             <PlusOutlined />
             {t('inventory.addProduct')}
           </button>
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
                    <button onClick={() => { setCreating(true); form.resetFields() }} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, padding: '8px 16px', background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 700, cursor: 'pointer' }}>
                      <PlusOutlined />
                      {t('inventory.addProduct')}
                    </button>
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
                            <button style={{ padding: '4px 8px', borderRadius: 6, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => {
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
                            </button>
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
          {activeTab === 'brand' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => setCreatingBrand(true)}
                  >
                    {t('inventory.addBrand')}
                  </Button>
                  <Button 
                    type="default" 
                    onClick={() => window.open('/admin/cloudinary-test', '_blank')}
                    style={{ color: '#1890ff' }}
                  >
                    Cloudinary 测试
                  </Button>
                </Space>
              </div>
              
              <Card>
                {brandList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏷️</div>
                    <div style={{ fontSize: '16px', marginBottom: '8px' }}>{t('inventory.brandManagement')}</div>
                    <div style={{ fontSize: '14px' }}>{t('inventory.noBrandsFound')}</div>
                  </div>
                ) : (
                  <Table
                    dataSource={brandList}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: t('inventory.brandName'),
                        dataIndex: 'name',
                        key: 'name',
                        render: (text: string, record: Brand) => (
                          <Space>
                            {record.logo && (
                              <img 
                                src={record.logo} 
                                alt={text} 
                                style={{ width: 32, height: 32, borderRadius: 4 }}
                              />
                            )}
                            <span style={{ fontWeight: 600 }}>{text}</span>
                          </Space>
                        ),
                      },
                      {
                        title: t('inventory.brandCountry'),
                        dataIndex: 'country',
                        key: 'country',
                      },
                      {
                        title: t('inventory.foundedYear'),
                        dataIndex: 'foundedYear',
                        key: 'foundedYear',
                        render: (year: number) => year || '-',
                      },
                      {
                        title: t('inventory.brandStatus'),
                        dataIndex: 'status',
                        key: 'status',
                        render: (status: string) => (
                          <Tag color={status === 'active' ? 'green' : 'red'}>
                            {status === 'active' ? t('inventory.active') : t('inventory.inactive')}
                          </Tag>
                        ),
                      },
                      {
                        title: t('inventory.totalProducts'),
                        dataIndex: ['metadata', 'totalProducts'],
                        key: 'totalProducts',
                        render: (count: number) => count || 0,
                      },
                      {
                        title: t('common.action'),
                        key: 'action',
                        render: (_, record: Brand) => (
                          <Space>
                            <Button 
                              size="small" 
                              icon={<EditOutlined />}
                              onClick={() => setEditingBrand(record)}
                            >
                              {t('common.edit')}
                            </Button>
                            <Button 
                              size="small" 
                              danger 
                              icon={<DeleteOutlined />}
                              onClick={() => setDeletingBrand(record)}
                            >
                              {t('common.delete')}
                            </Button>
                          </Space>
                        ),
                      },
                    ]}
                  />
                )}
              </Card>
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
                  <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease', opacity: loading ? 0.6 : 1 }}>{t('inventory.confirmInStock')}</button>
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
                    <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease', opacity: loading ? 0.6 : 1 }}>{t('inventory.confirmOutStock')}</button>
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
            <button disabled={loading} onClick={() => form.submit()} style={{ width: '100%', padding: '12px', borderRadius: 8, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease', opacity: loading ? 0.6 : 1, boxShadow: '0 4px 15px -5px rgba(244,175,37,0.5)' }}>{t('common.save')}</button>
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
              <button disabled={loading} onClick={() => form.submit()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease', opacity: loading ? 0.6 : 1 }}>{t('common.confirm')}</button>
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
          
          {/* 桌面端图片上传 */}
          {!isMobile && (
            <div style={{ marginBottom: 16 }}>
              <Form.Item label={t('common.productImage')} name="images">
                <ImageUpload
                  folder="products"
                  showPreview={true}
                />
              </Form.Item>
            </div>
          )}
        </div>
        <Form form={form} layout="horizontal" labelCol={{ flex: '100px' }} wrapperCol={{ flex: 'auto' }} onFinish={async (values: any) => {
          setLoading(true)
          try {
            // 根据品牌名称找到对应的品牌ID
            const selectedBrand = brandList.find(brand => brand.name === values.brand)
            
            const payload: Partial<Cigar> = {
              name: values.name,
              brand: values.brand,
              brandId: selectedBrand?.id, // 添加品牌ID关联
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
            <Select
              placeholder={t('inventory.pleaseSelectBrand')}
              showSearch
              filterOption={(input, option) => {
                const children = option?.children as any
                if (typeof children === 'string') {
                  return children.toLowerCase().includes(input.toLowerCase())
                }
                if (Array.isArray(children)) {
                  return children.some((child: any) => 
                    typeof child === 'string' && child.toLowerCase().includes(input.toLowerCase())
                  )
                }
                return false
              }}
            >
              {brandList
                .filter(brand => brand.status === 'active')
                .map(brand => (
                  <Option key={brand.id} value={brand.name}>
                    <Space>
                      {brand.logo && (
                        <img 
                          src={brand.logo} 
                          alt={brand.name} 
                          style={{ width: 20, height: 20, borderRadius: 2 }}
                        />
                      )}
                      <span>{brand.name}</span>
                      <span style={{ color: '#999', fontSize: '12px' }}>({brand.country})</span>
                    </Space>
                  </Option>
                ))}
            </Select>
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

      {/* 品牌管理 - 添加/编辑品牌 */}
      <Modal
        title={editingBrand ? t('inventory.editBrand') : t('inventory.addBrand')}
        open={creatingBrand || !!editingBrand}
        onCancel={() => {
          setCreatingBrand(false)
          setEditingBrand(null)
          brandForm.resetFields()
        }}
        onOk={() => brandForm.submit()}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={brandForm}
          layout="vertical"
          onFinish={async (values) => {
            setLoading(true)
            try {
              const brandData = {
                name: values.name,
                description: values.description || '',
                logo: values.logo || '',
                website: values.website || '',
                country: values.country,
                foundedYear: values.foundedYear ? parseInt(values.foundedYear) : undefined,
                status: values.status || 'active',
                metadata: {
                  totalProducts: 0,
                  totalSales: 0,
                  rating: 0,
                  tags: [],
                },
              }

              if (editingBrand) {
                const result = await updateDocument(COLLECTIONS.BRANDS, editingBrand.id, brandData)
                if (result.success) {
                  message.success(t('inventory.brandUpdated'))
                  setBrandList(await getBrands())
                  setEditingBrand(null)
                  brandForm.resetFields()
                } else {
                  message.error(t('inventory.brandUpdateFailed'))
                }
              } else {
                const result = await createDocument(COLLECTIONS.BRANDS, brandData)
                if (result.success) {
                  message.success(t('inventory.brandCreated'))
                  setBrandList(await getBrands())
                  setCreatingBrand(false)
                  brandForm.resetFields()
                } else {
                  message.error(t('inventory.brandCreateFailed'))
                }
              }
            } finally {
              setLoading(false)
            }
          }}
          initialValues={editingBrand ? {
            name: editingBrand.name,
            description: editingBrand.description,
            logo: editingBrand.logo,
            website: editingBrand.website,
            country: editingBrand.country,
            foundedYear: editingBrand.foundedYear,
            status: editingBrand.status,
          } : {
            status: 'active'
          }}
        >
          <Form.Item
            label={t('inventory.brandName')}
            name="name"
            rules={[{ required: true, message: t('inventory.brandNameRequired') }]}
          >
            <Input placeholder={t('inventory.pleaseInputBrandName')} />
          </Form.Item>
          
          <Form.Item
            label={t('inventory.brandDescription')}
            name="description"
          >
            <Input.TextArea 
              rows={3} 
              placeholder={t('inventory.pleaseInputBrandDescription')} 
            />
          </Form.Item>
          
          <Form.Item
            label={t('inventory.brandLogo')}
            name="logo"
          >
            <ImageUpload
              folder="brands"
              maxSize={2 * 1024 * 1024} // 2MB
              width={120}
              height={120}
              showPreview={true}
            />
          </Form.Item>
          
          <Form.Item
            label={t('inventory.brandWebsite')}
            name="website"
            rules={[
              {
                pattern: /^https?:\/\/.+/,
                message: t('inventory.brandWebsiteInvalid')
              }
            ]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>
          
          <Form.Item
            label={t('inventory.brandCountry')}
            name="country"
            rules={[{ required: true, message: t('inventory.brandCountryRequired') }]}
          >
            <Input placeholder={t('inventory.pleaseInputBrandCountry')} />
          </Form.Item>
          
          <Form.Item
            label={t('inventory.foundedYear')}
            name="foundedYear"
            rules={[
              {
                pattern: /^\d{4}$/,
                message: t('inventory.foundedYearInvalid')
              }
            ]}
          >
            <Input placeholder="1990" />
          </Form.Item>
          
          <Form.Item
            label={t('inventory.brandStatus')}
            name="status"
          >
            <Select>
              <Option value="active">{t('inventory.active')}</Option>
              <Option value="inactive">{t('inventory.inactive')}</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 品牌管理 - 删除确认 */}
      <Modal
        title={t('inventory.confirmDeleteBrand')}
        open={!!deletingBrand}
        onCancel={() => setDeletingBrand(null)}
        onOk={async () => {
          if (!deletingBrand) return
          setLoading(true)
          try {
            const result = await deleteDocument(COLLECTIONS.BRANDS, deletingBrand.id)
            if (result.success) {
              message.success(t('inventory.brandDeleted'))
              setBrandList(await getBrands())
            } else {
              message.error(t('inventory.brandDeleteFailed'))
            }
          } finally {
            setLoading(false)
            setDeletingBrand(null)
          }
        }}
        okButtonProps={{ danger: true }}
      >
        {t('inventory.deleteBrandContent', { name: deletingBrand?.name })}
      </Modal>
    </div>
  )
}

export default AdminInventory
