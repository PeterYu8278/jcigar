// 财务管理页面
import React, { useEffect, useState, useMemo } from 'react'
import { Table, Card, Row, Col, Statistic, Typography, DatePicker, Select, Button, Space, message, Modal, Form, InputNumber, Input, Spin } from 'antd'
import { DollarOutlined, ShoppingOutlined, CalendarOutlined, ArrowUpOutlined, ArrowDownOutlined, PlusOutlined, EyeOutlined, BarChartOutlined, PieChartOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons'
import type { Transaction, User } from '../../../types'
import { getAllTransactions, getAllOrders, getAllInventoryLogs, createTransaction, COLLECTIONS, getAllUsers, updateDocument, deleteDocument, getCigars } from '../../../services/firebase/firestore'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

const { Title } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

const AdminFinance: React.FC = () => {
  const { t } = useTranslation()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [cigars, setCigars] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<Transaction | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [editForm] = Form.useForm()
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  const [selectedDateRange, setSelectedDateRange] = useState<'week' | 'month' | 'year' | null>(null)
  const [productExpandedKeys, setProductExpandedKeys] = useState<React.Key[]>([])
  const [importing, setImporting] = useState(false)
  const [importRows, setImportRows] = useState<Array<{
    date: Date
    description: string
    income: number
    expense: number
  }>>([])

  const parseLooseDate = (raw: string): Date | null => {
    if (!raw) return null
    const s = String(raw).trim()
    let m = dayjs(s)
    if (m.isValid()) return m.toDate()
    const variants = [
      s.replace(/[.]/g, '-'),
      s.replace(/[.]/g, '/'),
      s.replace(/[\/]/g, '-'),
    ]
    for (const v of variants) {
      m = dayjs(v)
      if (m.isValid()) return m.toDate()
    }
    const dm = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/)
    if (dm) {
      const d = parseInt(dm[1], 10)
      const mo = parseInt(dm[2], 10)
      let y = parseInt(dm[3], 10)
      if (y < 100) y += 2000
      const dt = new Date(y, mo - 1, d)
      if (!isNaN(dt.getTime())) return dt
      const dt2 = new Date(y, d - 1, mo)
      if (!isNaN(dt2.getTime())) return dt2
    }
    const n = new Date(s)
    if (!isNaN(n.getTime())) return n
    return null
  }

  const handlePasteToRows = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData?.getData('text') || ''
    if (!text) return
    e.preventDefault()
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0)
    if (lines.length === 0) return
    const appended: Array<{ date: Date; description: string; income: number; expense: number }> = []
    for (const line of lines) {
      const parts = line.split(/[\t,]/).map(s => s.trim())
      const [dateStr, desc, incomeStr, expenseStr] = [
        parts[0],
        parts[1] || '',
        parts[2] || '0',
        parts[3] || '0'
      ]
      const d = parseLooseDate(dateStr)
      if (!d) continue
      appended.push({
        date: d,
        description: desc,
        income: Number(incomeStr) || 0,
        expense: Number(expenseStr) || 0,
      })
    }
    if (appended.length === 0) {
      message.warning(t('financeAdmin.noLinesToImport'))
      return
    }
    setImportRows(prev => [...prev, ...appended])
  }
  const [form] = Form.useForm()
  
  // 筛选状态
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  // 移除货币筛选

  const toDateSafe = (val: any): Date | null => {
    if (!val) return null
    try {
      let v: any = val
      if (v && typeof v.toDate === 'function') {
        v = v.toDate()
      }
      const d = v instanceof Date ? v : new Date(v)
      return isNaN(d.getTime()) ? null : d
    } catch (error) {
      console.warn('Invalid date value:', val, error)
      return null
    }
  }

  const formatYMD = (d: Date | null): string => {
    if (!d) return '-'
    try {
      return dayjs(d).format('YYYY-MM-DD')
    } catch (error) {
      console.warn('Invalid date format:', d, error)
      return '-'
    }
  }

  // 当viewing改变时，更新表单值
  useEffect(() => {
    if (viewing && editForm) {
      editForm.setFieldsValue({
        transactionDate: toDateSafe(viewing.createdAt) ? dayjs(toDateSafe(viewing.createdAt)) : dayjs(),
        incomeAmount: viewing.amount > 0 ? viewing.amount : 0,
        expenseAmount: viewing.amount < 0 ? Math.abs(viewing.amount) : 0,
        description: viewing.description,
        relatedId: viewing.relatedId || undefined,
        relatedOrders: (viewing as any)?.relatedOrders || [],
      })
      setIsEditing(false) // 重置编辑状态
    }
  }, [viewing, editForm])

  // 监听表单值变化用于统计显示
  const watchedIncomeAmount = Form.useWatch('incomeAmount', editForm) || 0
  const watchedExpenseAmount = Form.useWatch('expenseAmount', editForm) || 0
  const watchedRelatedOrders = Form.useWatch('relatedOrders', editForm) || []
  
  // 计算统计值
  const transactionAmount = Math.abs(watchedIncomeAmount - watchedExpenseAmount)
  const totalMatchedAmount = watchedRelatedOrders.reduce((sum: number, item: any) => sum + Number(item?.amount || 0), 0)
  const remainingAmount = transactionAmount - totalMatchedAmount

  // 计算订单匹配状态
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

  // 检查交易是否已全额配对
  const isTransactionFullyMatched = (transaction: Transaction) => {
    const relatedOrders = (transaction as any)?.relatedOrders || []
    if (relatedOrders.length === 0) return false
    
    const transactionAmount = Math.abs(Number(transaction.amount || 0))
    const totalMatchedAmount = relatedOrders.reduce((sum: number, ro: any) => {
      return sum + Number(ro.amount || 0)
    }, 0)
    
    return totalMatchedAmount >= transactionAmount
  }

  // 检查订单是否已全额匹配
  const isOrderFullyMatched = (orderId: string) => {
    const status = getOrderMatchStatus(orderId)
    return status.status === 'fully'
  }

  // 加载数据
  useEffect(() => {
    loadTransactions()
    ;(async () => {
      const [orderList, userList, cigarList] = await Promise.all([
        getAllOrders(),
        getAllUsers(),
        getCigars()
      ])
      setOrders(orderList || [])
      setUsers(userList || [])
      setCigars(cigarList || [])
    })()
  }, [])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const data = await getAllTransactions()
      setTransactions(data)
    } catch (error) {
      message.error(t('financeAdmin.loadTransactionsFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 删除交易记录
  const handleDeleteTransaction = async (transaction: Transaction) => {
    Modal.confirm({
      title: t('financeAdmin.deleteTransaction'),
      content: t('financeAdmin.deleteTransactionConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okType: 'danger',
      onOk: async () => {
        setLoading(true)
        try {
          const result = await deleteDocument(COLLECTIONS.TRANSACTIONS, transaction.id)
          if (result.success) {
            message.success(t('financeAdmin.transactionDeleted'))
            loadTransactions()
          } else {
            message.error(t('financeAdmin.deleteFailed'))
          }
        } finally {
          setLoading(false)
        }
      }
    })
  }

  // 筛选后的数据
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      if (!dateRange || !dateRange[0] || !dateRange[1]) return true
      const d = toDateSafe(transaction.createdAt)
      if (!d) return false
      return dayjs(d).isAfter(dateRange[0]) && dayjs(d).isBefore(dateRange[1])
    })
  }, [transactions, dateRange])

  // 拆分收入/支出字段并计算累计余额（基于时间顺序）
  const { enriched, balanceMap } = useMemo(() => {
    // 从下到上（当前显示顺序的末行开始）逐笔累加，满足“从下到上”的阅读累计方向
    let running = 0
    const idToBalance = new Map<string, number>()
    for (let i = filteredTransactions.length - 1; i >= 0; i--) {
      const tx = filteredTransactions[i]
      running += tx.amount
      idToBalance.set(tx.id, running)
    }
    const enrichedList = filteredTransactions.map(t => ({
      ...t,
      income: t.amount > 0 ? t.amount : 0,
      expense: t.amount < 0 ? Math.abs(t.amount) : 0,
    }))
    return { enriched: enrichedList, balanceMap: idToBalance }
  }, [filteredTransactions])

  const getAmountDisplay = (amount: number) => {
    const isIncome = amount > 0
    return (
      <span style={{ color: isIncome ? '#52c41a' : '#f5222d' }}>
        {isIncome ? '+' : ''}{Math.abs(amount)}
      </span>
    )
  }

  const columns = [
    {
      title: t('financeAdmin.transactionId'),
      dataIndex: 'id',
      key: 'id',
      width: 180,
      render: (id: string, record: Transaction) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', whiteSpace: 'normal' }}>
          {id}
          {isTransactionFullyMatched(record) && (
            <CheckOutlined style={{ marginLeft: 6, color: '#52c41a', fontSize: '14px' }} />
          )}
        </span>
      ),
    },
    {
      title: t('financeAdmin.transactionDate'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: any) => formatYMD(toDateSafe(date)),
      sorter: (a: any, b: any) => {
        const da = toDateSafe(a.createdAt)?.getTime() || 0
        const db = toDateSafe(b.createdAt)?.getTime() || 0
        return da - db
      },
    },
    {
      title: t('financeAdmin.description'),
      dataIndex: 'description',
      key: 'description',
    },
    // 移除类别与原始金额列，仅显示收入/支出与余额
    {
      title: t('financeAdmin.income'),
      dataIndex: 'income',
      key: 'income',
      render: (v: number) => (v > 0 ? <span style={{ color: '#52c41a' }}>+{Number(v).toFixed(2)}</span> : '0'),
      sorter: (a: any, b: any) => (a.income || 0) - (b.income || 0),
    },
    {
      title: t('financeAdmin.expense'),
      dataIndex: 'expense',
      key: 'expense',
      render: (v: number) => (v > 0 ? <span style={{ color: '#f5222d' }}>-{Number(v).toFixed(2)}</span> : '0'),
      sorter: (a: any, b: any) => (a.expense || 0) - (b.expense || 0),
    },
    {
      title: t('financeAdmin.balance'),
      key: 'balance',
      render: (_: any, record: any) => {
        const v = balanceMap.get(record.id) || 0
        const vf = Number(v)
        const text = vf >= 0 ? vf.toFixed(2) : `-${Math.abs(vf).toFixed(2)}`
        return <span style={{ fontWeight: 600 }}>{text}</span>
      },
      sorter: (a: any, b: any) => (balanceMap.get(a.id) || 0) - (balanceMap.get(b.id) || 0),
    },
    // 移除用户ID列和相关订单列
    
    
    {
      title: t('financeAdmin.actions'),
      key: 'action',
      render: (_: any, record: Transaction) => (
        <Space size="small" style={{ justifyContent: 'center', width: '100%' }}>
          <Button type="link" icon={<EyeOutlined />} size="small" onClick={() => setViewing(record)}>
          </Button>
        </Space>
      ),
    },
  ]

  // 计算统计数据（基于选中的日期范围）
  const filteredTransactionsForStats = useMemo(() => {
    if (!selectedDateRange) return filteredTransactions
    
    const now = dayjs()
    let startDate: dayjs.Dayjs
    
    switch (selectedDateRange) {
      case 'week':
        startDate = now.startOf('week')
        break
      case 'month':
        startDate = now.startOf('month')
        break
      case 'year':
        startDate = now.startOf('year')
        break
      default:
        return filteredTransactions
    }
    
    return filteredTransactions.filter(t => {
      const transactionDate = dayjs(t.createdAt)
      return transactionDate.isAfter(startDate) && transactionDate.isBefore(now.endOf('day'))
    })
  }, [filteredTransactions, selectedDateRange])

  // 统计数据
  const totalRevenue = filteredTransactionsForStats
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = Math.abs(filteredTransactionsForStats
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0))

  const netProfit = totalRevenue - totalExpenses

  // 计算品牌销量统计（只统计非取消状态的订单）
  const brandSalesStats = useMemo(() => {
    const brandMap = new Map<string, { quantity: number; amount: number }>()
    
    // 只统计非取消状态的订单
    const validOrders = orders.filter(order => order.status !== 'cancelled')
    
    validOrders.forEach(order => {
      const items = (order as any)?.items || []
      items.forEach((item: any) => {
        const cigar = cigars.find(c => c.id === item.cigarId)
        const brand = cigar?.brand || 'Unknown'
        const quantity = Number(item.quantity || 0)
        const amount = Number(item.quantity || 0) * Number(item.price || 0)
        
        const existing = brandMap.get(brand) || { quantity: 0, amount: 0 }
        brandMap.set(brand, {
          quantity: existing.quantity + quantity,
          amount: existing.amount + amount
        })
      })
    })
    
    const stats = Array.from(brandMap.entries())
      .map(([brand, data]) => ({ brand, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5) // Top 5 brands
    
    const maxQuantity = Math.max(...stats.map(s => s.quantity), 1)
    
    return stats.map(stat => ({
      ...stat,
      percentage: (stat.quantity / maxQuantity) * 100
    }))
  }, [orders, cigars])

  // 计算选中品牌的产品详情（只统计非取消状态的订单）
  const brandProductDetails = useMemo(() => {
    if (!selectedBrand) return []
    
    const productMap = new Map<string, { 
      cigar: any; 
      quantity: number; 
      amount: number; 
      orders: number;
      orderRecords: Array<{ orderId: string; orderDate: string; quantity: number; amount: number; userName: string; status: string }>
    }>()
    
    // 只统计非取消状态的订单
    const validOrders = orders.filter(order => order.status !== 'cancelled')
    
    validOrders.forEach(order => {
      const items = (order as any)?.items || []
      items.forEach((item: any) => {
        const cigar = cigars.find(c => c.id === item.cigarId)
        if (cigar && cigar.brand === selectedBrand) {
          const quantity = Number(item.quantity || 0)
          const amount = Number(item.quantity || 0) * Number(item.price || 0)
          const user = users.find(u => u.id === order.userId)
          const userName = user?.displayName || user?.email || order.userId
          
          const existing = productMap.get(item.cigarId) || { 
            cigar, 
            quantity: 0, 
            amount: 0, 
            orders: 0,
            orderRecords: []
          }
          
          productMap.set(item.cigarId, {
            cigar,
            quantity: existing.quantity + quantity,
            amount: existing.amount + amount,
            orders: existing.orders + 1,
            orderRecords: [
              ...existing.orderRecords,
              {
                orderId: order.id,
                orderDate: order.createdAt as string,
                quantity,
                amount,
                userName,
                status: order.status
              }
            ]
          })
        }
      })
    })
    
    return Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
  }, [selectedBrand, orders, cigars, users])

  // 已移除类别统计

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent', paddingInline: 0, marginBottom: 12 }}>{t('financeAdmin.title')}</h1>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ flex: 1 }} />
        <Space>
          <Button 
            icon={<BarChartOutlined />}
            onClick={() => {
              // TODO: 实现财务报表功能
              message.info(t('financeAdmin.financialReportDeveloping'))
            }}
          >
            {t('financeAdmin.financialReport')}
          </Button>
          <Button 
            icon={<PieChartOutlined />}
            onClick={() => {
              // TODO: 实现收入分析功能
              message.info(t('financeAdmin.revenueAnalysisDeveloping'))
            }}
          >
            {t('financeAdmin.revenueAnalysis')}
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreating(true)}
            style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }}
          >
            {t('financeAdmin.addTransaction')}
          </Button>
        </Space>
      </div>

      {/* 自定义标签 */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(244,175,37,0.2)', marginBottom: 24 }}>
        {(['overview', 'transactions'] as const).map((tabKey) => {
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
              style={{ ...baseStyle, ...(isActive ? activeStyle : inactiveStyle) }}
              onClick={() => setActiveTab(tabKey)}
            >
              {t(`financeAdmin.${tabKey}`)}
            </button>
          )
        })}
      </div>

      {/* 概况标签内容 */}
      {activeTab === 'overview' && (
        <>
          {/* 统计卡片 - Glassmorphism风格 */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)': 'repeat(3, 1fr)',
            gap: 16, 
            marginBottom: 24 
          }}>
            {/* 总收入卡片 */}
            <div style={{ 
              padding: isMobile ? 12 : 24, 
              borderRadius: 12, 
              background: isMobile ? 'rgba(255,255,255,0.05)' : 'rgba(57, 51, 40, 0.5)', 
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: isMobile ? 'none' : '1px solid rgba(244, 175, 37, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              textAlign: isMobile ? 'center' : 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: isMobile ? 'center' : 'flex-start' }}>
                <DollarOutlined style={{ color: '#f4af25', fontSize: 20 }} />
                <span style={{ color: isMobile ? '#A0A0A0' : '#fff', fontSize: isMobile ? 12 : 16, fontWeight: 500 }}>{t('financeAdmin.totalRevenue')}</span>
              </div>
              <div style={{ 
                color: isMobile ? 'transparent' : '#fff', 
                fontSize: isMobile ? 24 : 32, 
                fontWeight: 700, 
                letterSpacing: '-0.5px',
                backgroundImage: isMobile ? 'linear-gradient(to right,#FDE08D,#C48D3A)' : 'none',
                WebkitBackgroundClip: isMobile ? 'text' : 'initial'
              }}>
                RM{totalRevenue.toFixed(2)}
              </div>
            </div>

            {/* 总支出卡片 */}
            <div style={{ 
              padding: isMobile ? 12 : 24, 
              borderRadius: 12, 
              background: isMobile ? 'rgba(255,255,255,0.05)' : 'rgba(57, 51, 40, 0.5)', 
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: isMobile ? 'none' : '1px solid rgba(244, 175, 37, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              textAlign: isMobile ? 'center' : 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: isMobile ? 'center' : 'flex-start' }}>
                <ShoppingOutlined style={{ color: '#f4af25', fontSize: 20 }} />
                <span style={{ color: isMobile ? '#A0A0A0' : '#fff', fontSize: isMobile ? 12 : 16, fontWeight: 500 }}>{t('financeAdmin.totalExpenses')}</span>
              </div>
              <div style={{ 
                color: isMobile ? 'transparent' : '#fff', 
                fontSize: isMobile ? 24 : 32, 
                fontWeight: 700, 
                letterSpacing: '-0.5px',
                backgroundImage: isMobile ? 'linear-gradient(to right,#FDE08D,#C48D3A)' : 'none',
                WebkitBackgroundClip: isMobile ? 'text' : 'initial'
              }}>
                RM{totalExpenses.toFixed(2)}
              </div>
            </div>

            {/* 净利润卡片 */}
            <div style={{ 
              padding: isMobile ? 12 : 24, 
              borderRadius: 12, 
              background: isMobile ? 'rgba(255,255,255,0.05)' : 'rgba(57, 51, 40, 0.5)', 
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: isMobile ? 'none' : '1px solid rgba(244, 175, 37, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              textAlign: isMobile ? 'center' : 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: isMobile ? 'center' : 'flex-start' }}>
                {netProfit >= 0 ? <ArrowUpOutlined style={{ color: '#f4af25', fontSize: 20 }} /> : <ArrowDownOutlined style={{ color: '#f4af25', fontSize: 20 }} />}
                <span style={{ color: isMobile ? '#A0A0A0' : '#fff', fontSize: isMobile ? 12 : 16, fontWeight: 500 }}>{t('financeAdmin.netProfit')}</span>
              </div>
              <div style={{ 
                color: isMobile ? 'transparent' : '#fff', 
                fontSize: isMobile ? 24 : 32, 
                fontWeight: 700, 
                letterSpacing: '-0.5px',
                backgroundImage: isMobile ? 'linear-gradient(to right,#FDE08D,#C48D3A)' : 'none',
                WebkitBackgroundClip: isMobile ? 'text' : 'initial'
              }}>
                RM{netProfit.toFixed(2)}
              </div>
              <div style={{ 
                color: isMobile ? '#A0A0A0' : (netProfit >= 0 ? '#0bda19' : '#fa3f38'), 
                fontSize: isMobile ? 12 : 16, 
                fontWeight: 500 
              }}>
                {netProfit >= 0 ? '+' : ''}{totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>

          {/* 日期范围选择器 */}
          <div style={{ 
            display: 'flex', 
            gap: isMobile ? 8 : 12, 
            marginBottom: 24, 
            overflowX: 'auto', 
            paddingBottom: 4,
            justifyContent: isMobile ? 'center' : 'flex-start'
          }}>
            <button 
              onClick={() => setSelectedDateRange(null)}
              style={{
                height: isMobile ? 28 : 32,
                padding: isMobile ? '0 12px' : '0 16px',
                borderRadius: isMobile ? 14 : 16,
                background: !selectedDateRange ? 'rgba(244, 175, 37, 0.2)' : 'rgba(57, 51, 40, 0.5)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: !selectedDateRange ? 'none' : '1px solid rgba(244, 175, 37, 0.2)',
                color: !selectedDateRange ? '#f4af25' : '#fff',
                fontSize: isMobile ? 12 : 14,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {t('financeAdmin.allTime')}
            </button>
            <button 
              onClick={() => setSelectedDateRange('week')}
              style={{
                height: isMobile ? 28 : 32,
                padding: isMobile ? '0 12px' : '0 16px',
                borderRadius: isMobile ? 14 : 16,
                background: selectedDateRange === 'week' ? 'rgba(244, 175, 37, 0.2)' : 'rgba(57, 51, 40, 0.5)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: selectedDateRange === 'week' ? 'none' : '1px solid rgba(244, 175, 37, 0.2)',
                color: selectedDateRange === 'week' ? '#f4af25' : '#fff',
                fontSize: isMobile ? 12 : 14,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {t('financeAdmin.thisWeek')}
            </button>
            <button 
              onClick={() => setSelectedDateRange('month')}
              style={{
                height: isMobile ? 28 : 32,
                padding: isMobile ? '0 12px' : '0 16px',
                borderRadius: isMobile ? 14 : 16,
                background: selectedDateRange === 'month' ? 'rgba(244, 175, 37, 0.2)' : 'rgba(57, 51, 40, 0.5)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: selectedDateRange === 'month' ? 'none' : '1px solid rgba(244, 175, 37, 0.2)',
                color: selectedDateRange === 'month' ? '#f4af25' : '#fff',
                fontSize: isMobile ? 12 : 14,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {t('financeAdmin.thisMonth')}
            </button>
            <button 
              onClick={() => setSelectedDateRange('year')}
              style={{
                height: isMobile ? 28 : 32,
                padding: isMobile ? '0 12px' : '0 16px',
                borderRadius: isMobile ? 14 : 16,
                background: selectedDateRange === 'year' ? 'rgba(244, 175, 37, 0.2)' : 'rgba(57, 51, 40, 0.5)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: selectedDateRange === 'year' ? 'none' : '1px solid rgba(244, 175, 37, 0.2)',
                color: selectedDateRange === 'year' ? '#f4af25' : '#fff',
                fontSize: isMobile ? 12 : 14,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {t('financeAdmin.thisYear')}
            </button>
          </div>

          {/* 品牌销量图表 */}
          <div style={{ 
            padding: 24, 
            borderRadius: 12, 
            background: 'rgba(57, 51, 40, 0.5)', 
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(244, 175, 37, 0.2)',
            marginBottom: 24
          }}>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {t('financeAdmin.brandSalesChart')}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 14, marginBottom: 24 }}>
              {t('financeAdmin.top5Brands')}
            </div>
            
            {brandSalesStats.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {brandSalesStats.map((stat, index) => (
                  <div 
                    key={stat.brand}
                    onClick={() => setSelectedBrand(stat.brand)}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                        {index + 1}. {stat.brand}
                      </span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 }}>
                        {stat.quantity} {t('financeAdmin.pieces')} · RM{stat.amount.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: 8, 
                      background: 'rgba(244, 175, 37, 0.1)', 
                      borderRadius: 4,
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${stat.percentage}%`, 
                        height: '100%', 
                        background: `linear-gradient(to right, ${
                          index === 0 ? '#f4af25' : 
                          index === 1 ? '#d28e19' : 
                          index === 2 ? '#b87315' : 
                          index === 3 ? '#a0680a' : '#8a5a08'
                        }, ${
                          index === 0 ? '#d28e19' : 
                          index === 1 ? '#b87315' : 
                          index === 2 ? '#a0680a' : 
                          index === 3 ? '#8a5a08' : '#6f4706'
                        })`,
                        borderRadius: 4,
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                height: 180, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'rgba(244, 175, 37, 0.05)',
                borderRadius: 8,
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: 14
              }}>
                {t('financeAdmin.noSalesData')}
              </div>
            )}
          </div>
        </>
      )}

      {/* 交易记录标签内容 */}
      {activeTab === 'transactions' && (
        <>
      {/* 筛选器 */}
      <div style={{ marginBottom: 16, padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
        <Space size="middle" wrap>
          <RangePicker 
            placeholder={[t('financeAdmin.startDate'), t('financeAdmin.endDate')]}
            value={dateRange}
            onChange={setDateRange}
          />
          {/* 移除交易类别筛选 */}
          {/* 移除货币筛选 */}
          <Button 
            onClick={() => {
              setDateRange(null)
              
            }}
          >
            {t('financeAdmin.resetFilters')}
          </Button>
          <Button 
            onClick={() => {
              const header = ['id','income','expense','description','transactionDate']
              const rows = filteredTransactions.map(t => [
                t.id,
                t.amount > 0 ? t.amount : 0,
                t.amount < 0 ? Math.abs(t.amount) : 0,
                t.description,
                dayjs(t.createdAt).format('YYYY-MM-DD HH:mm')
              ])
              const csv = [header.join(','), ...rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g,'""')}"`).join(','))].join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'transactions.csv'
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            {t('financeAdmin.exportReport')}
          </Button>
          <Button onClick={() => setImporting(true)}>
            {t('financeAdmin.pasteImport')}
          </Button>
        </Space>
      </div>

      {!isMobile ? (
      <Table
        columns={columns}
          dataSource={enriched}
        rowKey="id"
        loading={loading}
        pagination={{
            total: enriched.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => t('common.paginationTotal', { start: range[0], end: range[1], total }),
        }}
      />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {enriched.map((transaction: any) => (
            <div key={transaction.id} style={{
              display: 'flex',
              alignItems: 'center',
              padding: 12,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(0,0,0,0.06)'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {transaction.id}
                    {isTransactionFullyMatched(transaction) && (
                      <CheckOutlined style={{ marginLeft: 6, color: '#52c41a', fontSize: '14px' }} />
                    )}
                  </div>
                  <div style={{ color: '#999', fontSize: 12 }}>{formatYMD(toDateSafe(transaction.createdAt))}</div>
                </div>
                <div style={{ marginTop: 6, color: '#666', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {transaction.description}
                </div>
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                  <div style={{ 
                    color: transaction.amount >= 0 ? '#52c41a' : '#ff4d4f',
                    fontWeight: 600 
                  }}>
                    {transaction.amount >= 0 ? '+' : ''}{transaction.amount.toFixed(2)}
                  </div>
                  <div style={{ color: '#666' }}>
                    {t('financeAdmin.balance')}: RM{(balanceMap.get(transaction.id) || 0).toFixed(2)}
                  </div>
                </div>
              </div>
              <Button 
                type="link" 
                icon={<EyeOutlined />} 
                size="small" 
                onClick={() => setViewing(transaction)}
                style={{ marginLeft: 8 }}
              />
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* 交易详情（可编辑） */}
      <Modal
        title={t('financeAdmin.transactionDetails')}
        open={!!viewing}
        onCancel={() => {
          setViewing(null)
          setIsEditing(false)
        }}
        footer={[
          <button key="cancel" type="button" onClick={() => {
            setViewing(null)
            setIsEditing(false)
          }} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #d9d9d9', background: '#fff', cursor: 'pointer' }}>
            {t('common.cancel')}
          </button>,
          <button key="delete" type="button" onClick={() => viewing && handleDeleteTransaction(viewing)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #ff4d4f', background: '#fff', color: '#ff4d4f', cursor: 'pointer' }}>
            {t('common.delete')}
          </button>,
          !isEditing ? (
            <button key="edit" type="button" className="cigar-btn-gradient" onClick={() => setIsEditing(true)} style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>
              {t('common.edit')}
            </button>
          ) : (
            <button key="save" type="button" className="cigar-btn-gradient" onClick={() => editForm.submit()} style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>
              {t('common.save')}
            </button>
          )
        ]}
        width={960}
        destroyOnHidden
        centered
        styles={{
          body: {
            background: 'rgba(255,255, 255)',
            maxHeight: '80vh',
            overflow: 'auto'
          },
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
          content: {
            background: 'rgba(255,255, 255)',
            border: '1px solid rgba(255, 215, 0, 0.2)'
          }
        }}
      >
        {viewing && (
          <Form
            form={editForm}
            layout="horizontal"
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            onFinish={async (values: any) => {
              setLoading(true)
              try {
                const income = Number(values.incomeAmount || 0)
                const expense = Number(values.expenseAmount || 0)
                if (income <= 0 && expense <= 0) {
                  message.error(t('financeAdmin.enterIncomeOrExpense'))
                  return
                }
                const amount = income - expense
                // 校验relatedOrders分配总额
                const ro: Array<{ orderId: string; amount: number }> = Array.isArray(values.relatedOrders) ? values.relatedOrders.filter((r: any) => r?.orderId && Number(r?.amount) > 0).map((r: any) => ({ orderId: String(r.orderId), amount: Number(r.amount) })) : []
                const roSum = ro.reduce((s, r) => s + r.amount, 0)
                const absTx = Math.abs(amount)
                if (roSum > absTx) {
                  message.error(t('financeAdmin.relatedOrdersExceed'))
                  return
                }
                const updated = {
                  amount,
                  description: values.description,
                  relatedId: values.relatedId || undefined,
                  relatedOrders: ro.length ? ro : undefined,
                  createdAt: values.transactionDate ? (dayjs(values.transactionDate).toDate()) : new Date()
                }
                await updateDocument(COLLECTIONS.TRANSACTIONS, viewing.id, updated as any)
                message.success(t('financeAdmin.updated'))
                setIsEditing(false)
                loadTransactions()
              } finally {
                setLoading(false)
              }
            }}
          >
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 360, minWidth: 320 }}>
                <Form.Item label={t('financeAdmin.transactionDate')} name="transactionDate" rules={[{ required: true, message: t('financeAdmin.selectTransactionDate') }]}> 
                  <DatePicker style={{ width: '100%' }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item label={t('financeAdmin.income')} name="incomeAmount">
                  <InputNumber style={{ width: '100%' }} min={0} disabled={!isEditing} />
                </Form.Item>
                <Form.Item label={t('financeAdmin.expense')} name="expenseAmount">
                  <InputNumber style={{ width: '100%' }} min={0} disabled={!isEditing} />
                </Form.Item>
                <Form.Item label={t('financeAdmin.description')} name="description" rules={[{ required: true, message: t('financeAdmin.enterDescription') }]}> 
                  <Input.TextArea rows={3} disabled={!isEditing} />
                </Form.Item>
              </div>
              <div style={{ flex: 1, minWidth: 380 }}>
                <Form.List name="relatedOrders">
                  {(fields, { add, remove }) => (
                    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, background: '#fafafa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <strong>{t('financeAdmin.relatedOrders')}</strong>
                        {isEditing && (
                          <button type="button" onClick={() => add({ orderId: undefined, amount: 0 })} className="cigar-btn-gradient" style={{ padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>{t('common.add')}</button>
                        )}
                      </div>
                      {fields.length === 0 && (
                        <div style={{ color: '#999' }}>{t('common.noData')}</div>
                      )}
                      {fields.map((field, index) => (
                        <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                          <Form.Item name={[field.name, 'orderId']} style={{ marginBottom: 0, flex: 1 }}>
                            <Select
                              allowClear
                              showSearch
                              placeholder={t('financeAdmin.relatedOrderId')}
                              disabled={!isEditing}
                              filterOption={(input, option) => {
                                const searchText = (input || '').toLowerCase()
                                const searchableText = (option as any)?.searchText || ''
                                return searchableText.toLowerCase().includes(searchText)
                              }}
                              options={(orders || [])
                                .filter(o => !isOrderFullyMatched(o.id))
                                .map(o => {
                                const u = (users || []).find((x: any) => x.id === o.userId)
                                const name = u?.displayName || u?.email || o.userId
                                const addr = (o as any)?.shipping?.address || '-'
                                const total = Number((o as any)?.total || 0)
                                const searchText = `${o.id} ${name} ${addr} ${total.toFixed(2)}`
                                return { 
                                  label: (
          <div>
                                      <div>{o.id} · {name} · RM{total.toFixed(2)}</div>
                                      <div style={{ fontSize: '12px', color: '#666' }}>{addr}</div>
          </div>
                                  ), 
                                  value: o.id,
                                  searchText
                                }
                              })}
                              onChange={(val) => {
                                const arr = Array.isArray(editForm.getFieldValue('relatedOrders')) ? [...editForm.getFieldValue('relatedOrders')] : []
                                const order = (orders || []).find((o: any) => o.id === val)
                                const defaultAmt = Number((order as any)?.total || 0)
                                arr[field.name] = { ...(arr[field.name] || {}), orderId: val, amount: defaultAmt }
                                editForm.setFieldsValue({ relatedOrders: arr })
                              }}
                            />
                          </Form.Item>
                          <Form.Item name={[field.name, 'amount']} style={{ marginBottom: 0, width: 120 }}>
                            <InputNumber min={0} step={0.01} style={{ width: '100%' }} disabled={!isEditing} />
                          </Form.Item>
                          {isEditing && (
                            <button type="button" onClick={() => remove(field.name)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d9d9d9', background: '#fff', cursor: 'pointer' }}>{t('common.remove')}</button>
                          )}
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 12, color: '#666' }}>
                        {t('financeAdmin.relatedOrdersHint')}
                      </div>
                      {/* 添加统计信息 */}
                      {(() => {
                        const exceeded = totalMatchedAmount > transactionAmount
                        const boxStyle: React.CSSProperties = exceeded
                          ? {
                              marginTop: 12,
                              padding: 8,
                              background: '#fff1f0',
                              borderRadius: 4,
                              border: '1px solid #ffa39e'
                            }
                          : {
                              marginTop: 12,
                              padding: 8,
                              background: '#f0f0f0',
                              borderRadius: 4
                            }
                        const titleStyle: React.CSSProperties = exceeded
                          ? { fontSize: 12, color: '#cf1322', marginBottom: 4, fontWeight: 600 }
                          : { fontSize: 12, color: '#666', marginBottom: 4 }
                        const textStyle: React.CSSProperties = exceeded
                          ? { fontSize: 11, color: '#cf1322', fontWeight: 600 }
                          : { fontSize: 11, color: '#333' }
                        return (
                          <div style={boxStyle}>
                            <div style={titleStyle}>
                              {t('financeAdmin.relatedOrdersStats')}
                              {exceeded ? ` · ${t('financeAdmin.relatedOrdersExceed')}` : ':'}
                            </div>
                            <div style={textStyle}>
                              <div>{t('financeAdmin.totalMatchedAmount')}: RM{totalMatchedAmount.toFixed(2)}</div>
                              <div>{t('financeAdmin.transactionAmount')}: RM{transactionAmount.toFixed(2)}</div>
                              <div>{t('financeAdmin.remainingAmount')}: RM{remainingAmount.toFixed(2)}</div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </Form.List>
              </div>
          </div>
          </Form>
        )}
      </Modal>

      {/* 添加交易 */}
      <Modal
        title={t('financeAdmin.addTransaction')}
        open={creating}
        onCancel={() => setCreating(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={async (values: any) => {
          setLoading(true)
          try {
            const income = Number(values.incomeAmount || 0)
            const expense = Number(values.expenseAmount || 0)
            if (income <= 0 && expense <= 0) {
              message.error(t('financeAdmin.enterIncomeOrExpense'))
              return
            }
            const amount = income - expense
            const transactionData = {
              type: undefined as any,
              amount,
              currency: undefined,
              description: values.description,
              relatedId: values.relatedId || undefined,
              createdAt: values.transactionDate ? (dayjs(values.transactionDate).toDate()) : new Date()
            }
            const result = await createTransaction(transactionData)
            if (result.success) {
              message.success(t('financeAdmin.transactionAdded'))
              loadTransactions()
              setCreating(false)
              form.resetFields()
            } else {
              message.error(t('financeAdmin.addFailed'))
            }
          } finally {
            setLoading(false)
          }
        }}>
          <Form.Item label={t('financeAdmin.transactionDate')} name="transactionDate" initialValue={dayjs()} rules={[{ required: true, message: t('financeAdmin.selectTransactionDate') }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label={t('financeAdmin.income')} name="incomeAmount">
            <InputNumber style={{ width: '100%' }} placeholder={t('financeAdmin.enterIncomeAmount')} min={0} />
          </Form.Item>
          <Form.Item label={t('financeAdmin.expense')} name="expenseAmount">
            <InputNumber style={{ width: '100%' }} placeholder={t('financeAdmin.enterExpenseAmount')} min={0} />
          </Form.Item>
          {/* 移除货币选择 */}
          <Form.Item label={t('financeAdmin.description')} name="description" rules={[{ required: true, message: t('financeAdmin.enterDescription') }]}>
            <Input.TextArea rows={3} placeholder={t('financeAdmin.enterDescription')} />
          </Form.Item>
          <Form.Item label={t('financeAdmin.relatedOrder')} name="relatedId">
            <Select
              allowClear
              showSearch
              placeholder={t('financeAdmin.relatedOrderId')}
              filterOption={(input, option) => {
                const searchText = (input || '').toLowerCase()
                const searchableText = (option as any)?.searchText || ''
                return searchableText.toLowerCase().includes(searchText)
              }}
              options={(orders || []).map(o => {
                const u = (users || []).find((x: any) => x.id === o.userId)
                const name = u?.displayName || u?.email || o.userId
                const addr = (o as any)?.shipping?.address || '-'
                const total = Number((o as any)?.total || 0)
                const searchText = `${o.id} ${name} ${addr} ${total.toFixed(2)}`
                return { 
                  label: (
                    <div>
                      <div>{o.id} · {name} · RM{total.toFixed(2)}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{addr}</div>
                    </div>
                  ), 
                  value: o.id,
                  searchText
                }
              })}
            />
          </Form.Item>
          {/* 移除用户ID输入 */}
        </Form>
      </Modal>

      {/* 粘贴导入交易（表格预览编辑） */}
      <Modal
        title={t('financeAdmin.pasteImportTitle')}
        open={importing}
        onCancel={() => setImporting(false)}
        width={1000}
        onOk={async () => {
          if (!importRows || importRows.length === 0) {
            message.warning(t('financeAdmin.noLinesToImport'))
            return
          }
          setLoading(true)
          let success = 0
          let failed = 0
          for (const r of importRows) {
            const income = Number(r.income ?? 0)
            const expense = Number(r.expense ?? 0)
            if (!isFinite(income) || !isFinite(expense) || (income <= 0 && expense <= 0) || (income > 0 && expense > 0)) {
              failed++
              continue
            }
            const isIncome = income > 0
            const amount = isIncome ? income : expense
            const parsedDate = dayjs(r.date).isValid() ? dayjs(r.date).toDate() : new Date()
            const payload = {
              type: isIncome ? 'income' : 'expense',
              amount: Number(amount),
              currency: 'MYR',
              description: (r.description || '').trim(),
              createdAt: parsedDate,
            } as any
            const res = await createTransaction(payload)
            if (res.success) success++; else failed++
          }
          setLoading(false)
          message.success(t('financeAdmin.importResult', { success, failed }))
          setImporting(false)
          
          setImportRows([])
          loadTransactions()
        }}
        confirmLoading={loading}
      >
        <p style={{ marginBottom: 8 }}>{t('financeAdmin.pasteImportHint')}</p>
        <p style={{ marginTop: 0, color: '#999' }}>{t('financeAdmin.pasteImportFormat')}</p>
        <div
          onPaste={handlePasteToRows}
          tabIndex={0}
          style={{
            border: '1px dashed #d9d9d9',
            padding: 12,
            borderRadius: 6,
            marginBottom: 12,
            outline: 'none',
            background: '#fafafa'
          }}
        >
          {t('financeAdmin.pasteHere')}
    </div>
        <Table
          dataSource={importRows.map((r, idx) => ({ key: idx, date: r.date, description: r.description, income: r.income, expense: r.expense }))}
          size="small"
          pagination={{ pageSize: 5 }}
          columns={[
            {
              title: t('financeAdmin.transactionDate'),
              dataIndex: 'date',
              key: 'date',
              render: (_: any, record: any, index: number) => (
                <DatePicker
                  value={dayjs(record.date)}
                  onChange={(d) => {
                    const next = [...importRows]
                    next[index] = { ...next[index], date: (d ? d.toDate() : new Date()) }
                    setImportRows(next)
                  }}
                />
              )
            },
            {
              title: t('financeAdmin.description'),
              dataIndex: 'description',
              key: 'description',
              render: (v: string, record: any, index: number) => (
                <Input
                  value={v}
                  onChange={(e) => {
                    const next = [...importRows]
                    next[index] = { ...next[index], description: e.target.value }
                    setImportRows(next)
                  }}
                />
              )
            },
            {
              title: t('financeAdmin.income'),
              dataIndex: 'income',
              key: 'income',
              width: 120,
              render: (v: number, record: any, index: number) => (
                <InputNumber
                  min={0}
                  value={v}
                  onChange={(val) => {
                    const next = [...importRows]
                    next[index] = { ...next[index], income: Number(val || 0) }
                    setImportRows(next)
                  }}
                />
              )
            },
            {
              title: t('financeAdmin.expense'),
              dataIndex: 'expense',
              key: 'expense',
              width: 120,
              render: (v: number, record: any, index: number) => (
                <InputNumber
                  min={0}
                  value={v}
                  onChange={(val) => {
                    const next = [...importRows]
                    next[index] = { ...next[index], expense: Number(val || 0) }
                    setImportRows(next)
                  }}
                />
              )
            },
            // 移除用户ID列和相关订单列
            {
              title: t('financeAdmin.actions'),
              key: 'actions',
              width: 90,
              render: (_: any, __: any, index: number) => (
                <Button danger onClick={() => setImportRows(prev => prev.filter((_, i) => i !== index))}>{t('common.delete')}</Button>
              )
            },
          ]}
        />
      </Modal>

      {/* 品牌产品详情弹窗 */}
      <Modal
        title={`${selectedBrand} - ${t('financeAdmin.productSalesDetails')}`}
        open={!!selectedBrand}
        onCancel={() => setSelectedBrand(null)}
        footer={null}
        width={isMobile ? '100%' : 800}
        destroyOnHidden
        centered
        styles={{
          body: {
            background: 'rgba(255,255, 255)',
            maxHeight: isMobile ? '80vh' : '70vh',
            overflow: 'auto'
          },
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
          content: {
            background: 'rgba(255,255, 255)',
            border: '1px solid rgba(255, 215, 0, 0.2)',
            margin: isMobile ? '0 12px' : 'auto'
          }
        }}
      >
        {selectedBrand && (
          <>
            {/* 品牌统计摘要 */}
            <div style={{ 
              marginBottom: 16, 
              padding: isMobile ? 12 : 16, 
              background: '#f8f9fa', 
              borderRadius: 8,
              border: '1px solid #e9ecef'
            }}>
              <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600, color: '#495057', marginBottom: 8 }}>
                {t('financeAdmin.brandSummary')}
              </div>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: isMobile ? 12 : 24 
              }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>{t('financeAdmin.totalProducts')}</div>
                  <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: '#1890ff' }}>
                    {brandProductDetails.length}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>{t('financeAdmin.totalQuantity')}</div>
                  <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: '#1890ff' }}>
                    {brandProductDetails.reduce((sum, p) => sum + p.quantity, 0)} {t('financeAdmin.pieces')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>{t('financeAdmin.totalSales')}</div>
                  <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: '#1890ff' }}>
                    RM{brandProductDetails.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* 产品详情 - 桌面端表格/移动端卡片 */}
            {!isMobile ? (
              <Table
                dataSource={brandProductDetails}
                rowKey={(record) => record.cigar.id}
                pagination={false}
                size="small"
                expandable={{
                  columnWidth: 60,
                  columnTitle: (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button
                        onClick={() => {
                          if (productExpandedKeys.length > 0) {
                            setProductExpandedKeys([])
                          } else {
                            setProductExpandedKeys(brandProductDetails.map(p => p.cigar.id))
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 600,
                          color: '#1890ff',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {productExpandedKeys.length > 0 ? '−' : '+'}
                      </button>
                    </div>
                  ),
                  expandedRowKeys: productExpandedKeys,
                  onExpandedRowsChange: (keys) => setProductExpandedKeys([...keys]),
                  expandedRowRender: (record) => (
                    <div style={{ padding: '8px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#495057' }}>
                        {t('financeAdmin.orderRecords')}
                      </div>
                      <Table
                        dataSource={record.orderRecords}
                        rowKey={(r) => `${r.orderId}-${r.orderDate}`}
                        pagination={false}
                        size="small"
                        columns={[
                          {
                            title: t('financeAdmin.orderId'),
                            dataIndex: 'orderId',
                            key: 'orderId',
                            width: 200,
                            render: (id: string) => <span style={{ fontSize: 12 }}>{id}</span>
                          },
                          {
                            title: t('financeAdmin.orderDate'),
                            dataIndex: 'orderDate',
                            key: 'orderDate',
                            width: 150,
                            render: (date: string) => <span style={{ fontSize: 12 }}>{formatYMD(toDateSafe(date))}</span>
                          },
                          {
                            title: t('financeAdmin.customerName'),
                            dataIndex: 'userName',
                            key: 'userName',
                            width: 150,
                            render: (name: string) => <span style={{ fontSize: 12 }}>{name}</span>
                          },
                          {
                            title: t('financeAdmin.quantity'),
                            dataIndex: 'quantity',
                            key: 'quantity',
                            width: 100,
                            align: 'right' as const,
                            render: (qty: number) => <span style={{ fontSize: 12 }}>{qty} {t('financeAdmin.pieces')}</span>
                          },
                          {
                            title: t('financeAdmin.amount'),
                            dataIndex: 'amount',
                            key: 'amount',
                            width: 120,
                            align: 'right' as const,
                            render: (amt: number) => <span style={{ fontSize: 12, color: '#1890ff' }}>RM{amt.toFixed(2)}</span>
                          }
                        ]}
                      />
                    </div>
                  )
                }}
                columns={[
                  {
                    title: t('financeAdmin.productName'),
                    dataIndex: 'cigar',
                    key: 'name',
                    render: (cigar: any) => (
                      <div>
                        <div style={{ fontWeight: 600 }}>{cigar.name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{cigar.specification || '-'}</div>
                      </div>
                    )
                  },
                  {
                    title: t('financeAdmin.salesQuantity'),
                    dataIndex: 'quantity',
                    key: 'quantity',
                    width: 120,
                    align: 'right' as const,
                    render: (quantity: number) => (
                      <span style={{ fontWeight: 600 }}>{quantity} {t('financeAdmin.pieces')}</span>
                    )
                  },
                  {
                    title: t('financeAdmin.salesAmount'),
                    dataIndex: 'amount',
                    key: 'amount',
                    width: 150,
                    align: 'right' as const,
                    render: (amount: number) => (
                      <span style={{ fontWeight: 600, color: '#1890ff' }}>RM{amount.toFixed(2)}</span>
                    )
                  },
                  {
                    title: t('financeAdmin.orderCount'),
                    dataIndex: 'orders',
                    key: 'orders',
                    width: 100,
                    align: 'center' as const,
                    render: (orders: number) => (
                      <span>{orders}</span>
                    )
                  }
                ]}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {brandProductDetails.map((product) => {
                  const isExpanded = productExpandedKeys.includes(product.cigar.id)
                  return (
                    <div 
                      key={product.cigar.id}
                      style={{
                        padding: 12,
                        background: '#f8f9fa',
                        borderRadius: 8,
                        border: '1px solid #e9ecef'
                      }}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#212529' }}>
                              {product.cigar.name}
                            </div>
                            {product.cigar.specification && (
                              <div style={{ fontSize: 12, color: '#6c757d', marginTop: 2 }}>
                                {product.cigar.specification}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (isExpanded) {
                                setProductExpandedKeys(productExpandedKeys.filter(k => k !== product.cigar.id))
                              } else {
                                setProductExpandedKeys([...productExpandedKeys, product.cigar.id])
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '18px',
                              fontWeight: 600,
                              color: '#1890ff',
                              padding: '4px 8px',
                              marginLeft: 8
                            }}
                          >
                            {isExpanded ? '−' : '+'}
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: '#6c757d' }}>{t('financeAdmin.salesQuantity')}</div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: '#495057' }}>
                            {product.quantity} {t('financeAdmin.pieces')}
                          </div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: '#6c757d' }}>{t('financeAdmin.orderCount')}</div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: '#495057' }}>
                            {product.orders}
                          </div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: '#6c757d' }}>{t('financeAdmin.salesAmount')}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#1890ff' }}>
                            RM{product.amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      
                      {/* 展开的订单记录 */}
                      {isExpanded && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #dee2e6' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#495057' }}>
                            {t('financeAdmin.orderRecords')}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {product.orderRecords.map((order, idx) => (
                              <div 
                                key={`${order.orderId}-${idx}`}
                                style={{
                                  padding: 8,
                                  background: '#fff',
                                  borderRadius: 6,
                                  border: '1px solid #e9ecef'
                                }}
                              >
                                <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 4 }}>
                                  {order.orderId}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                  <div>
                                    <div style={{ color: '#6c757d' }}>{formatYMD(toDateSafe(order.orderDate))}</div>
                                    <div style={{ color: '#495057', marginTop: 2 }}>{order.userName}</div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: '#495057', fontWeight: 600 }}>
                                      {order.quantity} {t('financeAdmin.pieces')}
                                    </div>
                                    <div style={{ color: '#1890ff', fontWeight: 600, marginTop: 2 }}>
                                      RM{order.amount.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}

export default AdminFinance
