// 库存管理页面
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Table, Button, Tag, Space, Typography, Input, Select, Progress, Modal, Form, InputNumber, message, Dropdown, Checkbox, Card, Upload } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, WarningOutlined, UploadOutlined, DownloadOutlined, MinusCircleOutlined } from '@ant-design/icons'
import type { Cigar, InventoryLog, Brand } from '../../../types'
import { getCigars, createDocument, updateDocument, deleteDocument, COLLECTIONS, getAllInventoryLogs, getAllOrders, getUsers, getBrands, getBrandById } from '../../../services/firebase/firestore'
import ImageUpload from '../../../components/common/ImageUpload'
import { getModalTheme, getResponsiveModalConfig, getModalThemeStyles } from '../../../config/modalTheme'

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
  const [viewingProductLogs, setViewingProductLogs] = useState<string | null>(null)
  const [imageList, setImageList] = useState<any[]>([])
  const [pagination, setPagination] = useState<{ current: number; pageSize: number }>({ current: 1, pageSize: 10 })
  const [inModalOpen, setInModalOpen] = useState(false)
  const [inStatsOpen, setInStatsOpen] = useState(false)
  const [outStatsOpen, setOutStatsOpen] = useState(false)
  const [outModalOpen, setOutModalOpen] = useState(false)
  const [outStatsExpandedKeys, setOutStatsExpandedKeys] = useState<React.Key[]>([])
  const [inStatsExpandedKeys, setInStatsExpandedKeys] = useState<React.Key[]>([])
  const [inLogsExpandedKeys, setInLogsExpandedKeys] = useState<React.Key[]>([])
  const [inSearchKeyword, setInSearchKeyword] = useState('')
  const [inBrandFilter, setInBrandFilter] = useState<string | undefined>()
  const [outSearchKeyword, setOutSearchKeyword] = useState('')
  const [outBrandFilter, setOutBrandFilter] = useState<string | undefined>()
  const toDateSafe = (val: any): Date | null => {
    if (!val) return null
    let v: any = val
    if (v && typeof v.toDate === 'function') {
      v = v.toDate()
    }
    const d = v instanceof Date ? v : new Date(v)
    return isNaN(d.getTime()) ? null : d
  }

  const formatYMD = (d: Date | null): string => {
    if (!d) return '-'
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  // 记录表分页大小（持久化）
  const [inPageSize, setInPageSize] = useState<number>(() => {
    try { return Number(localStorage.getItem('inventory_in_page_size') || 10) || 10 } catch { return 10 }
  })
  const [outPageSize, setOutPageSize] = useState<number>(() => {
    try { return Number(localStorage.getItem('inventory_out_page_size') || 10) || 10 } catch { return 10 }
  })
  
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
        // 初始化分页（本地持久化）
        try {
          const raw = localStorage.getItem('inventory_pagination')
          if (raw) {
            const saved = JSON.parse(raw)
            if (saved?.current && saved?.pageSize) {
              setPagination({ current: Number(saved.current) || 1, pageSize: Number(saved.pageSize) || 10 })
            }
          }
        } catch {}
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
      case 'negative': return 'red'
      case 'normal': return 'green'
      case 'low': return 'orange'
      case 'critical': return 'red'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'negative': return t('inventory.stockNegative')
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

  // 商品是否存在入/出库记录（存在则禁止删除）
  const hasInventoryHistory = (cigarId: string | undefined) => {
    if (!cigarId) return false
    return inventoryLogs.some((log: any) => log?.cigarId === cigarId)
  }

  // 基于入库/出库日志的实时库存计算
  const stockByCigarId = useMemo(() => {
    // 精确计算：sum(IN) - sum(OUT)，不在逐步相减时夹0，避免顺序依赖
    const map = new Map<string, number>()
    for (const log of inventoryLogs) {
      const id = (log as any)?.cigarId
      if (!id) continue
      const type = (log as any)?.type
      const qtyRaw = (log as any)?.quantity ?? 0
      const qty = Number.isFinite(qtyRaw) ? Math.max(0, Math.floor(qtyRaw)) : 0
      const prev = map.get(id) ?? 0
      if (type === 'in') {
        map.set(id, prev + qty)
      } else if (type === 'out') {
        map.set(id, prev - qty)
      }
    }
    return map
  }, [inventoryLogs])

  const getComputedStock = (cigarId?: string) => {
    if (!cigarId) return 0
    const net = stockByCigarId.get(cigarId) ?? 0
    // 允许显示负库存，以便管理员发现库存异常
    return net
  }

  // 每个商品的总入库/总出库数量
  const totalsByCigarId = useMemo(() => {
    const map = new Map<string, { totalIn: number; totalOut: number }>()
    for (const log of inventoryLogs) {
      const id = (log as any)?.cigarId
      if (!id) continue
      const type = (log as any)?.type
      const qtyRaw = (log as any)?.quantity ?? 0
      const qty = Number.isFinite(qtyRaw) ? Math.max(0, Math.floor(qtyRaw)) : 0
      const prev = map.get(id) || { totalIn: 0, totalOut: 0 }
      if (type === 'in') prev.totalIn += qty
      else if (type === 'out') prev.totalOut += qty
      map.set(id, prev)
    }
    return map
  }, [inventoryLogs])

  const getTotals = (cigarId?: string) => {
    if (!cigarId) return { totalIn: 0, totalOut: 0 }
    return totalsByCigarId.get(cigarId) || { totalIn: 0, totalOut: 0 }
  }

  const filtered = useMemo(() => {
    return items.filter(i => {
      const kw = keyword.trim().toLowerCase()
      const passKw = !kw || i.name?.toLowerCase().includes(kw) || i.brand?.toLowerCase().includes(kw)
      const passBrand = !brandFilter || i.brand === brandFilter
      const passOrigin = !originFilter || i.origin === originFilter
      const computedStock = getComputedStock(i.id)
      const minStock = ((i as any)?.inventory?.minStock ?? 0)
      const status = (computedStock <= minStock) ? 'critical' : (computedStock <= (minStock * 1.5)) ? 'low' : 'normal'
      const passStatus = !statusFilter || status === statusFilter
      const passStrength = !strengthFilter || i.strength === strengthFilter
      return passKw && passBrand && passOrigin && passStatus && passStrength
    })
  }, [items, keyword, brandFilter, originFilter, strengthFilter, statusFilter, stockByCigarId])

  // 过滤条件变化时重置到第1页
  useEffect(() => {
    setPagination(p => ({ ...p, current: 1 }))
  }, [keyword, brandFilter, originFilter, strengthFilter, statusFilter])

  const columnsAll = [
    {
      title: t('inventory.cigarName'),
      dataIndex: 'name',
      key: 'name',
      width: 260,
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
      width: 50,
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
      width: 50,
      render: (price: number) => `RM${price}`,
      sorter: (a: any, b: any) => a.price - b.price,
    },
    {
      title: t('inventory.stockStatus'),
      key: 'stockStatus',
      width: 150,
      render: (_: any, record: any) => {
        const currentStock = getComputedStock((record as any)?.id)
        const isNegative = currentStock < 0
        
        return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ 
              color: isNegative ? '#ff4d4f' : 'inherit',
              fontWeight: isNegative ? 'bold' : 'normal'
            }}>
              {isNegative && <WarningOutlined style={{ marginRight: 4 }} />}
              {t('inventory.currentStock')}: {currentStock}
            </span>
            <span>{t('inventory.reserved')}: {(record as any)?.inventory?.reserved ?? 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: '#666' }}>
            {(() => { const { totalIn, totalOut } = getTotals((record as any)?.id); return (
              <>
                <span>{t('inventory.totalIn')}: {totalIn}</span>
                <span>{t('inventory.totalOut')}: {totalOut}</span>
              </>
            ) })()}
          </div>
          <Progress
            percent={getStockProgress(currentStock, (record as any)?.inventory?.minStock ?? 0)}
            status={getProgressStatus(currentStock, (record as any)?.inventory?.minStock ?? 0)}
            size="small"
            format={() => `${currentStock}/${(((record as any)?.inventory?.minStock ?? 0) * 2)}`}
          />
          <Tag color={getStatusColor(
            currentStock < 0 ? 'negative' : 
            currentStock <= ((record as any)?.inventory?.minStock ?? 0) ? 'critical' : 
            currentStock <= (((record as any)?.inventory?.minStock ?? 0) * 1.5) ? 'low' : 
            'normal'
          )} style={{ marginTop: 4 }}>
            {getStatusText(
              currentStock < 0 ? 'negative' : 
              currentStock <= ((record as any)?.inventory?.minStock ?? 0) ? 'critical' : 
              currentStock <= (((record as any)?.inventory?.minStock ?? 0) * 1.5) ? 'low' : 
              'normal'
            )}
          </Tag>
        </div>
        )
      },
    },
    {
      title: t('inventory.actions'),
      key: 'action',
      width: 100,
      render: (_: any, record: any) => (
        <Space size="small" style={{ justifyContent: 'center', width: '100%' }}>
          <Button type="link" icon={<EditOutlined />} size="small" onClick={() => {
            setEditing(record)
            form.setFieldsValue({
              name: record.name,
              brand: record.brand,
              origin: record.origin,
              size: record.size,
              strength: record.strength,
              price: record.price,
              stock: getComputedStock((record as any)?.id) ?? 0,
              minStock: (record as any)?.inventory?.minStock ?? 0,
              reserved: (record as any)?.inventory?.reserved ?? 0,
            })
          }}>
          </Button>
          <Button type="link" icon={<SearchOutlined />} size="small" onClick={() => {
            setViewingProductLogs((record as any)?.id)
          }}>
          </Button>
        </Space>
      ),
    },
  ]
  const columns = columnsAll.filter(c => visibleCols[c.key as string] !== false)

  const logColumns = [
    { title: t('inventory.time'), dataIndex: 'createdAt', key: 'createdAt', render: (v: any) => formatYMD(toDateSafe(v)) },
    { 
      title: t('inventory.product'), 
      dataIndex: 'cigarId', 
      key: 'cigarId', 
      render: (id: string, record: any) => {
        // 优先使用保存的雪茄名称，避免雪茄被删除后无法显示
        return record.cigarName || items.find(i => i.id === id)?.name || id
      }
    },
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
  
  // 入库记录筛选
  const filteredInLogs = useMemo(() => {
    return inLogs.filter(log => {
      // 品牌筛选
      if (inBrandFilter) {
        const cigar = items.find(c => c.id === log.cigarId)
        if (cigar?.brand !== inBrandFilter) return false
      }
      
      // 关键字搜索
      if (inSearchKeyword) {
        const kw = inSearchKeyword.toLowerCase()
        const cigar = items.find(c => c.id === log.cigarId)
        const cigarName = cigar?.name?.toLowerCase() || ''
        const reason = ((log as any).reason || '').toLowerCase()
        const refNo = ((log as any).referenceNo || '').toLowerCase()
        
        if (!cigarName.includes(kw) && !reason.includes(kw) && !refNo.includes(kw)) {
          return false
        }
      }
      
      return true
    })
  }, [inLogs, inSearchKeyword, inBrandFilter, items])
  
  // 入库记录按单号分组
  const inLogsGroupedByReference = useMemo(() => {
    const grouped = new Map<string, {
      referenceNo: string;
      date: Date | null;
      reason: string;
      logs: any[];
      totalQuantity: number;
      totalValue: number;
      productCount: number;
    }>();
    
    filteredInLogs.forEach(log => {
      const key = log.referenceNo || '__NO_REFERENCE__';
      if (!grouped.has(key)) {
        grouped.set(key, {
          referenceNo: log.referenceNo || t('inventory.unassignedReference'),
          date: toDateSafe(log.createdAt),
          reason: (log as any).reason || '-',
          logs: [],
          totalQuantity: 0,
          totalValue: 0,
          productCount: 0
        });
      }
      const group = grouped.get(key)!;
      group.logs.push(log);
      group.totalQuantity += Number(log.quantity || 0);
      group.totalValue += Number(log.quantity || 0) * Number((log as any).unitPrice || 0);
      group.productCount = group.logs.length;
    });
    
    return Array.from(grouped.values())
      .sort((a, b) => {
        const dateA = a.date?.getTime() || 0;
        const dateB = b.date?.getTime() || 0;
        return dateB - dateA; // 最新的在上面
      });
  }, [filteredInLogs, items, t])
  
  // 出库记录筛选
  const filteredOutLogs = useMemo(() => {
    return outLogs.filter(log => {
      // 品牌筛选
      if (outBrandFilter) {
        const cigar = items.find(c => c.id === log.cigarId)
        if (cigar?.brand !== outBrandFilter) return false
      }
      
      // 关键字搜索
      if (outSearchKeyword) {
        const kw = outSearchKeyword.toLowerCase()
        const cigar = items.find(c => c.id === log.cigarId)
        const cigarName = cigar?.name?.toLowerCase() || ''
        const reason = ((log as any).reason || '').toLowerCase()
        const refNo = ((log as any).referenceNo || '').toLowerCase()
        
        if (!cigarName.includes(kw) && !reason.includes(kw) && !refNo.includes(kw)) {
          return false
        }
      }
      
      return true
    })
  }, [outLogs, outSearchKeyword, outBrandFilter, items])
  
  // 入库统计（包含品牌和产品详情）
  const inStats = useMemo(() => {
    const brandMap = new Map<string, { 
      quantity: number; 
      records: number; 
      totalValue: number;
      products: Map<string, { cigar: any; quantity: number; records: number; totalValue: number }>
    }>()
    
    inLogs.forEach(log => {
      const cigar = items.find(c => c.id === log.cigarId)
      const brand = cigar?.brand || 'Unknown'
      const quantity = Number(log.quantity || 0)
      const unitPrice = Number((log as any).unitPrice || 0)
      const value = quantity * unitPrice
      
      if (!brandMap.has(brand)) {
        brandMap.set(brand, { 
          quantity: 0, 
          records: 0, 
          totalValue: 0,
          products: new Map()
        })
      }
      
      const brandData = brandMap.get(brand)!
      brandData.quantity += quantity
      brandData.records += 1
      brandData.totalValue += value
      
      // 产品级别统计
      if (cigar) {
        const productKey = log.cigarId
        if (!brandData.products.has(productKey)) {
          brandData.products.set(productKey, {
            cigar,
            quantity: 0,
            records: 0,
            totalValue: 0
          })
        }
        const productData = brandData.products.get(productKey)!
        productData.quantity += quantity
        productData.records += 1
        productData.totalValue += value
      }
    })
    
    return Array.from(brandMap.entries())
      .map(([brand, data]) => ({ 
        brand, 
        quantity: data.quantity,
        records: data.records,
        totalValue: data.totalValue,
        products: Array.from(data.products.values()).sort((a, b) => b.quantity - a.quantity)
      }))
      .sort((a, b) => b.quantity - a.quantity)
  }, [inLogs, items])

  // 出库统计
  const outStats = useMemo(() => {
    const brandMap = new Map<string, {
      quantity: number;
      records: number;
      products: Map<string, { cigar: any; quantity: number; records: number }>
    }>()

    outLogs.forEach(log => {
      const cigar = items.find(c => c.id === log.cigarId)
      const brand = cigar?.brand || 'Unknown'
      const quantity = Number(log.quantity || 0)

      if (!brandMap.has(brand)) {
        brandMap.set(brand, { quantity: 0, records: 0, products: new Map() })
      }
      const brandData = brandMap.get(brand)!
      brandData.quantity += quantity
      brandData.records += 1

      if (cigar) {
        const productKey = log.cigarId
        if (!brandData.products.has(productKey)) {
          brandData.products.set(productKey, { cigar, quantity: 0, records: 0 })
        }
        const productData = brandData.products.get(productKey)!
        productData.quantity += quantity
        productData.records += 1
      }
    })

    return Array.from(brandMap.entries())
      .map(([brand, data]) => ({
        brand,
        quantity: data.quantity,
        records: data.records,
        products: Array.from(data.products.values()).sort((a, b) => b.quantity - a.quantity)
      }))
      .sort((a, b) => b.quantity - a.quantity)
  }, [outLogs, items])
  
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

  // 当前查看的产品相关记录
  const currentProductLogs = useMemo(() => {
    if (!viewingProductLogs) return []
    return inventoryLogs.filter(log => log.cigarId === viewingProductLogs)
  }, [viewingProductLogs, inventoryLogs])

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
          user: user ? `${user.displayName} ${(user as any)?.profile?.phone || user.email}` : o.userId,
          cigarName: cigar ? cigar.name : it.cigarId,
          quantity: it.quantity,
          source,
        })
      }
    }
    // 按时间倒序
    return rows.sort((a, b) => {
      const da = toDateSafe(a.createdAt)?.getTime() || 0
      const db = toDateSafe(b.createdAt)?.getTime() || 0
      return db - da
    })
  }, [orders, users, items])

  const outOrderColumns = [
    { title: t('inventory.time'), dataIndex: 'createdAt', key: 'createdAt', render: (v: any) => formatYMD(toDateSafe(v)) },
    { title: t('inventory.orderId'), dataIndex: 'orderId', key: 'orderId' },
    { title: t('inventory.user'), dataIndex: 'user', key: 'user' },
    { title: t('inventory.product'), dataIndex: 'cigarName', key: 'cigarName' },
    { title: t('inventory.quantity'), dataIndex: 'quantity', key: 'quantity' },
    { title: t('inventory.source'), dataIndex: 'source', key: 'source', render: (s: string) => s === 'event' ? t('inventory.event') : t('inventory.directSale') },
  ]

  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false

  // 统一的出库列表：订单出库 + 手动出库
  const unifiedOutRows = useMemo(() => {
    const userMap = new Map(users.map((u: any) => [u.id, u]))
    const cigarMap = new Map(items.map((c: any) => [c.id, c]))
    const rows: any[] = []
    // 来自订单的出库
    for (const o of orders) {
      const createdAt = (o as any).createdAt
      const user = userMap.get(o.userId)
      const source = (o as any).source?.type || 'direct'
      for (const it of (o.items || [])) {
        const cigar = cigarMap.get(it.cigarId)
        
        // 应用品牌筛选
        if (outBrandFilter && cigar?.brand !== outBrandFilter) continue
        
        // 应用搜索筛选
        if (outSearchKeyword) {
          const kw = outSearchKeyword.toLowerCase()
          const cigarName = cigar?.name?.toLowerCase() || ''
          const userName = user ? `${user.displayName} ${(user as any)?.profile?.phone || user.email}`.toLowerCase() : o.userId.toLowerCase()
          const orderId = o.id.toLowerCase()
          
          if (!cigarName.includes(kw) && !userName.includes(kw) && !orderId.includes(kw)) {
            continue
          }
        }
        
        rows.push({
          id: `order_${o.id}_${it.cigarId}`,
          createdAt,
          orderId: o.id,
          referenceNo: undefined,
          user: user ? `${user.displayName} ${(user as any)?.profile?.phone || user.email}` : o.userId,
          cigarName: cigar ? cigar.name : it.cigarId,
          quantity: it.quantity,
          source,
        })
      }
    }
    // 来自手动出库日志的出库
    for (const log of filteredOutLogs) {
      const ref = String((log as any).referenceNo || '')
      // 避免重复：订单出库已由 orders 渲染一遍，过滤掉 referenceNo 匹配订单ID的日志
      if (orders.some(o => o.id === ref)) continue
      const cigar = cigarMap.get((log as any).cigarId)
      rows.push({
        id: `manual_${(log as any).id || ((log as any).referenceNo || '')}_${(log as any).cigarId}`,
        createdAt: (log as any).createdAt,
        orderId: '-',
        referenceNo: (log as any).referenceNo,
        user: (log as any).operatorId || '-',
        cigarName: cigar ? cigar.name : (log as any).cigarId,
        quantity: (log as any).quantity,
        source: 'manual',
      })
    }
    // 按时间倒序
    return rows.sort((a, b) => {
      const da = toDateSafe(a.createdAt)?.getTime() || 0
      const db = toDateSafe(b.createdAt)?.getTime() || 0
      return db - da
    })
  }, [orders, users, items, filteredOutLogs, outSearchKeyword, outBrandFilter])

  const unifiedOutColumns = [
    { title: t('inventory.time'), dataIndex: 'createdAt', key: 'createdAt', width: 160, render: (v: any) => formatYMD(toDateSafe(v)) },
    { title: t('inventory.orderId'), dataIndex: 'orderId', key: 'orderId', width: 140 },
    { title: t('inventory.referenceNo'), dataIndex: 'referenceNo', key: 'referenceNo', width: 120, render: (v: any) => v || '-' },
    { title: t('inventory.user'), dataIndex: 'user', key: 'user', width: 220 },
    { title: t('inventory.product'), dataIndex: 'cigarName', key: 'cigarName', width: 220 },
    { title: t('inventory.quantity'), dataIndex: 'quantity', key: 'quantity', width: 100 },
    { title: t('inventory.source'), dataIndex: 'source', key: 'source', width: 120, render: (s: string) => s === 'event' ? t('inventory.event') : s === 'direct' ? t('inventory.directSale') : t('inventory.manual') },
  ]

  // 产品下拉：按品牌分组，并按品牌与产品名称字母排序（用于入库/出库下拉）
  const groupedCigars = useMemo(() => {
    const brandToList = new Map<string, Cigar[]>()
    items.forEach((c) => {
      const brand = (c as any)?.brand || 'Unknown'
      const list = brandToList.get(brand) || []
      list.push(c)
      brandToList.set(brand, list)
    })
    const sorted = Array.from(brandToList.entries())
      .sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()))
      .map(([brand, list]) => ({
        brand,
        list: list.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())),
      }))
    return sorted
  }, [items])

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
                      <Button danger onClick={async () => {
                        
                        const confirmed = window.confirm(`确定要删除选中的 ${selectedRowKeys.length} 个产品吗？`)
                        
                        if (confirmed) {
                            setLoading(true)
                            try {
                            
                            const ids = selectedRowKeys.map(id => String(id))
                            
                            const blocked = ids.filter(id => hasInventoryHistory(id))
                            const allowed = ids.filter(id => !hasInventoryHistory(id))
                            
                            
                            if (blocked.length > 0) {
                              message.warning(t('inventory.deleteBlockedDueToLogs'))
                            }
                            
                            if (allowed.length === 0) {
                              return
                            }
                            
                            await Promise.all(allowed.map(id => deleteDocument(COLLECTIONS.CIGARS, id)))
                            
                              message.success(t('inventory.batchDeleted'))
                            
                              const list = await getCigars()
                              setItems(list)
                              setSelectedRowKeys([])
                          } catch (error) {
                            message.error(t('inventory.batchDeleteFailed') + ': ' + (error as Error).message)
                            } finally {
                              setLoading(false)
                            }
                        } else {
                          }
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {groupedByBrand.map(group => (
                    <div key={group.key} style={{ border: '1px solid rgba(244,175,37,0.2)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                      <div style={{ padding: '8px 12px', background: 'rgba(244,175,37,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700 }}>{group.key}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{t('inventory.productTypes')}：{group.items.length}</div>
                      </div>
                      <div style={{ padding: 12 }}>
              <Table
                columns={columns}
                          dataSource={group.items}
                rowKey="id"
                          size="small"
                loading={loading}
                          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys, preserveSelectedRowKeys: true }}
                          pagination={false}
                        />
                      </div>
                    </div>
                  ))}
                  {groupedByBrand.length === 0 && (
                    <div style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>{t('common.noData')}</div>
                  )}
                </div>
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
                                  const computed = getComputedStock((record as any)?.id)
                                  const min = ((record as any)?.inventory?.minStock ?? 0)
                                  const st = (computed <= min) ? 'critical' : (computed <= (min * 1.5)) ? 'low' : 'normal'
                                  const color = st === 'normal' ? '#16a34a' : st === 'low' ? '#f59e0b' : '#ef4444'
                                  const text = st === 'normal' ? t('inventory.stockNormal') : st === 'low' ? t('inventory.stockLow') : t('inventory.stockCritical')
                                  return (
                                    <>
                                      <span style={{ width: 8, height: 8, borderRadius: 9999, background: color, display: 'inline-block' }} />
                                      <span style={{ color }}>{text}</span>
                                      <span style={{ color: 'rgba(224,214,196,0.6)' }}>|</span>
                                      <span style={{ color: '#fff' }}>{computed} 件</span>
                                    </>
                                  )
                                })()}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, marginTop: 4 }}>
                                {(() => { const { totalIn, totalOut } = getTotals((record as any)?.id); return (
                                  <>
                                    <span style={{ color: 'rgba(224,214,196,0.8)' }}>{t('inventory.totalIn')}: <span style={{ color: '#fff' }}>{totalIn}</span></span>
                                    <span style={{ color: 'rgba(224,214,196,0.8)' }}>{t('inventory.totalOut')}: <span style={{ color: '#fff' }}>{totalOut}</span></span>
                                  </>
                                ) })()}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <button 
                                style={{ 
                                  padding: '4px 8px', 
                                  borderRadius: 6, 
                                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
                                  color: '#111', 
                                  fontWeight: 600, 
                                  fontSize: 12, 
                                  cursor: 'pointer', 
                                  transition: 'all 0.2s ease',
                                  border: '1px solid transparent',
                                  whiteSpace: 'nowrap',
                                  width: '100%'
                                }} 
                                onClick={() => {
                                  setEditing(record)
                                  form.setFieldsValue({
                                    name: (record as any).name,
                                    brand: (record as any).brand,
                                    origin: (record as any).origin,
                                    size: (record as any).size,
                                    strength: (record as any).strength,
                                    price: (record as any).price,
                                    stock: getComputedStock((record as any)?.id) ?? 0,
                                    minStock: (record as any)?.inventory?.minStock ?? 0,
                                    reserved: (record as any)?.inventory?.reserved ?? 0,
                                  })
                                }}
                              >
                                {t('common.edit')}
                              </button>
                              <button 
                                style={{ 
                                  padding: '4px 8px', 
                                  borderRadius: 6, 
                                  background: 'rgba(255,255,255,0.1)', 
                                  color: '#fff', 
                                  fontWeight: 600, 
                                  fontSize: 12, 
                                  cursor: 'pointer', 
                                  transition: 'all 0.2s ease',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  whiteSpace: 'nowrap',
                                  width: '100%'
                                }} 
                                onClick={() => {
                                  setViewingProductLogs((record as any)?.id)
                                }}
                              >
                                {t('inventory.view')}
                              </button>
                            </div>
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
              
              {/* 搜索栏和添加品牌按钮 */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '16px', 
                    transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,0.5)'
                  }}>
                    <SearchOutlined style={{ fontSize: '20px' }} />
                  </div>
                  <Input
                    placeholder={t('inventory.searchBrand')}
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    style={{
                      width: '100%',
                      borderRadius: '9999px',
                      border: 'none',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '12px 16px 12px 48px',
                      color: 'white',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                {/* 添加品牌按钮 */}
                <button
                  onClick={() => setCreatingBrand(true)}
                  className="cigar-btn-gradient"
                  style={{
                    height: '48px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '0 24px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <PlusOutlined style={{ fontSize: '20px' }} />
                  <span>{t('inventory.addBrand')}</span>
                </button>
              </div>

              {/* 排序和筛选按钮 */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <Button 
                  style={{
                    borderRadius: '9999px',
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px'
                  }}
                >
                  <span>{t('inventory.sort')}</span>
                  <svg fill="currentColor" height="16" viewBox="0 0 256 256" width="16">
                    <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"></path>
                  </svg>
                  </Button>
                <Button
                  style={{
                    borderRadius: '9999px',
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px'
                  }}
                >
                  <span>{t('inventory.filter')}</span>
                  <svg fill="currentColor" height="16" viewBox="0 0 256 256" width="16">
                    <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"></path>
                  </svg>
                </Button>
              </div>
              
              {/* 品牌列表 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {brandList.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 0', 
                    color: 'rgba(255,255,255,0.6)' 
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏷️</div>
                    <div style={{ fontSize: '16px', marginBottom: '8px' }}>{t('inventory.noBrandsFound')}</div>
                    <div style={{ fontSize: '14px' }}>{t('inventory.addFirstBrand')}</div>
                  </div>
                ) : (
                  brandList
                    .filter(brand => !keyword || brand.name.toLowerCase().includes(keyword.toLowerCase()))
                    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
                    .map((brand) => {
                      const productCount = items.filter(item => item.brand === brand.name).length
                      return (
                        <div
                          key={brand.id}
                          style={{
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '16px',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            justifyContent: 'space-between',
                            gap: '16px'
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '12px'
                              }}>
                                {brand.logo ? (
                                  <img 
                                    src={brand.logo} 
                                    alt={brand.name} 
                                    style={{ 
                                      width: '50px', 
                                      height: '50px', 
                                      borderRadius: '8px',
                                      objectFit: 'cover',
                                      border: '2px solid rgba(244,175,37,0.3)'
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  <div style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '8px',
                                    background: 'linear-gradient(135deg, rgba(244,175,37,0.2), rgba(224,153,15,0.2))',
                                    border: '2px solid rgba(244,175,37,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: '#f4af25'
                                  }}>
                                    {brand.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <h3 style={{ 
                                    fontWeight: 'bold',
                                    background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                                    WebkitBackgroundClip: 'text',
                                    color: 'transparent',
                                    fontSize: '18px',
                                    margin: '0 0 4px 0'
                                  }}>
                                    {brand.name}
                                  </h3>
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '16px',
                                    fontSize: '12px',
                                    color: 'rgba(255,255,255,0.7)'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <svg 
                                        style={{ color: '#f4af25' }} 
                                        fill="none" 
                                        height="14"                                         
                                        stroke="currentColor" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth="2" 
                                        viewBox="0 0 24 24" 
                                        width="14"
                                      >
                                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                                        <circle cx="12" cy="10" r="3"></circle>
                                      </svg>
                                      <span>{t('inventory.origin')}：{brand.country || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <svg 
                                        style={{ color: '#f4af25' }} 
                                        fill="none" 
                                        height="14" 
                                        stroke="currentColor" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth="2" 
                                        viewBox="0 0 24 24" 
                                        width="14"
                                      >
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                        <line x1="12" x2="12" y1="22.08" y2="12"></line>
                                      </svg>
                                      <span>{t('inventory.productTypes')}：{productCount}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                            <Button 
                                onClick={() => setEditingBrand(brand)}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                                  border: 'none',
                                  color: 'black',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 4px 15px 0 rgba(244,175,37,0.3)',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.05)'
                                  e.currentTarget.style.boxShadow = '0 6px 20px 0 rgba(244,175,37,0.4)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)'
                                  e.currentTarget.style.boxShadow = '0 4px 15px 0 rgba(244,175,37,0.3)'
                                }}
                              >
                                <EditOutlined style={{ fontSize: '18px' }} />
                            </Button>
                            <Button 
                                onClick={async () => {
                                  
                                  const confirmed = window.confirm(`确定要删除品牌 "${brand.name}" 吗？`)
                                  
                                  if (confirmed) {
                                    try {
                                      setLoading(true)
                                      
                                      const result = await deleteDocument(COLLECTIONS.BRANDS, brand.id)
                                      
                                      if (result.success) {
                                        message.success(t('inventory.brandDeleted'))
                                        setBrandList(await getBrands())
                                      } else {
                                        message.error(t('inventory.brandDeleteFailed'))
                                      }
                                    } catch (error) {
                                      message.error(t('inventory.brandDeleteFailed') + ': ' + (error as Error).message)
                                    } finally {
                                      setLoading(false)
                                    }
                                  } else {
                                  }
                                }}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(to right, #ff6b6b, #ee5a52)',
                                  border: 'none',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 4px 15px 0 rgba(255,107,107,0.3)',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.05)'
                                  e.currentTarget.style.boxShadow = '0 6px 20px 0 rgba(255,107,107,0.4)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)'
                                  e.currentTarget.style.boxShadow = '0 4px 15px 0 rgba(255,107,107,0.3)'
                                }}
                              >
                                <DeleteOutlined style={{ fontSize: '18px' }} />
                            </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </div>
          )}
          {activeTab === 'in' && (
            <div>
              {/* 搜索和筛选 */}
              <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <Search
                  placeholder={t('inventory.searchInLogs')}
                  value={inSearchKeyword}
                  onChange={(e) => setInSearchKeyword(e.target.value)}
                  style={{ width: 300 }}
                  allowClear
                />
                <Select
                  placeholder={t('inventory.filterByBrand')}
                  value={inBrandFilter}
                  onChange={setInBrandFilter}
                  style={{ width: 200 }}
                  allowClear
                >
                  {Array.from(new Set(items.map(i => i.brand))).sort().map(brand => (
                    <Option key={brand} value={brand}>{brand}</Option>
                  ))}
                </Select>
                <div style={{ flex: 1 }} />
                <button 
                  onClick={() => setInStatsOpen(true)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: '1px solid rgba(244, 175, 37, 0.5)',
                    background: 'rgba(244, 175, 37, 0.1)',
                    color: '#f4af25',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600
                  }}
                >
                  {t('inventory.inStats')}
                </button>
                <button
                  onClick={() => setInModalOpen(true)}
                  className="cigar-btn-gradient"
                  style={{ padding: '6px 14px', borderRadius: 8 }}
                >
                  {t('inventory.inStock')}
                </button>
              </div>
            <Card>
              <Modal
                title={t('inventory.inStockRecord')}
                open={inModalOpen}
                onCancel={() => setInModalOpen(false)}
                footer={null}
                {...getResponsiveModalConfig(isMobile, true, 720)}
              >
              <Form form={inForm} layout="vertical" className="dark-theme-form" onFinish={async (values: { referenceNo?: string; reason?: string; items: { cigarId: string; quantity: number; unitPrice?: number }[] }) => {
                const lines = (values.items || []).filter(it => it?.cigarId && it?.quantity > 0)
                if (lines.length === 0) { message.warning(t('inventory.pleaseAddAtLeastOneInStockDetail')); return }
                setLoading(true)
                try {
                  for (const line of lines) {
                    const target = items.find(i => i.id === line.cigarId) as any
                    if (!target) continue
                    const qty = Math.max(1, Math.floor(line.quantity || 1))
                    await createDocument(COLLECTIONS.INVENTORY_LOGS, {
                      cigarId: target.id,
                      cigarName: target.name,
                      type: 'in',
                      quantity: qty,
                      reason: values.reason || t('inventory.inStock'),
                      referenceNo: values.referenceNo,
                      unitPrice: (line.unitPrice != null ? Number(line.unitPrice) : undefined),
                      operatorId: 'system',
                      createdAt: new Date(),
                    } as any)
                  }
                  message.success(t('inventory.inStockSuccess'))
                  inForm.resetFields()
                  setItems(await getCigars())
                  setInventoryLogs(await getAllInventoryLogs())
                  setInModalOpen(false)
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
                            <Select
                              placeholder={t('inventory.pleaseSelectProduct')}
                              showSearch
                              optionFilterProp="children"
                              filterOption={(input, option) => {
                                const kw = (input || '').toLowerCase()
                                const text = String((option?.children as any) || '').toLowerCase()
                                return text.includes(kw)
                              }}
                            >
                              {groupedCigars.map(group => (
                                <Select.OptGroup key={group.brand} label={group.brand}>
                                  {group.list.map(i => (
                                    <Option key={i.id} value={i.id}>{i.name} - RM{i.price}（{t('inventory.stock')}：{getComputedStock(i.id)}）</Option>
                                  ))}
                                </Select.OptGroup>
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
                          <Form.Item
                            {...restField}
                            name={[name, 'unitPrice']}
                            rules={[]}
                          >
                            <InputNumber min={0} step={0.01} placeholder={t('inventory.price')} />
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
                  <Space>
                    <Button onClick={() => setInModalOpen(false)}>{t('common.cancel')}</Button>
                    <Button type="primary" htmlType="submit" loading={loading}>{t('inventory.confirmInStock')}</Button>
                  </Space>
                </Form.Item>
              </Form>
              </Modal>
              {!isMobile ? (
              <Table
                  style={{ marginTop: 1 }}
                title={() => t('inventory.inStockRecord')}
                  dataSource={inLogsGroupedByReference}
                  rowKey={(record) => record.referenceNo || 'no-ref'}
                  pagination={{ 
                    pageSize: inPageSize,
                    showSizeChanger: true,
                    showQuickJumper: false,
                    pageSizeOptions: ['5','10','20','50'],
                    onChange: (_page, size) => {
                      const next = size || inPageSize
                      setInPageSize(next)
                      try { localStorage.setItem('inventory_in_page_size', String(next)) } catch {}
                    }
                  }}
                  expandable={{
                    expandedRowKeys: inLogsExpandedKeys,
                    onExpandedRowsChange: (keys) => setInLogsExpandedKeys([...keys]),
                    expandedRowRender: (record: any) => (
                      <Table
                        dataSource={record.logs}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        showHeader={true}
                        style={{ marginLeft: 20 }}
                        columns={[
                          { 
                            title: t('inventory.product'), 
                            dataIndex: 'cigarId', 
                            key: 'cigarId', 
                            render: (id: string, rec: any) => {
                              const cigar = items.find(i => i.id === id)
                              return rec.cigarName || cigar?.name || id
                            }
                          },
                          { 
                            title: t('inventory.quantity'), 
                            dataIndex: 'quantity', 
                            key: 'quantity',
                            render: (qty: number) => (
                              <span style={{ color: '#52c41a', fontWeight: 600 }}>+{qty}</span>
                            )
                          },
                          { 
                            title: t('inventory.unitPrice'), 
                            dataIndex: 'unitPrice', 
                            key: 'unitPrice',
                            render: (price: number) => price ? `RM ${price.toFixed(2)}` : '-'
                          },
                          { 
                            title: t('inventory.totalValue'), 
                            key: 'totalValue',
                            render: (_: any, rec: any) => {
                              const val = Number(rec.quantity || 0) * Number(rec.unitPrice || 0)
                              return val > 0 ? `RM ${val.toFixed(2)}` : '-'
                            }
                          },
                          { 
                            title: t('inventory.time'), 
                            dataIndex: 'createdAt', 
                            key: 'createdAt', 
                            render: (v: any) => {
                              const d = toDateSafe(v)
                              return d ? d.toLocaleString('zh-CN', { 
                                month: '2-digit', 
                                day: '2-digit', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : '-'
                            }
                          }
                        ]}
                      />
                    ),
                    columnWidth: 60,
                    columnTitle: (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            if (inLogsExpandedKeys.length > 0) {
                              setInLogsExpandedKeys([])
                            } else {
                              setInLogsExpandedKeys(inLogsGroupedByReference.map(g => g.referenceNo || 'no-ref'))
                            }
                          }}
                          style={{
                            padding: '2px 8px',
                            fontSize: 12,
                            background: 'rgba(244, 175, 37, 0.1)',
                            border: '1px solid rgba(244, 175, 37, 0.3)',
                            borderRadius: 4,
                            color: '#f4af25',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {inLogsExpandedKeys.length > 0 ? t('inventory.collapseAll') : t('inventory.expandAll')}
                        </button>
                      </div>
                    )
                  }}
                  columns={[
                    {
                      title: t('inventory.referenceNo'),
                      dataIndex: 'referenceNo',
                      key: 'referenceNo',
                      render: (refNo: string) => (
                        <span style={{ 
                          fontFamily: 'monospace', 
                          fontWeight: 600,
                          color: refNo === t('inventory.unassignedReference') ? '#999' : '#1890ff'
                        }}>
                          {refNo}
                        </span>
                      )
                    },
                    {
                      title: t('inventory.time'),
                      dataIndex: 'date',
                      key: 'date',
                      render: (date: Date | null) => formatYMD(date),
                      sorter: (a: any, b: any) => {
                        const dateA = a.date?.getTime() || 0;
                        const dateB = b.date?.getTime() || 0;
                        return dateA - dateB;
                      }
                    },
                    {
                      title: t('inventory.productTypes'),
                      dataIndex: 'productCount',
                      key: 'productCount',
                      render: (count: number) => (
                        <span>{count} {t('inventory.types')}</span>
                      )
                    },
                    {
                      title: t('inventory.totalQuantity'),
                      dataIndex: 'totalQuantity',
                      key: 'totalQuantity',
                      render: (qty: number) => (
                        <span style={{ color: '#52c41a', fontWeight: 600 }}>+{qty}</span>
                      )
                    },
                    {
                      title: t('inventory.totalValue'),
                      dataIndex: 'totalValue',
                      key: 'totalValue',
                      render: (val: number) => val > 0 ? `RM ${val.toFixed(2)}` : '-'
                    },
                    {
                      title: t('inventory.reason'),
                      dataIndex: 'reason',
                      key: 'reason',
                      render: (reason: string) => reason || '-'
                    }
                  ]}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, color: '#fff' }}>{t('inventory.inStockRecord')}</div>
                  {inLogsGroupedByReference.map((group: any) => {
                    const isExpanded = inLogsExpandedKeys.includes(group.referenceNo || 'no-ref')
                    return (
                      <div 
                        key={group.referenceNo || 'no-ref'} 
                        style={{
                          borderRadius: 12,
                          background: 'rgba(82, 196, 26, 0.08)',
                          border: '1px solid rgba(82, 196, 26, 0.3)',
                          overflow: 'hidden'
                        }}
                      >
                        {/* 单号头部 */}
                        <div 
                          onClick={() => {
                            const key = group.referenceNo || 'no-ref'
                            if (isExpanded) {
                              setInLogsExpandedKeys(prev => prev.filter(k => k !== key))
                            } else {
                              setInLogsExpandedKeys(prev => [...prev, key])
                            }
                          }}
                          style={{
                            padding: 12,
                            background: 'rgba(82, 196, 26, 0.15)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontSize: 14, 
                              fontWeight: 700, 
                              color: '#fff',
                              fontFamily: 'monospace',
                              marginBottom: 4
                            }}>
                              📦 {group.referenceNo}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                              {formatYMD(group.date)} · {group.productCount} {t('inventory.types')} · {group.totalQuantity} {t('inventory.sticks')}
                            </div>
                          </div>
                          <div style={{ 
                            fontSize: 18, 
                            fontWeight: 700, 
                            color: '#52c41a',
                            marginRight: 8
                          }}>
                            {isExpanded ? '▲' : '▼'}
                          </div>
                        </div>
                        
                        {/* 展开的产品列表 */}
                        {isExpanded && (
                          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {group.logs.map((log: any) => {
                              const cigar = items.find(i => i.id === log.cigarId)
                              const itemValue = Number(log.quantity || 0) * Number(log.unitPrice || 0)
                              return (
                                <div 
                                  key={log.id}
                                  style={{
                                    padding: 10,
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: 8,
                                    border: '1px solid rgba(82, 196, 26, 0.2)'
                                  }}
                                >
                                  <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 6
                                  }}>
                                    <div style={{ 
                                      fontSize: 13, 
                                      fontWeight: 600, 
                                      color: '#fff',
                                      flex: 1,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      marginRight: 8
                                    }}>
                                      {log.cigarName || cigar?.name || log.cigarId}
                                    </div>
                                    <div style={{ 
                                      fontSize: 16, 
                                      fontWeight: 700, 
                                      color: '#52c41a',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      +{log.quantity}
                                    </div>
                                  </div>
                                  <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    fontSize: 11,
                                    color: 'rgba(255,255,255,0.6)'
                                  }}>
                                    <div>
                                      {log.unitPrice ? `${t('inventory.unitPrice')}: RM ${log.unitPrice.toFixed(2)}` : ''}
                                    </div>
                                    <div>
                                      {itemValue > 0 ? `${t('inventory.totalValue')}: RM ${itemValue.toFixed(2)}` : ''}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                            
                            {/* 单号汇总 */}
                            <div style={{
                              marginTop: 4,
                              padding: 10,
                              background: 'rgba(82, 196, 26, 0.1)',
                              borderRadius: 8,
                              border: '1px solid rgba(82, 196, 26, 0.3)'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                fontSize: 12,
                                color: '#fff',
                                fontWeight: 600
                              }}>
                                <div>{t('inventory.summary')}</div>
                                <div style={{ color: '#52c41a' }}>
                                  +{group.totalQuantity} {t('inventory.sticks')}
                                  {group.totalValue > 0 ? ` · RM ${group.totalValue.toFixed(2)}` : ''}
                                </div>
                              </div>
                              {group.reason && group.reason !== '-' && (
                                <div style={{ 
                                  marginTop: 4,
                                  fontSize: 11, 
                                  color: 'rgba(255,255,255,0.6)' 
                                }}>
                                  📝 {group.reason}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {inLogsGroupedByReference.length === 0 && (
                    <div style={{ 
                      padding: 40, 
                      textAlign: 'center', 
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: 14
                    }}>
                      {t('common.noData')}
                    </div>
                  )}
                </div>
              )}
            </Card>
            </div>
          )}
          {activeTab === 'out' && (
            <div>
              {/* 搜索和筛选 */}
              <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <Search
                  placeholder={t('inventory.searchOutLogs')}
                  value={outSearchKeyword}
                  onChange={(e) => setOutSearchKeyword(e.target.value)}
                  style={{ width: 300 }}
                  allowClear
                />
                <Select
                  placeholder={t('inventory.filterByBrand')}
                  value={outBrandFilter}
                  onChange={setOutBrandFilter}
                  style={{ width: 200 }}
                  allowClear
                >
                  {Array.from(new Set(items.map(i => i.brand))).sort().map(brand => (
                    <Option key={brand} value={brand}>{brand}</Option>
                  ))}
                </Select>
                <div style={{ flex: 1 }} />
                <button 
                  onClick={() => setOutStatsOpen(true)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: '1px solid rgba(244, 175, 37, 0.5)',
                    background: 'rgba(244, 175, 37, 0.1)',
                    color: '#f4af25',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600
                  }}
                >
                  {t('inventory.outStats')}
                </button>
                <button
                  onClick={() => setOutModalOpen(true)}
                  className="cigar-btn-gradient"
                  style={{ padding: '6px 14px', borderRadius: 8 }}
                >
                  {t('inventory.createOutStock')}
                </button>
              </div>

              {/* 出库创建弹窗 */}
              <Modal
                title={t('inventory.createOutStock')}
                open={outModalOpen}
                onCancel={() => setOutModalOpen(false)}
                footer={null}
                {...getResponsiveModalConfig(isMobile, true, 680)}
              >
                <Form form={outForm} layout="vertical" className="dark-theme-form" onFinish={async (values: { referenceNo?: string; reason?: string; items: { cigarId: string; quantity: number }[] }) => {
                  const lines = (values.items || []).filter(it => it?.cigarId && it?.quantity > 0)
                  if (lines.length === 0) { message.warning(t('inventory.pleaseAddAtLeastOneOutStockDetail')); return }
                  setLoading(true)
                  try {
                    for (const line of lines) {
                      const target = items.find(i => i.id === line.cigarId) as any
                      if (!target) continue
                      const qty = Math.max(1, Math.floor(line.quantity || 1))
                      await createDocument(COLLECTIONS.INVENTORY_LOGS, {
                        cigarId: target.id,
                        cigarName: target.name,
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
                    setOutModalOpen(false)
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
                              <Select 
                                placeholder={t('inventory.pleaseSelectProduct')}
                                showSearch
                                optionFilterProp="children"
                                filterOption={(input, option) => {
                                  const kw = (input || '').toLowerCase()
                                  const text = String((option?.children as any) || '').toLowerCase()
                                  return text.includes(kw)
                                }}
                              >
                                {groupedCigars.map(group => (
                                  <Select.OptGroup key={group.brand} label={group.brand}>
                                    {group.list.map(i => (
                                      <Option key={i.id} value={i.id}>{i.name} - RM{i.price}（{t('inventory.stock')}：{getComputedStock(i.id)}）</Option>
                                    ))}
                                  </Select.OptGroup>
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
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button onClick={() => setOutModalOpen(false)} style={{ padding: '8px 16px', borderRadius: 8 }}>{t('common.cancel')}</button>
                      <button type="submit" disabled={loading} className="cigar-btn-gradient" style={{ padding: '8px 16px', borderRadius: 8, opacity: loading ? 0.6 : 1 }}>{t('inventory.confirmOutStock')}</button>
                    </div>
                  </Form.Item>
                </Form>
              </Modal>
            <Card>
              {!isMobile ? (
              <Table
                  title={() => t('inventory.outStockRecord')}
                  columns={unifiedOutColumns}
                  dataSource={unifiedOutRows}
                rowKey="id"
                  pagination={{ 
                    pageSize: outPageSize,
                    showSizeChanger: true,
                    showQuickJumper: false,
                    pageSizeOptions: ['5','10','20','50'],
                    onChange: (_page, size) => {
                      const next = size || outPageSize
                      setOutPageSize(next)
                      try { localStorage.setItem('inventory_out_page_size', String(next)) } catch {}
                    }
                  }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('inventory.outStockRecord')}</div>
                  {unifiedOutRows.map((log: any) => {
                    const cigar = items.find(i => i.id === log.cigarId)
                    const user = users.find((u: any) => u.id === log.userId)
                    const userName = user?.displayName || user?.email || log.userId || '-'
                    return (
                      <div key={log.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.7)',
                        border: '1px solid rgba(0,0,0,0.06)'
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cigar?.name || log.cigarId}</div>
                            <div style={{ color: '#999', fontSize: 12 }}>{formatYMD(toDateSafe(log.createdAt))}</div>
                          </div>
                          <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                            <div style={{ color: '#666' }}>{t('inventory.referenceNo')}: {log.referenceNo || '-'}</div>
                            <div style={{ color: '#666' }}>{t('inventory.quantity')}: {log.quantity}</div>
                          </div>
                          <div style={{ marginTop: 6, color: '#888', fontSize: 12 }}>
                            {log.source === 'order' ? (
                              <span>{t('inventory.activityOrderOutbound')}: {userName}</span>
                            ) : (
                              <span>{t('inventory.reason')}: {log.reason || '-'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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
        {...getResponsiveModalConfig(isMobile, true, 600)}
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
                    const productId = (editing as any)?.id
                    const productName = (editing as any)?.name || ''
                    
                    if (hasInventoryHistory(productId)) {
                      // 显示有库存记录的提示窗
                      const relatedLogs = inventoryLogs.filter((log: any) => log?.cigarId === productId)
                      const inCount = relatedLogs.filter((log: any) => log?.type === 'in').length
                      const outCount = relatedLogs.filter((log: any) => log?.type === 'out').length
                      
                      Modal.info({
                        title: t('inventory.deleteBlocked'),
                        content: (
                          <div>
                            <p>{t('inventory.deleteBlockedDueToLogs')}</p>
                            <p><strong>{productName}</strong> {t('inventory.hasInventoryRecords')}:</p>
                            <ul style={{ marginLeft: 20 }}>
                              <li>{t('inventory.inStockRecords')}: {inCount} {t('inventory.records')}</li>
                              <li>{t('inventory.outStockRecords')}: {outCount} {t('inventory.records')}</li>
                            </ul>
                            <p style={{ color: '#ff4d4f', marginTop: 12 }}>
                              {t('inventory.deleteBlockedExplanation')}
                            </p>
                          </div>
                        ),
                        okText: t('common.understood'),
                      })
                      return
                    }
                    
                    Modal.confirm({
                      title: t('common.deleteProduct'),
                      content: `确定删除产品 ${productName} 吗？`,
                      okButtonProps: { danger: true },
                      onOk: async () => {
                        
                        setLoading(true)
                        try {
                          const res = await deleteDocument(COLLECTIONS.CIGARS, productId)
                          
                          if (res.success) {
                            message.success(t('common.deleted'))
                            setItems(await getCigars())
                            setSelectedRowKeys([])
                            setEditing(null)
                          } else {
                            message.error(t('common.deleteFailed'))
                          }
                        } catch (error) {
                          message.error(t('common.deleteFailed') + ': ' + (error as Error).message)
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
                  width={100}
                  height={100}
                />
              </Form.Item>
            </div>
          )}
        </div>
        <Form form={form} layout="horizontal" labelCol={{ flex: '100px' }} wrapperCol={{ flex: 'auto' }} className="dark-theme-form" onFinish={async (values: any) => {
          setLoading(true)
          try {
            // 根据品牌名称找到对应的品牌ID
            const selectedBrand = brandList.find(brand => brand.name === values.brand)
            
            const payload: Partial<Cigar> = {
              name: values.name,
              brand: values.brand,
              brandId: selectedBrand?.id, // 添加品牌ID关联
              origin: values.origin ?? selectedBrand?.country,
              size: values.size,
              strength: values.strength,
              price: values.price,
              sku: values.sku,
              inventory: {
                // 库存实时由日志计算，不写入 stock 字段
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
              onChange={(val) => {
                const b = brandList.find(brand => brand.name === val)
                if (b?.country) {
                  try { form.setFieldsValue({ origin: b.country }) } catch {}
                }
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
          setLoading(true)
          try {
            await createDocument<InventoryLog>(COLLECTIONS.INVENTORY_LOGS, {
              cigarId: (target as any).id,
              cigarName: (target as any).name,
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
            } else {
              message.error(t('common.deleteFailed'))
            }
          } catch (error) {
            message.error(t('common.deleteFailed') + ': ' + (error as Error).message)
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
            { title: t('inventory.time'), dataIndex: 'createdAt', key: 'createdAt', render: (v: any) => { const d = toDateSafe(v); return d ? d.toLocaleString() : '-' } },
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

      {/* 产品出入库记录弹窗 */}
      <Modal
        title={`${t('inventory.productLogs')} - ${items.find(i => i.id === viewingProductLogs)?.name || viewingProductLogs}`}
        open={!!viewingProductLogs}
        onCancel={() => setViewingProductLogs(null)}
        footer={null}
        width={isMobile ? '100%' : 900}
        style={isMobile ? { top: 0, paddingBottom: 0, maxHeight: '100vh' } : {}}
        styles={(() => {
          const baseStyles = getModalThemeStyles(isMobile, true);
          return {
            ...baseStyles,
            body: {
              ...(baseStyles?.body || {}),
              ...(isMobile ? { padding: '12px', maxHeight: 'calc(100vh - 55px)', overflow: 'auto' } : {})
            }
          };
        })()}
      >
        {!isMobile ? (
          // 电脑端 - 使用表格
          <>
            <Table
              columns={[
                { 
                  title: t('inventory.time'), 
                  dataIndex: 'createdAt', 
                  key: 'createdAt', 
                  render: (v: any) => { 
                    const d = toDateSafe(v); 
                    return d ? d.toLocaleString() : '-' 
                  },
                  sorter: (a: any, b: any) => {
                    const da = toDateSafe(a.createdAt)?.getTime() || 0
                    const db = toDateSafe(b.createdAt)?.getTime() || 0
                    return da - db
                  }
                },
                { 
                  title: t('inventory.type'), 
                  dataIndex: 'type', 
                  key: 'type', 
                  render: (type: string) => {
                    const color = type === 'in' ? 'green' : type === 'out' ? 'red' : 'blue'
                    const text = type === 'in' ? t('inventory.stockIn') : type === 'out' ? t('inventory.stockOut') : t('inventory.adjustment')
                    return <Tag color={color}>{text}</Tag>
                  },
                  filters: [
                    { text: t('inventory.stockIn'), value: 'in' },
                    { text: t('inventory.stockOut'), value: 'out' },
                    { text: t('inventory.adjustment'), value: 'adjustment' }
                  ],
                  onFilter: (value: any, record: any) => record.type === value
                },
                { 
                  title: t('inventory.quantity'), 
                  dataIndex: 'quantity', 
                  key: 'quantity',
                  render: (quantity: number, record: any) => {
                    const color = record.type === 'in' ? 'green' : record.type === 'out' ? 'red' : 'blue'
                    const prefix = record.type === 'in' ? '+' : record.type === 'out' ? '-' : ''
                    return <span style={{ color: color === 'green' ? '#52c41a' : color === 'red' ? '#ff4d4f' : '#1890ff' }}>
                      {prefix}{quantity}
                    </span>
                  },
                  sorter: (a: any, b: any) => a.quantity - b.quantity
                },
                { 
                  title: t('inventory.referenceNo'), 
                  dataIndex: 'referenceNo', 
                  key: 'referenceNo', 
                  render: (v: any) => v || '-'
                },
                { 
                  title: t('inventory.reason'), 
                  dataIndex: 'reason', 
                  key: 'reason', 
                  render: (v: any) => v || '-'
                },
                { 
                  title: t('inventory.customer'), 
                  dataIndex: 'userId', 
                  key: 'userId', 
                  render: (userId: string, record: any) => {
                    // 1. 优先使用记录中直接保存的 userName
                    if (record.userName) return record.userName;
                    
                    // 2. 如果有 userId，从 users 列表查找
                    if (userId) {
                      const user = users.find(u => u.id === userId);
                      if (user?.displayName) return user.displayName;
                    }
                    
                    // 3. 尝试从 referenceNo 查找订单关联的用户
                    if (record.referenceNo) {
                      const order = orders.find(o => o.id === record.referenceNo);
                      if (order?.userId) {
                        const user = users.find(u => u.id === order.userId);
                        if (user?.displayName) return user.displayName;
                        return order.userId;
                      }
                    }
                    
                    // 4. 都没有则显示 -
                    return '-';
                  }
                },
                { 
                  title: t('inventory.operator'), 
                  dataIndex: 'operatorId', 
                  key: 'operatorId', 
                  render: (v: any) => v || '-'
                },
              ]}
              dataSource={currentProductLogs}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => t('common.paginationTotal', { start: range[0], end: range[1], total })
              }}
              size="small"
            />
            <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{t('inventory.summary')}</div>
              <div>{t('inventory.totalRecords')}：{currentProductLogs.length} {t('inventory.records')}</div>
              <div>{t('inventory.totalInStock')}：{currentProductLogs.filter(log => log.type === 'in').reduce((sum, log) => sum + (log.quantity || 0), 0)} {t('inventory.sticks')}</div>
              <div>{t('inventory.totalOutStock')}：{currentProductLogs.filter(log => log.type === 'out').reduce((sum, log) => sum + (log.quantity || 0), 0)} {t('inventory.sticks')}</div>
              <div>{t('inventory.currentStock')}：{getComputedStock(viewingProductLogs || '')} {t('inventory.sticks')}</div>
            </div>
          </>
        ) : (
          // 手机端 - 使用卡片式布局
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 统计摘要 */}
            <div style={{ 
              padding: 16, 
              background: 'linear-gradient(135deg, rgba(244,175,37,0.1) 0%, rgba(244,175,37,0.05) 100%)', 
              borderRadius: 12,
              border: '1px solid rgba(244,175,37,0.2)'
            }}>
              <div style={{ 
                fontSize: 14, 
                fontWeight: 700, 
                color: '#f4af25', 
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                📊 {t('inventory.summary')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{t('inventory.totalRecords')}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{currentProductLogs.length}</div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{t('inventory.currentStock')}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#f4af25' }}>{getComputedStock(viewingProductLogs || '')}</div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>✅ {t('inventory.totalInStock')}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}>
                    +{currentProductLogs.filter(log => log.type === 'in').reduce((sum, log) => sum + (log.quantity || 0), 0)}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>❌ {t('inventory.totalOutStock')}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#ff4d4f' }}>
                    -{currentProductLogs.filter(log => log.type === 'out').reduce((sum, log) => sum + (log.quantity || 0), 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* 记录列表 */}
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
              {t('inventory.recentRecords')} ({currentProductLogs.length})
            </div>
            
            {currentProductLogs.length === 0 ? (
              <div style={{ 
                padding: 40, 
                textAlign: 'center', 
                color: 'rgba(255,255,255,0.4)',
                fontSize: 14
              }}>
                {t('common.noData')}
              </div>
            ) : (
              currentProductLogs.map((log: any) => {
                const isIn = log.type === 'in'
                const isOut = log.type === 'out'
                const typeColor = isIn ? '#52c41a' : isOut ? '#ff4d4f' : '#1890ff'
                const typeText = isIn ? t('inventory.stockIn') : isOut ? t('inventory.stockOut') : t('inventory.adjustment')
                const d = toDateSafe(log.createdAt)
                
                // 获取客户名称
                let customerName = '-'
                if (log.userName) {
                  customerName = log.userName
                } else if (log.userId) {
                  const user = users.find(u => u.id === log.userId)
                  if (user?.displayName) customerName = user.displayName
                } else if (log.referenceNo) {
                  const order = orders.find(o => o.id === log.referenceNo)
                  if (order?.userId) {
                    const user = users.find(u => u.id === order.userId)
                    if (user?.displayName) customerName = user.displayName
                  }
                }
                
                return (
                  <div 
                    key={log.id} 
                    style={{ 
                      padding: 12,
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 10,
                      border: `1px solid ${typeColor}33`,
                      position: 'relative'
                    }}
                  >
                    {/* 类型标签 */}
                    <div style={{ 
                      position: 'absolute',
                      top: -8,
                      right: 12,
                      padding: '2px 8px',
                      background: typeColor,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 4,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                      {typeText}
                    </div>
                    
                    {/* 数量 - 突出显示 */}
                    <div style={{ 
                      fontSize: 24, 
                      fontWeight: 700, 
                      color: typeColor,
                      marginBottom: 8,
                      marginTop: 4
                    }}>
                      {isIn ? '+' : isOut ? '-' : ''}{log.quantity}
                    </div>
                    
                    {/* 信息网格 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>⏰ {t('inventory.time')}</span>
                        <span style={{ color: '#fff', fontWeight: 500 }}>
                          {d ? d.toLocaleString('zh-CN', { 
                            month: '2-digit', 
                            day: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : '-'}
                        </span>
                      </div>
                      
                      {log.reason && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)' }}>📝 {t('inventory.reason')}</span>
                          <span style={{ color: '#fff', fontWeight: 500, textAlign: 'right', flex: 1, marginLeft: 8 }}>
                            {log.reason}
                          </span>
                        </div>
                      )}
                      
                      {log.referenceNo && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)' }}>🔖 {t('inventory.referenceNo')}</span>
                          <span style={{ 
                            color: '#f4af25', 
                            fontWeight: 500,
                            fontSize: 11,
                            fontFamily: 'monospace'
                          }}>
                            {log.referenceNo}
                          </span>
                        </div>
                      )}
                      
                      {customerName !== '-' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)' }}>👤 {t('inventory.customer')}</span>
                          <span style={{ color: '#fff', fontWeight: 500 }}>{customerName}</span>
                        </div>
                      )}
                      
                      {log.operatorId && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)' }}>👨‍💼 {t('inventory.operator')}</span>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{log.operatorId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
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
        {...getResponsiveModalConfig(isMobile, true, 600)}
      >
        <Form
          form={brandForm}
          layout="vertical"
          className="dark-theme-form"
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
      {/* 入库统计弹窗 */}
      <Modal
        title={t('inventory.inStatsTitle')}
        open={inStatsOpen}
        onCancel={() => setInStatsOpen(false)}
        footer={null}
        {...getResponsiveModalConfig(isMobile, true, 800)}
      >
        <div style={getModalTheme().content as React.CSSProperties}>
        {/* 入库总体统计 */}
        <div style={{ 
          marginBottom: 16, 
          padding: 16, 
          background: '#f8f9fa', 
          borderRadius: 8,
          border: '1px solid #e9ecef'
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#495057', marginBottom: 8 }}>
            {t('inventory.inSummary')}
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: '#6c757d' }}>{t('inventory.totalRecords')}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#52c41a' }}>
                {inLogs.length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6c757d' }}>{t('inventory.totalInStock')}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#52c41a' }}>
                {inLogs.reduce((sum, log) => sum + Number(log.quantity || 0), 0)} {t('inventory.sticks')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6c757d' }}>{t('inventory.totalValue')}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#52c41a' }}>
                RM{inLogs.reduce((sum, log) => sum + (Number(log.quantity || 0) * Number((log as any).unitPrice || 0)), 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* 品牌入库统计表格 */}
        <Table
          dataSource={inStats}
          rowKey="brand"
          pagination={false}
          size="small"
          expandable={{
            columnWidth: 60,
            columnTitle: (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  if (inStatsExpandedKeys.length > 0) {
                    setInStatsExpandedKeys([])
                  } else {
                    setInStatsExpandedKeys(inStats.map(s => s.brand))
                  }
                }}
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: '1px solid #d9d9d9',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#666',
                  lineHeight: 1,
                  minWidth: 28,
                  height: 28
                }}
                title={inStatsExpandedKeys.length > 0 ? t('inventory.collapseAll') : t('inventory.expandAll')}
              >
                {inStatsExpandedKeys.length > 0 ? '-' : '+'}
              </button>
              </div>
            ),
            expandedRowKeys: inStatsExpandedKeys,
            onExpandedRowsChange: (keys) => setInStatsExpandedKeys([...keys]),
            expandedRowRender: (record: any) => (
              <Table
                dataSource={record.products}
                rowKey={(p: any) => p.cigar.id}
                pagination={false}
                size="small"
                showHeader={true}
                style={{ marginLeft: 20 }}
                columns={[
                  {
                    title: t('inventory.productName'),
                    dataIndex: 'cigar',
                    key: 'name',
                    render: (cigar: any) => (
                      <div style={{ paddingLeft: 8 }}>
                        <div style={{ fontWeight: 500 }}>{cigar.name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{cigar.specification || '-'}</div>
    </div>
                    )
                  },
                  {
                    title: t('inventory.inQuantity'),
                    dataIndex: 'quantity',
                    key: 'quantity',
                    width: 150,
                    align: 'right' as const,
                    render: (quantity: number) => (
                      <span style={{ color: '#52c41a' }}>{quantity} {t('inventory.sticks')}</span>
                    )
                  },
                  {
                    title: t('inventory.recordCount'),
                    dataIndex: 'records',
                    key: 'records',
                    width: 120,
                    align: 'center' as const,
                    render: (records: number) => <span>{records}</span>
                  },
                  {
                    title: t('inventory.totalValue'),
                    dataIndex: 'totalValue',
                    key: 'totalValue',
                    width: 150,
                    align: 'right' as const,
                    render: (value: number) => (
                      <span style={{ color: '#1890ff' }}>RM{value.toFixed(2)}</span>
                    )
                  }
                ]}
              />
            ),
            rowExpandable: (record: any) => record.products && record.products.length > 0,
        }}
        columns={[
            {
              title: t('inventory.brand'),
              dataIndex: 'brand',
              key: 'brand',
              render: (brand: string, record: any) => (
                <span style={{ fontWeight: 600 }}>
                  {brand} ({record.products?.length || 0} {t('inventory.products')})
                </span>
              )
            },
            {
              title: t('inventory.inQuantity'),
              dataIndex: 'quantity',
              key: 'quantity',
              width: 150,
              align: 'right' as const,
              render: (quantity: number) => (
                <span style={{ fontWeight: 600, color: '#52c41a' }}>{quantity} {t('inventory.sticks')}</span>
              )
            },
            {
              title: t('inventory.recordCount'),
              dataIndex: 'records',
              key: 'records',
              width: 120,
              align: 'center' as const,
              render: (records: number) => (
                <span>{records}</span>
              )
            },
            {
              title: t('inventory.totalValue'),
              dataIndex: 'totalValue',
              key: 'totalValue',
              width: 150,
              align: 'right' as const,
              render: (value: number) => (
                <span style={{ fontWeight: 600, color: '#1890ff' }}>RM{value.toFixed(2)}</span>
              )
            }
          ]}
        />
        </div>
      </Modal>

      {/* 出库统计弹窗 */}
      <Modal
        title={t('inventory.outStatsTitle')}
        open={outStatsOpen}
        onCancel={() => setOutStatsOpen(false)}
        footer={null}
        {...getResponsiveModalConfig(isMobile, true, 800)}
      >
        <div style={getModalTheme().content as React.CSSProperties}>
        {/* 出库总体统计 */}
        <div style={{ 
          marginBottom: 16, 
          padding: 16, 
          background: '#f8f9fa', 
          borderRadius: 8,
          border: '1px solid #e9ecef'
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#495057', marginBottom: 8 }}>
            {t('inventory.outSummary')}
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: '#6c757d' }}>{t('inventory.totalRecords')}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f5222d' }}>
                {outLogs.length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6c757d' }}>{t('inventory.totalOutStock')}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f5222d' }}>
                {outLogs.reduce((sum, log) => sum + Number(log.quantity || 0), 0)} {t('inventory.sticks')}
              </div>
            </div>
          </div>
        </div>

        {/* 品牌出库统计表格（可展开产品明细） */}
        <Table
          dataSource={outStats}
          rowKey="brand"
          pagination={false}
          size="small"
          expandable={{
            columnWidth: 60,
            columnTitle: (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    if (outStatsExpandedKeys.length > 0) {
                      setOutStatsExpandedKeys([])
                    } else {
                      setOutStatsExpandedKeys(outStats.map(s => s.brand))
                    }
                  }}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid #d9d9d9',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#666',
                    lineHeight: 1,
                    minWidth: 28,
                    height: 28
                  }}
                  title={outStatsExpandedKeys.length > 0 ? t('inventory.collapseAll') : t('inventory.expandAll')}
                >
                  {outStatsExpandedKeys.length > 0 ? '-' : '+'}
                </button>
              </div>
            ),
            expandedRowKeys: outStatsExpandedKeys,
            onExpandedRowsChange: (keys) => setOutStatsExpandedKeys([...keys]),
            expandedRowRender: (record: any) => (
              <Table
                dataSource={record.products}
                rowKey={(p: any) => p.cigar.id}
                pagination={false}
                size="small"
                showHeader={true}
                style={{ marginLeft: 20 }}
                columns={[
                  {
                    title: t('inventory.productName'),
                    dataIndex: 'cigar',
                    key: 'name',
                    render: (cigar: any) => (
                      <div style={{ paddingLeft: 8 }}>
                        <div style={{ fontWeight: 500 }}>{cigar.name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{cigar.specification || '-'}</div>
                      </div>
                    )
                  },
                  {
                    title: t('inventory.outQuantity'),
                    dataIndex: 'quantity',
                    key: 'quantity',
                    width: 150,
                    align: 'right' as const,
                    render: (quantity: number) => (
                      <span style={{ color: '#f5222d' }}>{quantity} {t('inventory.sticks')}</span>
                    )
                  },
                  {
                    title: t('inventory.recordCount'),
                    dataIndex: 'records',
                    key: 'records',
                    width: 120,
                    align: 'center' as const,
                    render: (records: number) => <span>{records}</span>
                  }
                ]}
              />
            ),
            rowExpandable: (record: any) => record.products && record.products.length > 0,
          }}
          columns={[
            {
              title: t('inventory.brand'),
              dataIndex: 'brand',
              key: 'brand',
              render: (brand: string, record: any) => (
                <span style={{ fontWeight: 600 }}>
                  {brand} ({record.products?.length || 0} {t('inventory.products')})
                </span>
              )
            },
            {
              title: t('inventory.outQuantity'),
              dataIndex: 'quantity',
              key: 'quantity',
              width: 150,
              align: 'right' as const,
              render: (quantity: number) => (
                <span style={{ fontWeight: 600, color: '#f5222d' }}>{quantity} {t('inventory.sticks')}</span>
              )
            },
            {
              title: t('inventory.recordCount'),
              dataIndex: 'records',
              key: 'records',
              width: 120,
              align: 'center' as const,
              render: (records: number) => (
                <span>{records}</span>
              )
            }
          ]}
        />
        </div>
      </Modal>
    </div>
  )
}

export default AdminInventory
