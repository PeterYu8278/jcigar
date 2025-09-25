// 财务管理页面
import React, { useEffect, useState, useMemo } from 'react'
import { Table, Card, Row, Col, Statistic, Typography, DatePicker, Select, Button, Space, message, Modal, Form, InputNumber, Input, Spin, Tag } from 'antd'
import { DollarOutlined, ShoppingOutlined, CalendarOutlined, ArrowUpOutlined, ArrowDownOutlined, PlusOutlined, EyeOutlined, BarChartOutlined, PieChartOutlined } from '@ant-design/icons'
import type { Transaction, User } from '../../../types'
import { getAllTransactions, getAllOrders, getAllInventoryLogs, createTransaction, COLLECTIONS } from '../../../services/firebase/firestore'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

const { Title } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

const AdminFinance: React.FC = () => {
  const { t } = useTranslation()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<Transaction | null>(null)
  const [form] = Form.useForm()
  
  // 筛选状态
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [currencyFilter, setCurrencyFilter] = useState<string | undefined>()

  // 加载数据
  useEffect(() => {
    loadTransactions()
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
      const passDate = !dateRange || !dateRange[0] || !dateRange[1] || (
        dayjs(transaction.createdAt).isAfter(dateRange[0]) && 
        dayjs(transaction.createdAt).isBefore(dateRange[1])
      )
      const passType = !typeFilter || transaction.type === typeFilter
      const passCurrency = !currencyFilter || transaction.currency === currencyFilter
      
      return passDate && passType && passCurrency
    })
  }, [transactions, dateRange, typeFilter, currencyFilter])

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'green'
      case 'event_fee': return 'blue'
      case 'purchase': return 'orange'
      case 'refund': return 'red'
      default: return 'default'
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'sale': return t('financeAdmin.sale')
      case 'event_fee': return t('financeAdmin.eventFee')
      case 'purchase': return t('financeAdmin.purchase')
      case 'refund': return t('financeAdmin.refund')
      default: return t('financeAdmin.unknown')
    }
  }

  const getAmountDisplay = (amount: number, type: string) => {
    const isIncome = amount > 0
    return (
      <span style={{ color: isIncome ? '#52c41a' : '#f5222d' }}>
        {isIncome ? '+' : ''}RM{Math.abs(amount)}
      </span>
    )
  }

  const columns = [
    {
      title: t('financeAdmin.transactionId'),
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {id.substring(0, 8)}...
        </span>
      ),
    },
    {
      title: t('financeAdmin.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>
          {getTypeText(type)}
        </Tag>
      ),
    },
    {
      title: t('financeAdmin.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: any) => getAmountDisplay(amount, record.type),
      sorter: (a: any, b: any) => a.amount - b.amount,
    },
    {
      title: t('financeAdmin.description'),
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: t('financeAdmin.relatedId'),
      dataIndex: 'relatedId',
      key: 'relatedId',
      render: (relatedId: string) => relatedId || '-',
    },
    {
      title: t('financeAdmin.userId'),
      dataIndex: 'userId',
      key: 'userId',
      render: (userId: string) => userId || '-',
    },
    {
      title: t('financeAdmin.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
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

  const salesCount = filteredTransactions.filter(t => t.type === 'sale').length
  
  const eventFeeCount = filteredTransactions.filter(t => t.type === 'event_fee').length
  const purchaseCount = filteredTransactions.filter(t => t.type === 'purchase').length

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>{t('financeAdmin.title')}</Title>
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
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#3f8600' }}
              suffix="RM"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('financeAdmin.totalExpenses')}
              value={totalExpenses}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#cf1322' }}
              suffix="RM"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('financeAdmin.netProfit')}
              value={netProfit}
              prefix={netProfit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              valueStyle={{ color: netProfit >= 0 ? '#3f8600' : '#cf1322' }}
              suffix="RM"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('financeAdmin.salesCount')}
              value={salesCount}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选器 */}
      <div style={{ marginBottom: 16, padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
        <Space size="middle" wrap>
          <RangePicker 
            placeholder={[t('financeAdmin.startDate'), t('financeAdmin.endDate')]}
            value={dateRange}
            onChange={setDateRange}
          />
          <Select 
            placeholder={t('financeAdmin.transactionType')} 
            style={{ width: 120 }} 
            allowClear
            value={typeFilter}
            onChange={setTypeFilter}
          >
            <Option value="sale">{t('financeAdmin.sale')}</Option>
            <Option value="event_fee">{t('financeAdmin.eventFee')}</Option>
            <Option value="purchase">{t('financeAdmin.purchase')}</Option>
            <Option value="refund">{t('financeAdmin.refund')}</Option>
          </Select>
          <Select 
            placeholder={t('financeAdmin.currency')} 
            style={{ width: 100 }} 
            allowClear
            value={currencyFilter}
            onChange={setCurrencyFilter}
          >
            <Option value="RM">{t('financeAdmin.malaysianRinggit')}</Option>
            <Option value="CNY">{t('financeAdmin.chineseYuan')}</Option>
            <Option value="USD">{t('financeAdmin.usDollar')}</Option>
          </Select>
          <Button 
            onClick={() => {
              setDateRange(null)
              setTypeFilter(undefined)
              setCurrencyFilter(undefined)
            }}
          >
            {t('financeAdmin.resetFilters')}
          </Button>
          <Button 
            onClick={() => {
              const header = ['id','type','amount','currency','description','relatedId','userId','createdAt']
              const rows = filteredTransactions.map(t => [
                t.id,
                t.type,
                t.amount,
                t.currency,
                t.description,
                t.relatedId || '',
                t.userId || '',
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
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredTransactions}
        rowKey="id"
        loading={loading}
        pagination={{
          total: filteredTransactions.length,
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
            <p><strong>{t('financeAdmin.type')}：</strong><Tag color={getTypeColor(viewing.type)}>{getTypeText(viewing.type)}</Tag></p>
            <p><strong>{t('financeAdmin.amount')}：</strong>{getAmountDisplay(viewing.amount, viewing.type)}</p>
            <p><strong>{t('financeAdmin.currency')}：</strong>{viewing.currency}</p>
            <p><strong>{t('financeAdmin.description')}：</strong>{viewing.description}</p>
            <p><strong>{t('financeAdmin.relatedId')}：</strong>{viewing.relatedId || '-'}</p>
            <p><strong>{t('financeAdmin.userId')}：</strong>{viewing.userId || '-'}</p>
            <p><strong>{t('financeAdmin.createdAt')}：</strong>{dayjs(viewing.createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
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
            const transactionData = {
              type: values.type,
              amount: values.amount,
              currency: values.currency,
              description: values.description,
              relatedId: values.relatedId || undefined,
              userId: values.userId || undefined,
              createdAt: new Date()
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
          <Form.Item label={t('financeAdmin.transactionType')} name="type" rules={[{ required: true, message: t('financeAdmin.selectTransactionType') }]}>
            <Select>
              <Option value="sale">{t('financeAdmin.sale')}</Option>
              <Option value="event_fee">{t('financeAdmin.eventFee')}</Option>
              <Option value="purchase">{t('financeAdmin.purchase')}</Option>
              <Option value="refund">{t('financeAdmin.refund')}</Option>
            </Select>
          </Form.Item>
          <Form.Item label={t('financeAdmin.amount')} name="amount" rules={[{ required: true, message: t('financeAdmin.enterAmount') }]}>
            <InputNumber style={{ width: '100%' }} placeholder={t('financeAdmin.enterAmount')} />
          </Form.Item>
          <Form.Item label={t('financeAdmin.currency')} name="currency" rules={[{ required: true, message: t('financeAdmin.currency') }]} initialValue="RM">
            <Select>
              <Option value="RM">{t('financeAdmin.malaysianRinggit')}</Option>
              <Option value="CNY">{t('financeAdmin.chineseYuan')}</Option>
              <Option value="USD">{t('financeAdmin.usDollar')}</Option>
            </Select>
          </Form.Item>
          <Form.Item label={t('financeAdmin.description')} name="description" rules={[{ required: true, message: t('financeAdmin.enterDescription') }]}>
            <Input.TextArea rows={3} placeholder={t('financeAdmin.enterDescription')} />
          </Form.Item>
          <Form.Item label={t('financeAdmin.relatedId')} name="relatedId">
            <Input placeholder={t('financeAdmin.relatedOrderId')} />
          </Form.Item>
          <Form.Item label={t('financeAdmin.userId')} name="userId">
            <Input placeholder={t('financeAdmin.relatedUserId')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AdminFinance
