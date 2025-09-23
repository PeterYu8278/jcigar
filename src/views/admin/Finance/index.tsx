// 财务管理页面
import React, { useEffect, useState, useMemo } from 'react'
import { Table, Card, Row, Col, Statistic, Typography, DatePicker, Select, Button, Space, message, Modal, Form, InputNumber, Input, Spin, Tag } from 'antd'
import { DollarOutlined, ShoppingOutlined, CalendarOutlined, ArrowUpOutlined, ArrowDownOutlined, PlusOutlined, EyeOutlined, BarChartOutlined, PieChartOutlined } from '@ant-design/icons'
import type { Transaction, User } from '../../../types'
import { getAllTransactions, getAllOrders, getAllInventoryLogs, createTransaction, COLLECTIONS } from '../../../services/firebase/firestore'
import dayjs from 'dayjs'

const { Title } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

const AdminFinance: React.FC = () => {
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
      message.error('加载交易记录失败')
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
      case 'sale': return '销售'
      case 'event_fee': return '活动费用'
      case 'purchase': return '采购'
      case 'refund': return '退款'
      default: return '未知'
    }
  }

  const getAmountDisplay = (amount: number, type: string) => {
    const isIncome = amount > 0
    return (
      <span style={{ color: isIncome ? '#52c41a' : '#f5222d' }}>
        {isIncome ? '+' : ''}¥{Math.abs(amount)}
      </span>
    )
  }

  const columns = [
    {
      title: '交易ID',
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
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>
          {getTypeText(type)}
        </Tag>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: any) => getAmountDisplay(amount, record.type),
      sorter: (a: any, b: any) => a.amount - b.amount,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '关联ID',
      dataIndex: 'relatedId',
      key: 'relatedId',
      render: (relatedId: string) => relatedId || '-',
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      render: (userId: string) => userId || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Transaction) => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} size="small" onClick={() => setViewing(record)}>
            查看
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
        <Title level={2}>财务管理</Title>
        <Space>
          <Button 
            icon={<BarChartOutlined />}
            onClick={() => {
              // TODO: 实现财务报表功能
              message.info('财务报表功能开发中...')
            }}
          >
            财务报表
          </Button>
          <Button 
            icon={<PieChartOutlined />}
            onClick={() => {
              // TODO: 实现收入分析功能
              message.info('收入分析功能开发中...')
            }}
          >
            收入分析
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreating(true)}
          >
            添加交易
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总收入"
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
              title="总支出"
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
              title="净利润"
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
              title="销售次数"
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
            placeholder={['开始日期', '结束日期']}
            value={dateRange}
            onChange={setDateRange}
          />
          <Select 
            placeholder="交易类型" 
            style={{ width: 120 }} 
            allowClear
            value={typeFilter}
            onChange={setTypeFilter}
          >
            <Option value="sale">销售</Option>
            <Option value="event_fee">活动费用</Option>
            <Option value="purchase">采购</Option>
            <Option value="refund">退款</Option>
          </Select>
          <Select 
            placeholder="货币" 
            style={{ width: 100 }} 
            allowClear
            value={currencyFilter}
            onChange={setCurrencyFilter}
          >
            <Option value="RM">马币</Option>
            <Option value="CNY">人民币</Option>
            <Option value="USD">美元</Option>
          </Select>
          <Button 
            onClick={() => {
              setDateRange(null)
              setTypeFilter(undefined)
              setCurrencyFilter(undefined)
            }}
          >
            重置筛选
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
            导出报表
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
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
        }}
      />

      {/* 查看交易详情 */}
      <Modal
        title="交易详情"
        open={!!viewing}
        onCancel={() => setViewing(null)}
        footer={<Button onClick={() => setViewing(null)}>关闭</Button>}
      >
        {viewing && (
          <div>
            <p><strong>交易ID：</strong>{viewing.id}</p>
            <p><strong>类型：</strong><Tag color={getTypeColor(viewing.type)}>{getTypeText(viewing.type)}</Tag></p>
            <p><strong>金额：</strong>{getAmountDisplay(viewing.amount, viewing.type)}</p>
            <p><strong>货币：</strong>{viewing.currency}</p>
            <p><strong>描述：</strong>{viewing.description}</p>
            <p><strong>关联ID：</strong>{viewing.relatedId || '-'}</p>
            <p><strong>用户ID：</strong>{viewing.userId || '-'}</p>
            <p><strong>创建时间：</strong>{dayjs(viewing.createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
          </div>
        )}
      </Modal>

      {/* 添加交易 */}
      <Modal
        title="添加交易"
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
              message.success('交易记录已添加')
              loadTransactions()
              setCreating(false)
              form.resetFields()
            } else {
              message.error('添加失败')
            }
          } finally {
            setLoading(false)
          }
        }}>
          <Form.Item label="交易类型" name="type" rules={[{ required: true, message: '请选择交易类型' }]}>
            <Select>
              <Option value="sale">销售</Option>
              <Option value="event_fee">活动费用</Option>
              <Option value="purchase">采购</Option>
              <Option value="refund">退款</Option>
            </Select>
          </Form.Item>
          <Form.Item label="金额" name="amount" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber style={{ width: '100%' }} placeholder="输入金额" />
          </Form.Item>
          <Form.Item label="货币" name="currency" rules={[{ required: true, message: '请选择货币' }]} initialValue="RM">
            <Select>
              <Option value="RM">马币</Option>
              <Option value="CNY">人民币</Option>
              <Option value="USD">美元</Option>
            </Select>
          </Form.Item>
          <Form.Item label="描述" name="description" rules={[{ required: true, message: '请输入描述' }]}>
            <Input.TextArea rows={3} placeholder="输入交易描述" />
          </Form.Item>
          <Form.Item label="关联ID" name="relatedId">
            <Input placeholder="关联的订单ID或活动ID（选填）" />
          </Form.Item>
          <Form.Item label="用户ID" name="userId">
            <Input placeholder="相关用户ID（选填）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AdminFinance
