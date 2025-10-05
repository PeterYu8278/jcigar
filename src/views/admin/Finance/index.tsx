// 财务管理页面
import React, { useEffect, useState, useMemo } from 'react'
import { Table, Card, Row, Col, Statistic, Typography, DatePicker, Select, Button, Space, message, Modal, Form, InputNumber, Input, Spin } from 'antd'
import { DollarOutlined, ShoppingOutlined, CalendarOutlined, ArrowUpOutlined, ArrowDownOutlined, PlusOutlined, EyeOutlined, BarChartOutlined, PieChartOutlined } from '@ant-design/icons'
import type { Transaction, User } from '../../../types'
import { getAllTransactions, getAllOrders, getAllInventoryLogs, createTransaction, COLLECTIONS, getAllUsers } from '../../../services/firebase/firestore'
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
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importRows, setImportRows] = useState<Array<{
    date: Date
    description: string
    income: number
    expense: number
    relatedId?: string
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
    const appended: Array<{ date: Date; description: string; income: number; expense: number; relatedId?: string }> = []
    for (const line of lines) {
      const parts = line.split(/[\t,]/).map(s => s.trim())
      const [dateStr, desc, incomeStr, expenseStr, relatedIdStr] = [
        parts[0],
        parts[1] || '',
        parts[2] || '0',
        parts[3] || '0',
        parts[4] || ''
      ]
      const d = parseLooseDate(dateStr)
      if (!d) continue
      appended.push({
        date: d,
        description: desc,
        income: Number(incomeStr) || 0,
        expense: Number(expenseStr) || 0,
        relatedId: relatedIdStr || undefined,
      })
    }
    if (appended.length === 0) {
      message.warning(t('financeAdmin.noLinesToImport'))
      return
    }
    setImportRows(prev => [...prev, ...appended])
  }
  const [viewing, setViewing] = useState<Transaction | null>(null)
  const [form] = Form.useForm()
  
  // 筛选状态
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  // 移除货币筛选

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
    return dayjs(d).format('YYYY-MM-DD')
  }

  // 加载数据
  useEffect(() => {
    loadTransactions()
    ;(async () => {
      const [orderList, userList] = await Promise.all([
        getAllOrders(),
        getAllUsers()
      ])
      setOrders(orderList || [])
      setUsers(userList || [])
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
      width: 150,
      render: (id: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', whiteSpace: 'normal' }}>
          {id}
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
    {
      title: t('financeAdmin.relatedOrder'),
      dataIndex: 'relatedId',
      key: 'relatedId',
      render: (relatedId: string) => relatedId || '-',
    },
    // 移除用户ID列
    
    
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

  // 统计数据
  const totalRevenue = filteredTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = Math.abs(filteredTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0))

  const netProfit = totalRevenue - totalExpenses

  // 已移除类别统计

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent'}}>{t('financeAdmin.title')}</Title>
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

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('financeAdmin.totalRevenue')}
              value={totalRevenue}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('financeAdmin.totalExpenses')}
              value={totalExpenses}
              precision={2}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('financeAdmin.netProfit')}
              value={netProfit}
              precision={2}
              prefix={netProfit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              valueStyle={{ color: netProfit >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        {/* 移除基于类别的统计卡片 */}
      </Row>

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
              const header = ['id','income','expense','description','relatedId','transactionDate']
              const rows = filteredTransactions.map(t => [
                t.id,
                t.amount > 0 ? t.amount : 0,
                t.amount < 0 ? Math.abs(t.amount) : 0,
                t.description,
                t.relatedId || '',
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

      {/* 查看交易详情 */}
      <Modal
        title={t('financeAdmin.transactionDetails')}
        open={!!viewing}
        onCancel={() => setViewing(null)}
        footer={<Button onClick={() => setViewing(null)}>{t('financeAdmin.close')}</Button>}
      >
        {viewing && (
          <div>
            <p><strong>{t('financeAdmin.transactionId')}：</strong>{viewing.id}</p>
            <p><strong>{t('financeAdmin.income')}：</strong>{viewing.amount > 0 ? `${viewing.amount}` : '0'}</p>
            <p><strong>{t('financeAdmin.expense')}：</strong>{viewing.amount < 0 ? `${Math.abs(viewing.amount)}` : '0'}</p>
            <p><strong>{t('financeAdmin.description')}：</strong>{viewing.description}</p>
            <p><strong>{t('financeAdmin.relatedId')}：</strong>{viewing.relatedId || '-'}</p>
            <p><strong>{t('financeAdmin.transactionDate')}：</strong>{dayjs(viewing.createdAt).format('YYYY-MM-DD')}</p>
          </div>
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
              optionFilterProp="label"
              options={(orders || []).map(o => {
                const u = (users || []).find((x: any) => x.id === o.userId)
                const name = u?.displayName || u?.email || o.userId
                const addr = (o as any)?.shipping?.address || '-'
                return { label: `${o.id} · ${name} · ${addr}`, value: o.id }
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
            const income = Number(r.income || 0)
            const expense = Number(r.expense || 0)
            if (!isFinite(income) || !isFinite(expense) || (income <= 0 && expense <= 0)) {
              failed++
              continue
            }
            const amount = income - expense
            const payload = {
              type: undefined as any,
              amount,
              currency: undefined,
              description: r.description,
              relatedId: r.relatedId || undefined,
              createdAt: r.date,
            }
            const res = await createTransaction(payload as any)
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
          dataSource={importRows.map((r, idx) => ({ key: idx, date: r.date, description: r.description, income: r.income, expense: r.expense, relatedId: r.relatedId }))}
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
            {
              title: t('financeAdmin.relatedOrder'),
              dataIndex: 'relatedId',
              key: 'relatedId',
              render: (v: string, record: any, index: number) => (
                <Select
                  allowClear
                  showSearch
                  value={v}
                  optionFilterProp="label"
                  options={(orders || []).map(o => ({ label: `${o.id}`, value: o.id }))}
                  onChange={(val) => {
                    const next = [...importRows]
                    next[index] = { ...next[index], relatedId: val || undefined }
                    setImportRows(next)
                  }}
                  style={{ width: '100%' }}
                />
              )
            },
            // 移除用户ID列
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
    </div>
  )
}

export default AdminFinance
