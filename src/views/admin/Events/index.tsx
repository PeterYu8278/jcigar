// 活动管理页面
import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Table, Button, Tag, Space, Typography, Input, Select, DatePicker, message, Modal, Form, InputNumber, Switch, Dropdown, Checkbox, Upload, Spin, Descriptions, Progress, Tabs } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, DownloadOutlined, UploadOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons'
import type { Event, User, Cigar } from '../../../types'
import { getEvents, createDocument, updateDocument, deleteDocument, COLLECTIONS, getUsers, registerForEvent, unregisterFromEvent, getCigars, createOrdersFromEventAllocations, getAllOrders, getUsersByIds } from '../../../services/firebase/firestore'
import ParticipantsList from '../../../components/admin/ParticipantsList'
import ParticipantsSummary from '../../../components/admin/ParticipantsSummary'

const { Title } = Typography
const { Search } = Input
const { Option } = Select

const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [deleting, setDeleting] = useState<Event | null>(null)
  const [participantsEvent, setParticipantsEvent] = useState<Event | null>(null)
  const [participantsUsers, setParticipantsUsers] = useState<User[]>([])
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [cigars, setCigars] = useState<Cigar[]>([])
  const [allocSaving, setAllocSaving] = useState<string | null>(null)
  const [activeViewTab, setActiveViewTab] = useState<string>('overview')
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const getCigarPriceById = (id?: string) => {
    if (!id) return 0
    const c = cigars.find(x => x.id === id)
    return c?.price ?? 0
  }

  const handleSaveField = async (fieldName: string) => {
    if (!viewing) return
    
    try {
      const toDateOrNull = (val: any) => {
        if (!val) return null
        if ((val as any).toDate && typeof (val as any).toDate === 'function') {
          const d = (val as any).toDate()
          return isNaN(d?.getTime?.() || NaN) ? null : d
        }
        if (val instanceof Date) return isNaN(val.getTime()) ? null : val
        const d = new Date(val)
        return isNaN(d.getTime()) ? null : d
      }

      let updateData: any = {}
      
      switch (fieldName) {
        case 'title':
          updateData.title = editForm.title
          break
        case 'description':
          updateData.description = editForm.description
          break
        case 'status':
          updateData.status = editForm.status
          break
        case 'startDate':
          updateData.schedule = {
            ...(viewing as any).schedule,
            startDate: toDateOrNull(editForm.startDate)
          }
          break
        case 'endDate':
          updateData.schedule = {
            ...(viewing as any).schedule,
            endDate: toDateOrNull(editForm.endDate)
          }
          break
        case 'locationName':
          updateData.location = {
            ...(viewing as any).location,
            name: editForm.locationName
          }
          break
        case 'fee':
          updateData.participants = {
            ...(viewing as any).participants,
            fee: editForm.fee
          }
          break
        case 'maxParticipants':
          updateData.participants = {
            ...(viewing as any).participants,
            maxParticipants: editForm.maxParticipants
          }
          break
      }

      updateData.updatedAt = new Date()

      const res = await updateDocument(COLLECTIONS.EVENTS, viewing.id, updateData)
      if (res.success) {
        message.success('已保存')
        const list = await getEvents()
        setEvents(list)
        const updatedEvent = list.find(e => e.id === viewing.id)
        if (updatedEvent) {
          setViewing(updatedEvent)
        }
      } else {
        message.error('保存失败')
      }
    } catch (error) {
      message.error('保存失败')
    }
  }
  const [viewing, setViewing] = useState<Event | null>(null)
  const [manualAddLoading, setManualAddLoading] = useState(false)
  const [manualAddValue, setManualAddValue] = useState<string>('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [form] = Form.useForm()
  const toDayjs = (value: any) => {
    if (!value) return undefined
    if ((value as any)?.toDate && typeof (value as any).toDate === 'function') {
      return dayjs((value as any).toDate())
    }
    if (value instanceof Date) return dayjs(value)
    return dayjs(value)
  }


  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    id: true,
    title: true,
    schedule: true,
    location: true,
    registration: true,
    revenue: true,
    status: true,
    action: true,
  })

  const [orders, setOrders] = useState<any[]>([])
  const revenueMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const o of orders) {
      const src = (o as any).source
      if (src?.type === 'event' && src?.eventId) {
        map[src.eventId] = (map[src.eventId] || 0) + (o.total || 0)
      }
    }
    return map
  }, [orders])

  // 自动调整活动状态根据日期
  const autoAdjustEventStatus = async (event: Event) => {
    const now = new Date()
    const startDate = (event.schedule.startDate as any)?.toDate ? 
      (event.schedule.startDate as any).toDate() : 
      event.schedule.startDate
    const endDate = (event.schedule.endDate as any)?.toDate ? 
      (event.schedule.endDate as any).toDate() : 
      event.schedule.endDate

    if (!startDate || !endDate) return event.status

    let newStatus = event.status
    
    if (now < startDate) {
      // 活动未开始
      if (event.status === 'published') {
        newStatus = 'published'
      }
    } else if (now >= startDate && now <= endDate) {
      // 活动进行中
      if (event.status === 'published') {
        newStatus = 'ongoing'
      }
    } else if (now > endDate) {
      // 活动已结束
      if (event.status === 'published' || event.status === 'ongoing') {
        newStatus = 'completed'
        // 自动创建订单
        try {
          const orderResult = await createOrdersFromEventAllocations(event.id)
          if (orderResult.success && orderResult.createdOrders > 0) {
            message.success(`活动已自动结束，并创建了 ${orderResult.createdOrders} 个订单`)
          }
        } catch (error) {
          console.error('自动创建订单失败:', error)
        }
      }
    }

    // 如果状态发生变化，更新数据库
    if (newStatus !== event.status) {
      try {
        await updateDocument(COLLECTIONS.EVENTS, event.id, { status: newStatus } as any)
        return newStatus
      } catch (error) {
        console.error('更新活动状态失败:', error)
      }
    }
    
    return event.status
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [list, users, cigars] = await Promise.all([
          getEvents(),
          getUsers(),
          getCigars()
        ])
        
        // 自动调整所有活动的状态
        const updatedEvents = []
        for (const event of list) {
          const updatedStatus = await autoAdjustEventStatus(event)
          updatedEvents.push({ ...event, status: updatedStatus })
        }
        
        setEvents(updatedEvents)
        setParticipantsUsers(users)
        setCigars(cigars)
        const os = await getAllOrders()
        setOrders(os)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    return events.filter(e => {
      const kw = keyword.trim().toLowerCase()
      const passKw = !kw || e.title?.toLowerCase().includes(kw)
      const passStatus = !statusFilter || e.status === statusFilter
      return passKw && passStatus
    })
  }, [events, keyword, statusFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default'
      case 'published': return 'blue'
      case 'ongoing': return 'green'
      case 'completed': return 'default'
      case 'cancelled': return 'red'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return '草稿'
      case 'published': return '已发布'
      case 'ongoing': return '进行中'
      case 'completed': return '已结束'
      case 'cancelled': return '已取消'
      default: return '未知'
    }
  }

  const getRegistrationProgress = (registered: number, maxParticipants: number) => {
    return (registered / maxParticipants) * 100
  }

  const columnsAll = [
    {
      title: '活动ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '活动名称',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: any) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{title}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {(record.description || '').length > 50 
              ? `${record.description.substring(0, 50)}...` 
              : record.description}
          </div>
        </div>
      ),
    },
    {
      title: '活动时间',
      key: 'schedule',
      render: (_: any, record: any) => (
        <div>
          <div>
            {(() => {
              const s = (record?.schedule as any)?.startDate
              const dateVal = (s as any)?.toDate ? (s as any).toDate() : s
              return dateVal ? new Date(dateVal).toLocaleDateString() : '-'
            })()}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {(() => {
              const e = (record?.schedule as any)?.endDate
              const dateVal = (e as any)?.toDate ? (e as any).toDate() : e
              return dateVal ? new Date(dateVal).toLocaleDateString() : '-'
            })()}
          </div>
        </div>
      ),
    },
    {
      title: '地点',
      dataIndex: ['location','name'],
      key: 'location',
    },
    {
      title: '报名情况',
      key: 'registration',
      render: (_: any, record: any) => (
        <div>
          <div style={{ marginBottom: 4 }}>
            {(() => {
              const registered = ((record?.participants as any)?.registered || []).length
              const maxParticipants = (record?.participants as any)?.maxParticipants || 0
              return maxParticipants === 0 ? `${registered}/∞ 人` : `${registered}/${maxParticipants} 人`
            })()}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            费用: ¥{(record?.participants as any)?.fee ?? 0}
          </div>
        </div>
      ),
    },
    {
      title: '活动收入',
      key: 'revenue',
      render: (_: any, record: any) => (
        <div style={{ fontWeight: 600, color: '#389e0d' }}>
          ¥{revenueMap[(record as any).id] ?? 0}
        </div>
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
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: any) => (
        <Button type="link" icon={<EyeOutlined />} size="small" onClick={() => setViewing(record)}>
          查看详情
          </Button>
      ),
    },
  ]
  const columns = columnsAll.filter(c => visibleCols[c.key as string] !== false)

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>活动管理</Title>
        <Space>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'export',
                  label: '导出 CSV',
                  onClick: () => {
                    const data = filtered
                    const header = ['id','title','startDate','endDate','location.name','fee','maxParticipants','registered','status']
                    const rows = data.map((e: any) => [
                      e.id,
                      e.title,
                      e?.schedule?.startDate || '',
                      e?.schedule?.endDate || '',
                      e?.location?.name || '',
                      e?.participants?.fee ?? 0,
                      e?.participants?.maxParticipants ?? 0,
                      (e?.participants?.registered || []).length,
                      e.status,
                    ])
                    const csv = [header.join(','), ...rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g,'""')}"`).join(','))].join('\n')
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'events.csv'
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
          <Button onClick={() => { setKeyword(''); setStatusFilter(undefined); setSelectedRowKeys([]) }}>重置筛选</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreating(true); form.resetFields() }}>
          创建活动
        </Button>
        </Space>
      </div>

      {/* 搜索和筛选 */}
      <div style={{ marginBottom: 16, padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
        <Space size="middle" wrap>
          <Search
            placeholder="搜索活动名称或主办方"
            allowClear
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select placeholder="选择状态" style={{ width: 120 }} allowClear value={statusFilter} onChange={setStatusFilter}>
            <Option value="draft">草稿</Option>
            <Option value="published">已发布</Option>
            <Option value="ongoing">进行中</Option>
            <Option value="completed">已结束</Option>
            <Option value="cancelled">已取消</Option>
          </Select>
          <DatePicker placeholder="开始日期" />
          <DatePicker placeholder="结束日期" />
          <Button type="primary" icon={<SearchOutlined />}>
            搜索
          </Button>
        </Space>
      </div>

      {/** 过滤后的数据 */}
      {/* eslint-disable react-hooks/rules-of-hooks */}
      {(() => null)()}
      {/**/}

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
                await Promise.all(selectedRowKeys.map(id => updateDocument<Event>(COLLECTIONS.EVENTS, String(id), { status: 'cancelled' } as any)))
                message.success('已批量设置为取消')
                const list = await getEvents()
                setEvents(list)
                setSelectedRowKeys([])
              } finally {
                setLoading(false)
              }
            }}>批量取消</Button>
            <Button danger disabled={selectedRowKeys.length === 0} onClick={() => {
              Modal.confirm({
                title: '批量删除确认',
                content: `确定删除选中的 ${selectedRowKeys.length} 个活动吗？`,
                okButtonProps: { danger: true },
                onOk: async () => {
                  setLoading(true)
                  try {
                    await Promise.all(selectedRowKeys.map(id => deleteDocument(COLLECTIONS.EVENTS, String(id))))
                    message.success('已批量删除')
                    const list = await getEvents()
                    setEvents(list)
                    setSelectedRowKeys([])
                  } finally {
                    setLoading(false)
                  }
                }
              })
            }}>批量删除</Button>
          </Space>
        )}
        pagination={{
          total: events.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
        }}
      />

      {/* 查看活动详情 */}
      <Modal
        title="活动详情"
        open={!!viewing}
        onCancel={() => setViewing(null)}
        footer={null}
        width={900}
      >
        {viewing && (
          <Tabs
            activeKey={activeViewTab}
            onChange={(k) => setActiveViewTab(k)}
            items={[
              {
                key: 'overview',
                label: '概览',
                children: (
                  <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="活动名称" span={2}>
                {isEditingDetails ? (
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    onPressEnter={async () => {
                      await handleSaveField('title')
                    }}
                    onBlur={async () => {
                      await handleSaveField('title')
                    }}
                    autoFocus
                  />
                ) : (
                  <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                    {viewing.title}
                  </span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="活动描述" span={2}>
                {isEditingDetails ? (
                  <Input.TextArea
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    onPressEnter={async () => {
                      await handleSaveField('description')
                    }}
                    onBlur={async () => {
                      await handleSaveField('description')
                    }}
                    autoFocus
                    rows={3}
                  />
                ) : (
                  <div style={{ maxHeight: '100px', overflow: 'auto' }}>
                    {(viewing as any).description || '暂无描述'}
                  </div>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="活动状态" span={1}>
                {isEditingDetails ? (
                  <Select
                    value={editForm.status}
                    onChange={async (value) => {
                      setEditForm({...editForm, status: value})
                      await handleSaveField('status')
                    }}
                    style={{ width: '100%' }}
                    autoFocus
                  >
                    <Option value="draft">草稿</Option>
                    <Option value="published">已发布</Option>
                    <Option value="ongoing">进行中</Option>
                    <Option value="completed">已结束</Option>
                    <Option value="cancelled">已取消</Option>
                  </Select>
                ) : (
                  <Tag 
                    color={
                      viewing.status === 'published' ? 'blue' :
                      viewing.status === 'ongoing' ? 'green' :
                      viewing.status === 'completed' ? 'default' :
                      viewing.status === 'cancelled' ? 'red' : 'default'
                    }
                  >
                    {viewing.status === 'published' ? '已发布' :
                     viewing.status === 'ongoing' ? '进行中' :
                     viewing.status === 'completed' ? '已结束' :
                     viewing.status === 'cancelled' ? '已取消' :
                     viewing.status === 'draft' ? '草稿' : viewing.status}
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="开始时间" span={1}>
                {isEditingDetails ? (
                  <DatePicker
                    value={editForm.startDate}
                    onChange={async (date) => {
                      setEditForm({...editForm, startDate: date})
                      await handleSaveField('startDate')
                    }}
                    style={{ width: '100%' }}
                    autoFocus
                    showTime
                  />
                ) : (
                  <span>
                    {(() => {
                      const s = (viewing as any)?.schedule?.startDate
                      const sd = (s as any)?.toDate ? (s as any).toDate() : s
                      return sd ? new Date(sd).toLocaleString() : '-'
                    })()}
                  </span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="结束时间" span={1}>
                {isEditingDetails ? (
                  <DatePicker
                    value={editForm.endDate}
                    onChange={async (date) => {
                      setEditForm({...editForm, endDate: date})
                      await handleSaveField('endDate')
                    }}
                    style={{ width: '100%' }}
                    autoFocus
                    showTime
                  />
                ) : (
                  <span>
                    {(() => {
                      const e = (viewing as any)?.schedule?.endDate
                      const ed = (e as any)?.toDate ? (e as any).toDate() : e
                      return ed ? new Date(ed).toLocaleString() : '-'
                    })()}
                  </span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="活动地点" span={2}>
                {isEditingDetails ? (
                  <Input
                    value={editForm.locationName}
                    onChange={(e) => setEditForm({...editForm, locationName: e.target.value})}
                    onPressEnter={async () => {
                      await handleSaveField('locationName')
                    }}
                    onBlur={async () => {
                      await handleSaveField('locationName')
                    }}
                    autoFocus
                  />
                ) : (
                  <div>
                    {(viewing as any)?.location?.name || '-'}
                    {(viewing as any)?.location?.address && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        {(viewing as any).location.address}
                      </div>
                    )}
                  </div>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="参与费用" span={1}>
                {isEditingDetails ? (
                  <InputNumber
                    value={editForm.fee}
                    onChange={async (value) => {
                      setEditForm({...editForm, fee: value})
                      await handleSaveField('fee')
                    }}
                    style={{ width: '100%' }}
                    autoFocus
                    min={0}
                    addonBefore="¥"
                  />
                ) : (
                  <span style={{ color: '#f5222d', fontWeight: 'bold' }}>
                    ¥{(viewing as any)?.participants?.fee ?? 0}
                  </span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="人数限制" span={1}>
                {isEditingDetails ? (
                  <InputNumber
                    value={editForm.maxParticipants}
                    onChange={async (value) => {
                      setEditForm({...editForm, maxParticipants: value})
                      await handleSaveField('maxParticipants')
                    }}
                    style={{ width: '100%' }}
                    autoFocus
                    min={0}
                    addonAfter="人"
                  />
                ) : (
                  <span>
                    {(() => {
                      const maxP = (viewing as any)?.participants?.maxParticipants ?? 0
                      return maxP === 0 ? '无人数限制' : `${maxP} 人`
                    })()}
                  </span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="已报名人数" span={1}>
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                  {((viewing as any)?.participants?.registered || []).length} 人
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="报名进度" span={1}>
                {(() => {
                  const registered = ((viewing as any)?.participants?.registered || []).length
                  const max = (viewing as any)?.participants?.maxParticipants ?? 0
                  const percentage = max > 0 ? Math.round((registered / max) * 100) : 0
                  return (
                    <Progress 
                      percent={percentage} 
                      size="small" 
                      status={percentage >= 100 ? 'exception' : 'active'}
                    />
                  )
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={1}>
                {(viewing as any)?.createdAt ? new Date((viewing as any).createdAt).toLocaleString() : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间" span={1}>
                {(viewing as any)?.updatedAt ? new Date((viewing as any).updatedAt).toLocaleString() : '-'}
              </Descriptions.Item>
            </Descriptions>
            
            {/* 操作按钮区域 */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
              <Space wrap>
                <Button 
                  type="primary" 
                  icon={<EditOutlined />}
                  onClick={async () => {
                    if (isEditingDetails) {
                      // 完成编辑模式
                      setIsEditingDetails(false)
                      setEditForm({})
                    } else {
                      // 进入编辑模式
                      setIsEditingDetails(true)
                      setEditForm({
                        title: viewing.title,
                        description: (viewing as any).description || '',
                        status: viewing.status,
                        startDate: (() => {
                          const startDate = (viewing as any)?.schedule?.startDate
                          return startDate ? dayjs(startDate) : null
                        })(),
                        endDate: (() => {
                          const endDate = (viewing as any)?.schedule?.endDate
                          return endDate ? dayjs(endDate) : null
                        })(),
                        locationName: (viewing as any)?.location?.name || '',
                        fee: (viewing as any)?.participants?.fee ?? 0,
                        maxParticipants: (viewing as any)?.participants?.maxParticipants ?? 0,
                      })
                    }
                  }}
                >
                  {isEditingDetails ? '完成编辑' : '编辑活动'}
                </Button>
                {isEditingDetails && (
                  <Button 
                    onClick={() => {
                      setIsEditingDetails(false)
                      setEditForm({})
                    }}
                  >
                    取消编辑
                  </Button>
                )}
                
                <Dropdown
                  menu={{
                    items: [
                      { key: 'draft', label: '设为草稿', onClick: async () => { 
                        await updateDocument(COLLECTIONS.EVENTS, viewing.id, { status: 'draft' } as any); 
                        message.success('已设为草稿'); 
                        setEvents(await getEvents())
                        setViewing(null)
                      }},
                      { key: 'published', label: '设为发布', onClick: async () => { 
                        await updateDocument(COLLECTIONS.EVENTS, viewing.id, { status: 'published' } as any); 
                        message.success('已发布'); 
                        setEvents(await getEvents())
                        setViewing(null)
                      }},
                      { key: 'cancelled', label: '设为取消', onClick: async () => { 
                        await updateDocument(COLLECTIONS.EVENTS, viewing.id, { status: 'cancelled' } as any); 
                        message.success('已取消'); 
                        setEvents(await getEvents())
                        setViewing(null)
                      }},
                    ]
                  }}
                >
                  <Button>快速状态</Button>
                </Dropdown>
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    setViewing(null)
                    setDeleting(viewing)
                  }}
                >
                  删除活动
                </Button>
              </Space>
            </div>
                  </div>
                ),
              },
              {
                key: 'participants',
                label: '参与者管理',
                children: (
                  <div>
                    <div style={{ marginBottom: 12, color: '#666' }}>
                      已报名：{((viewing as any)?.participants?.registered || []).length} / {(viewing as any)?.participants?.maxParticipants || 0}
                    </div>
                    {/* 直接渲染“参与者弹窗”的主体内容 */}
                    {(() => {
                      // 临时把 viewing 映射到 participantsEvent 相关渲染所需的变量
                      const participantsLike = viewing as any
                      return (
                        <div>
                          <div style={{ marginBottom: 16 }}>
                            <Space.Compact style={{ width: '100%' }}>
                              <Select
                                showSearch
                                allowClear
                                placeholder="输入姓名/邮箱/手机号或用户ID进行搜索并选择"
                                style={{ width: '100%' }}
                                value={manualAddValue || undefined}
                                onSearch={(val) => setManualAddValue(val)}
                                onChange={(val) => setManualAddValue(val || '')}
                                onSelect={(val) => setManualAddValue(String(val))}
                                filterOption={(input, option) => {
                                  const keyword = (input || '').toLowerCase()
                                  const searchable = String((option as any)?.searchText || '').toLowerCase()
                                  return searchable.includes(keyword)
                                }}
                                notFoundContent={manualAddValue && manualAddValue.trim() !== '' ? '无匹配' : '暂无数据'}
                                options={(manualAddValue && manualAddValue.trim() !== '' ? participantsUsers : []).map(u => {
                                  const isRegistered = ((viewing as any)?.participants?.registered || []).includes(u.id)
                                  return {
                                    value: u.id,
                                    searchText: `${u.displayName || ''} ${(u as any)?.profile?.phone || ''} ${u.email || ''} ${u.id}`.trim(),
                                    label: (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ flex: 1, textAlign: 'left' }}>{u.displayName || '未命名'}</span>
                                        <span style={{ flex: 2, textAlign: 'left', color: '#999', fontSize: '12px' }}>
                                          {(u as any)?.profile?.phone || '无手机号'}
                                        </span>
                                        <span style={{ flex: 6, textAlign: 'left', color: '#999', fontSize: '12px' }}>
                                          {u.email || '无邮箱'}
                                        </span>
                                        {isRegistered && (
                                          <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 8 }} />
                                        )}
                                      </div>
                                    )
                                  }
                                })}
                              />
                              <Button type="primary" loading={manualAddLoading} onClick={async () => {
                                if (!viewing) return
                                const raw = manualAddValue.trim()
                                if (!raw) return
                                setManualAddLoading(true)
                                try {
                                  let userId = raw
                                  const byId = participantsUsers.find(u => u.id === raw)
                                  if (!byId) {
                                    if (raw.includes('@')) {
                                      const match = participantsUsers.find(u => u.email?.toLowerCase() === raw.toLowerCase())
                                      if (!match) { message.error('未找到该邮箱对应的用户'); return }
                                      userId = match.id
                                    } else if (/^\+?\d[\d\s-]{5,}$/.test(raw)) {
                                      const match = participantsUsers.find(u => ((u as any)?.profile?.phone || '').replace(/\s|-/g,'') === raw.replace(/\s|-/g,''))
                                      if (!match) { message.error('未找到该手机号对应的用户'); return }
                                      userId = match.id
                                    } else {
                                      const matches = participantsUsers.filter(u => (u.displayName || '').toLowerCase().includes(raw.toLowerCase()))
                                      if (matches.length === 1) userId = matches[0].id
                                      else { message.info('请从下拉列表选择唯一的用户'); return }
                                    }
                                  }
                                  const res = await registerForEvent((participantsLike as any).id, userId)
                                  if ((res as any)?.success) {
                                    message.success('已添加参与者')
                                    const list = await getEvents()
                                    setEvents(list)
                                    const next = list.find(e => e.id === (participantsLike as any).id) as any
                                    setViewing(next)
                                    setManualAddValue('')
                                  } else {
                                    message.error('添加失败')
                                  }
                                } finally {
                                  setManualAddLoading(false)
                                }
                              }}>添加</Button>
                            </Space.Compact>
                          </div>

                          <div style={{ marginBottom: 16 }}>
                            <Space>
                              <Button 
                                icon={<CheckCircleOutlined />}
                                type="primary"
                                onClick={async () => {
                                  if (!viewing) return
                                  const orderResult = await createOrdersFromEventAllocations((participantsLike as any).id);
                                  if (orderResult.success) {
                                    if (orderResult.createdOrders > 0) {
                                      message.success(`已为活动创建 ${orderResult.createdOrders} 个订单`);
                                    } else {
                                      message.info('没有参与者分配了雪茄，无法创建订单');
                                    }
                                  } else {
                                    message.error('创建订单失败：' + (orderResult.error?.message || '未知错误'));
                                  }
                                }}
                              >
                                创建订单
                              </Button>
                              <Button 
                                icon={<DownloadOutlined />}
                                onClick={() => {
                                  if (!viewing) return
                                  const header = ['userId','displayName','phone','email','cigarName','quantity','amount']
                                  const rows = (((participantsLike as any)?.participants?.registered || []) as string[]).map((id) => {
                                    const u = participantsUsers.find(x => x.id === id)
                                    const alloc = (participantsLike as any)?.allocations?.[id]
                                    const cigar = cigars.find(c => c.id === alloc?.cigarId)
                                    return [
                                      id, 
                                      u?.displayName || '', 
                                      (u as any)?.profile?.phone || '',
                                      u?.email || '',
                                      cigar?.name || '',
                                      alloc?.quantity || 0,
                                      alloc?.amount || 0
                                    ]
                                  })
                                  const csv = [header.join(','), ...rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g,'""')}"`).join(','))].join('\n')
                                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                                  const url = URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `participants-${(participantsLike as any)?.title || 'event'}.csv`
                                  a.click()
                                  URL.revokeObjectURL(url)
                                }}
                              >
                                导出分配清单
                              </Button>
                              <Upload
                                accept=".csv"
                                beforeUpload={async (file) => {
                                  if (!viewing) return false
                                  const text = await file.text()
                                  const lines = text.split(/\r?\n/).filter(Boolean)
                                  const ids = lines.slice(1).map(l => l.split(',')[0].replace(/(^\"|\"$)/g,'')).filter(Boolean)
                                  const uniq = Array.from(new Set(ids))
                                  const merged = Array.from(new Set([...(participantsLike as any)?.participants?.registered || [], ...uniq]))
                                  await updateDocument(COLLECTIONS.EVENTS, (participantsLike as any).id, { 'participants.registered': merged } as any)
                                  message.success(`已导入 ${uniq.length} 条`)
                                  const list = await getEvents()
                                  setEvents(list)
                                  const next = list.find(e => e.id === (participantsLike as any).id) as any
                                  setViewing(next)
                                  return false
                                }}
                                showUploadList={false}
                              >
                                <Button icon={<UploadOutlined />}>导入报名名单</Button>
                              </Upload>
                            </Space>
                          </div>

                          <div style={{ 
                            maxHeight: 400, 
                            overflow: 'auto', 
                            border: '1px solid #f0f0f0', 
                            borderRadius: 6,
                            background: '#fafafa'
                          }}>
                            <ParticipantsList
                              event={participantsLike}
                              participantsUsers={participantsUsers}
                              cigars={cigars}
                              participantsLoading={participantsLoading}
                              allocSaving={allocSaving}
                              onEventUpdate={(updatedEvent) => {
                                setViewing(updatedEvent)
                                setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e))
                              }}
                              onAllocSavingChange={setAllocSaving}
                              getCigarPriceById={getCigarPriceById}
                            />
                          </div>

                          <ParticipantsSummary
                            event={participantsLike}
                            getCigarPriceById={getCigarPriceById}
                          />
                        </div>
                      )
                    })()}
                  </div>
                ),
              }
            ]}
          />
        )}
      </Modal>

      {/* 参与者弹窗：查看/导出/导入/雪茄分配 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>参与者管理</span>
            <div style={{ fontSize: 14, color: '#666',marginRight: 30 }}>
              已报名：{((participantsEvent as any)?.participants?.registered || []).length} / {(participantsEvent as any)?.participants?.maxParticipants || 0}
            </div>
          </div>
        }
        open={!!participantsEvent}
        onCancel={() => setParticipantsEvent(null)}
        footer={null}
        width={900}
      >
        <div style={{ marginBottom: 16 }}>
          <Space.Compact style={{ width: '100%' }}>
            <Select
              showSearch
              allowClear
              placeholder="输入姓名/邮箱/手机号或用户ID进行搜索并选择"
              style={{ width: '100%' }}
              value={manualAddValue || undefined}
              onSearch={(val) => setManualAddValue(val)}
              onChange={(val) => setManualAddValue(val || '')}
              onSelect={(val) => setManualAddValue(String(val))}
              filterOption={(input, option) => {
                const keyword = (input || '').toLowerCase()
                const searchable = String((option as any)?.searchText || '').toLowerCase()
                return searchable.includes(keyword)
              }}
               notFoundContent={manualAddValue && manualAddValue.trim() !== '' ? '无匹配' : '暂无数据'}
                options={(manualAddValue && manualAddValue.trim() !== '' ? participantsUsers : []).map(u => ({
                  value: u.id,
                  // 用于搜索匹配的纯文本字段
                  searchText: `${u.displayName || ''} ${(u as any)?.profile?.phone || ''} ${u.email || ''} ${u.id}`.trim(),
                  label: (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ flex: 1, textAlign: 'left' }}>{u.displayName || '未命名'}</span>
                      <span style={{ flex: 2, textAlign: 'left', color: '#999', fontSize: '12px' }}>
                        {(u as any)?.profile?.phone || '无手机号'}
                      </span>
                      <span style={{ flex: 6, textAlign: 'left', color: '#999', fontSize: '12px' }}>
                        {u.email || '无邮箱'}
                      </span>
                    </div>
                  )
                }))}
            />
            <Button type="primary" loading={manualAddLoading} onClick={async () => {
              if (!participantsEvent) return
              const raw = manualAddValue.trim()
              if (!raw) return
              setManualAddLoading(true)
              try {
                let userId = raw
                const byId = participantsUsers.find(u => u.id === raw)
                if (!byId) {
                  if (raw.includes('@')) {
                    const match = participantsUsers.find(u => u.email?.toLowerCase() === raw.toLowerCase())
                    if (!match) { message.error('未找到该邮箱对应的用户'); return }
                    userId = match.id
                  } else if (/^\+?\d[\d\s-]{5,}$/.test(raw)) {
                    const match = participantsUsers.find(u => ((u as any)?.profile?.phone || '').replace(/\s|-/g,'') === raw.replace(/\s|-/g,''))
                    if (!match) { message.error('未找到该手机号对应的用户'); return }
                    userId = match.id
                  } else {
                    const matches = participantsUsers.filter(u => (u.displayName || '').toLowerCase().includes(raw.toLowerCase()))
                    if (matches.length === 1) userId = matches[0].id
                    else { message.info('请从下拉列表选择唯一的用户'); return }
                  }
                }
                const res = await registerForEvent((participantsEvent as any).id, userId)
                if (res.success) {
                  message.success('已添加参与者')
                  const list = await getEvents()
                  setEvents(list)
                  setParticipantsEvent(list.find(e => e.id === (participantsEvent as any).id) || null)
                  setManualAddValue('')
                } else {
                  message.error('添加失败')
                }
              } finally {
                setManualAddLoading(false)
              }
            }}>添加</Button>
          </Space.Compact>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button 
              icon={<CheckCircleOutlined />}
              type="primary"
              onClick={async () => {
                if (!participantsEvent) return
                const orderResult = await createOrdersFromEventAllocations((participantsEvent as any).id);
                if (orderResult.success) {
                  if (orderResult.createdOrders > 0) {
                    message.success(`已为活动创建 ${orderResult.createdOrders} 个订单`);
                  } else {
                    message.info('没有参与者分配了雪茄，无法创建订单');
                  }
                } else {
                  message.error('创建订单失败：' + (orderResult.error?.message || '未知错误'));
                }
              }}
            >
              创建订单
            </Button>
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => {
              if (!participantsEvent) return
                const header = ['userId','displayName','phone','email','cigarName','quantity','amount']
                const rows = (((participantsEvent as any)?.participants?.registered || []) as string[]).map((id) => {
                  const u = participantsUsers.find(x => x.id === id)
                  const alloc = (participantsEvent as any)?.allocations?.[id]
                  const cigar = cigars.find(c => c.id === alloc?.cigarId)
                  return [
                    id, 
                    u?.displayName || '', 
                    (u as any)?.profile?.phone || '',
                    u?.email || '',
                    cigar?.name || '',
                    alloc?.quantity || 0,
                    alloc?.amount || 0
                  ]
                })
              const csv = [header.join(','), ...rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g,'""')}"`).join(','))].join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
                a.download = `participants-${(participantsEvent as any)?.title || 'event'}.csv`
              a.click()
              URL.revokeObjectURL(url)
              }}
            >
              导出分配清单
            </Button>
            <Upload
              accept=".csv"
              beforeUpload={async (file) => {
                if (!participantsEvent) return false
                const text = await file.text()
                const lines = text.split(/\r?\n/).filter(Boolean)
                const ids = lines.slice(1).map(l => l.split(',')[0].replace(/(^\"|\"$)/g,'')).filter(Boolean)
                const uniq = Array.from(new Set(ids))
                const merged = Array.from(new Set([...(participantsEvent as any)?.participants?.registered || [], ...uniq]))
                await updateDocument(COLLECTIONS.EVENTS, (participantsEvent as any).id, { 'participants.registered': merged } as any)
                message.success(`已导入 ${uniq.length} 条`)
                const list = await getEvents()
                setEvents(list)
                setParticipantsEvent(list.find(e => e.id === (participantsEvent as any).id) || null)
                return false
              }}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>导入报名名单</Button>
            </Upload>
          </Space>
        </div>

        <div style={{ 
          maxHeight: 400, 
          overflow: 'auto', 
          border: '1px solid #f0f0f0', 
          borderRadius: 6,
          background: '#fafafa'
        }}>
          <ParticipantsList
            event={participantsEvent}
            participantsUsers={participantsUsers}
            cigars={cigars}
            participantsLoading={participantsLoading}
            allocSaving={allocSaving}
            onEventUpdate={(updatedEvent) => {
              setParticipantsEvent(updatedEvent)
              setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e))
            }}
            onAllocSavingChange={setAllocSaving}
            getCigarPriceById={getCigarPriceById}
          />
        </div>

        <ParticipantsSummary
          event={participantsEvent}
          getCigarPriceById={getCigarPriceById}
        />
      </Modal>

      {/* 创建/编辑 弹窗 */}
      <Modal
        title={editing ? '编辑活动' : '创建活动'}
        open={creating || !!editing}
        onCancel={() => { setCreating(false); setEditing(null) }}
        onOk={() => form.submit()}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={async (values: any) => {
          setLoading(true)
          try {
            const toDateOrNull = (val: any) => {
              if (!val) return null
              // Dayjs -> Date
              if ((val as any).toDate && typeof (val as any).toDate === 'function') {
                const d = (val as any).toDate()
                return isNaN(d?.getTime?.() || NaN) ? null : d
              }
              // Date
              if (val instanceof Date) return isNaN(val.getTime()) ? null : val
              // Primitive/other
              const d = new Date(val)
              return isNaN(d.getTime()) ? null : d
            }

            const payload: Partial<Event> = {
              title: values.title,
              description: values.description,
              location: { name: values.locationName, address: '' },
              schedule: { 
                startDate: toDateOrNull(values.startDate), 
                endDate: toDateOrNull(values.endDate), 
                registrationDeadline: toDateOrNull(values.endDate) 
              },
              participants: { fee: values.fee ?? 0, maxParticipants: values.maxParticipants ?? 0, registered: (editing as any)?.participants?.registered || [] },
              status: values.status || 'draft',
              updatedAt: new Date(),
            } as any
            if (editing) {
              const res = await updateDocument<Event>(COLLECTIONS.EVENTS, editing.id, payload)
              if (res.success) {
                // 如果状态被设置为"已结束"，自动创建订单
                if (values.status === 'completed' && editing.status !== 'completed') {
                  const orderResult = await createOrdersFromEventAllocations(editing.id);
                  if (orderResult.success) {
                    if (orderResult.createdOrders > 0) {
                      message.success(`活动已保存并结束，已自动创建 ${orderResult.createdOrders} 个订单`);
                    } else {
                      message.success('活动已保存并结束');
                    }
                  } else {
                    message.warning('活动已保存并结束，但订单创建失败：' + (orderResult.error?.message || '未知错误'));
                  }
                } else {
                  message.success('已保存')
                }
              }
            } else {
              await createDocument<Event>(COLLECTIONS.EVENTS, { ...payload, createdAt: new Date() } as any)
              message.success('已创建')
            }
            const list = await getEvents()
            setEvents(list)
            setCreating(false)
            setEditing(null)
          } finally {
            setLoading(false)
          }
        }}>
          <Form.Item label="活动名称" name="title" rules={[{ required: true, message: '请输入活动名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="地点名称" name="locationName" rules={[{ required: true, message: '请输入地点名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="开始日期" name="startDate" rules={[{ required: true, message: '请选择开始日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="结束日期" name="endDate" rules={[{ required: true, message: '请选择结束日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="费用 (¥)" name="fee">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="人数上限" name="maxParticipants">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue={'draft'}>
            <Select>
              <Option value="draft">草稿</Option>
              <Option value="published">已发布</Option>
              <Option value="ongoing">进行中</Option>
              <Option value="completed">已结束</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 删除确认 */}
      <Modal
        title="删除活动"
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onOk={async () => {
          if (!deleting) return
          setLoading(true)
          try {
            const res = await deleteDocument(COLLECTIONS.EVENTS, deleting.id)
            if (res.success) {
              message.success('已删除')
              const list = await getEvents()
              setEvents(list)
            }
          } finally {
            setLoading(false)
            setDeleting(null)
          }
        }}
        okButtonProps={{ danger: true }}
      >
        确认删除活动 {deleting?.title}？该操作不可撤销。
      </Modal>
    </div>
  )
}

export default AdminEvents
