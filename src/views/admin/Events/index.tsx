// 活动管理页面
import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Table, Button, Tag, Space, Typography, Input, Select, DatePicker, message, Modal, Form, InputNumber, Switch, Dropdown, Checkbox, Upload, Spin, Descriptions, Progress, Tabs } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, DownloadOutlined, UploadOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons'
import type { Event, User, Cigar } from '../../../types'
import { getEvents, createDocument, updateDocument, deleteDocument, COLLECTIONS, getUsers, registerForEvent, unregisterFromEvent, getCigars, createOrdersFromEventAllocations, getAllOrders, getUsersByIds, getEventById } from '../../../services/firebase/firestore'
import ParticipantsList from '../../../components/admin/ParticipantsList'
import ParticipantsSummary from '../../../components/admin/ParticipantsSummary'
import ImageUpload from '../../../components/common/ImageUpload'
import ActionButtons from '../../../components/common/ActionButtons'
import BatchDeleteButton from '../../../components/common/BatchDeleteButton'
import CreateButton from '../../../components/common/CreateButton'
import EventSearchBar from '../../../components/admin/EventSearchBar'
import EventCard from '../../../components/admin/EventCard'
import EventDetailsView from '../../../components/admin/EventDetailsView'
import EventParticipantsManager from '../../../components/admin/EventParticipantsManager'
import StatusFilterDropdown from '../../../components/admin/StatusFilterDropdown'
import { useTranslation } from 'react-i18next'
import { getResponsiveModalConfig } from '../../../config/modalTheme'

const { Title } = Typography
const { Search } = Input
const { Option } = Select

// Constants
const DEFAULT_MAX_PARTICIPANTS = 0
const DEFAULT_FEE = 0
const DEFAULT_STATUS = 'draft'

// Event Status Configuration
const EVENT_STATUSES = {
  DRAFT: 'draft',
  PUBLISHED: 'published', 
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const

type EventStatus = typeof EVENT_STATUSES[keyof typeof EVENT_STATUSES]

// Status validation and transition rules
const STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  [EVENT_STATUSES.DRAFT]: [EVENT_STATUSES.PUBLISHED, EVENT_STATUSES.CANCELLED],
  [EVENT_STATUSES.PUBLISHED]: [EVENT_STATUSES.ONGOING, EVENT_STATUSES.CANCELLED],
  [EVENT_STATUSES.ONGOING]: [EVENT_STATUSES.COMPLETED, EVENT_STATUSES.CANCELLED],
  [EVENT_STATUSES.COMPLETED]: [], // Terminal state
  [EVENT_STATUSES.CANCELLED]: [] // Terminal state
}

const AdminEvents: React.FC = () => {
  const { t } = useTranslation()
  
  // Main data state
  const [events, setEvents] = useState<Event[]>([])
  const [cigars, setCigars] = useState<Cigar[]>([])
  const [participantsUsers, setParticipantsUsers] = useState<User[]>([])
  
  // Loading states
  const [loading, setLoading] = useState(false)
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [allocSaving, setAllocSaving] = useState<string | null>(null)
  
  // Modal states
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [deleting, setDeleting] = useState<Event | null>(null)
  const [viewing, setViewing] = useState<Event | null>(null)
  const [participantsEvent, setParticipantsEvent] = useState<Event | null>(null)
  
  // UI states
  const [activeViewTab, setActiveViewTab] = useState<string>('overview')
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [manualAddLoading, setManualAddLoading] = useState(false)
  const [manualAddValue, setManualAddValue] = useState<string>('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [orderSyncing, setOrderSyncing] = useState(false)
  
  // Form instance
  const [form] = Form.useForm()
  // ===== STATUS MANAGEMENT UTILITIES =====
  
  // Validate status transition
  const isValidStatusTransition = (currentStatus: string, newStatus: string): boolean => {
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus as EventStatus] || []
    return allowedTransitions.includes(newStatus as EventStatus) || currentStatus === newStatus
  }

  // Get available status options based on current status
  const getAvailableStatusOptions = (currentStatus: string): EventStatus[] => {
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus as EventStatus] || []
    return [currentStatus as EventStatus, ...allowedTransitions]
  }

  // Validate event status based on dates
  const calculateEventStatus = (event: Event): EventStatus => {
    const now = new Date()
    const startDate = toDateOrNull(event.schedule?.startDate)
    const endDate = toDateOrNull(event.schedule?.endDate)
    
    if (!startDate || !endDate) return EVENT_STATUSES.DRAFT
    
    if (now < startDate) return EVENT_STATUSES.PUBLISHED
    if (now >= startDate && now <= endDate) return EVENT_STATUSES.ONGOING
    if (now > endDate) return EVENT_STATUSES.COMPLETED
    
    return EVENT_STATUSES.DRAFT
  }

  // ===== UTILITY FUNCTIONS =====
  
  const getCigarPriceById = (id?: string): number => {
    if (!id) return 0
    const cigar = cigars.find(x => x.id === id)
    return cigar?.price ?? 0
  }

  // Date conversion utility
  const toDateOrNull = (val: any): Date | null => {
        if (!val) return null
    
    // dayjs object -> Date
    if (val && typeof val.toDate === 'function') {
      const d = val.toDate()
      return isNaN(d?.getTime?.() || NaN) ? null : d
    }
    
    // Firestore Timestamp -> Date
    if ((val as any)?.toDate && typeof (val as any).toDate === 'function') {
          const d = (val as any).toDate()
          return isNaN(d?.getTime?.() || NaN) ? null : d
        }
    
    // Date -> Date
    if (val instanceof Date) {
      return isNaN(val.getTime()) ? null : val
    }
    
    // Primitive/other -> Date
        const d = new Date(val)
        return isNaN(d.getTime()) ? null : d
      }

  const handleSaveField = async (fieldName: string) => {
    if (!viewing) return
    
    try {
      let updateData: any = {}
      
      switch (fieldName) {
        case 'title':
          updateData.title = editForm.title
          break
        case 'description':
          updateData.description = editForm.description
          break
        case 'image':
          updateData.image = editForm.image
          break
        case 'status':
          updateData.status = editForm.status
          break
        case 'startDate':
          updateData.schedule = {
            ...(viewing as any).schedule,
            startDate: toDateOrNull(editForm.startDate),
            // 如果 endDate 也在 editForm 中，一起保存
            endDate: editForm.endDate !== undefined ? toDateOrNull(editForm.endDate) : (viewing as any).schedule?.endDate
          }
          break
        case 'endDate':
          updateData.schedule = {
            ...(viewing as any).schedule,
            endDate: toDateOrNull(editForm.endDate),
            // 确保不覆盖已保存的 startDate
            startDate: updateData.schedule?.startDate || (viewing as any).schedule?.startDate
          }
          break
        case 'locationName':
          updateData.location = {
            ...(viewing as any).location,
            name: editForm.locationName
          }
          break
        case 'fee':
        case 'maxParticipants': {
          const currentParticipants = (viewing as any).participants || {}
          const nextFee = editForm.fee !== undefined ? Number(editForm.fee) : currentParticipants.fee
          const nextMax = editForm.maxParticipants !== undefined ? editForm.maxParticipants : currentParticipants.maxParticipants
          updateData.participants = {
            ...currentParticipants,
            ...(nextFee !== undefined ? { fee: nextFee } : {}),
            ...(nextMax !== undefined ? { maxParticipants: nextMax } : {}),
          }
          break
          }
        case 'isPrivate':
          updateData.isPrivate = editForm.isPrivate
          break
      }

      updateData.updatedAt = new Date()

      // 如果是新活动，先创建
      if (viewing.id === 'new') {
        const newEventData = {
          ...updateData,
          organizerId: '', // 需要设置当前用户ID
          createdAt: new Date(),
          schedule: updateData.schedule || {
            startDate: new Date(),
            endDate: new Date(),
            registrationDeadline: new Date()
          },
          location: updateData.location || {
            name: '',
            address: ''
          },
          participants: updateData.participants || {
            fee: 0,
            maxParticipants: 50,
            registered: []
          },
          cigars: {
            featured: [],
            tasting: []
          },
          image: ''
        }
        
        const res = await createDocument<Event>(COLLECTIONS.EVENTS, newEventData as any)
        if (res.success) {
          message.success(t('common.created'))
          const list = await getEvents()
          setEvents(list)
          const newEvent = list.find(e => e.id === res.id)
          if (newEvent) {
            setViewing(newEvent)
          }
        } else {
          message.error(t('common.createFailed'))
        }
      } else {
        // 更新现有活动
      const res = await updateDocument(COLLECTIONS.EVENTS, viewing.id, updateData)
      if (res.success) {
        message.success(t('common.saved'))
        const list = await getEvents()
        setEvents(list)
        const updatedEvent = list.find(e => e.id === viewing.id)
        if (updatedEvent) {
          setViewing(updatedEvent)
        }
      } else {
        message.error(t('common.saveFailed'))
        }
      }
    } catch (error) {
      message.error(t('common.saveFailed'))
    }
  }
  
  // 编辑时初始化表单值
  useEffect(() => {
    if (editing) {
      form.setFieldsValue({
        title: editing.title,
        description: editing.description,
        locationName: (editing as any)?.location?.name || '',
        startDate: editing.schedule?.startDate ? dayjs(editing.schedule.startDate) : null,
        endDate: editing.schedule?.endDate ? dayjs(editing.schedule.endDate) : null,
        fee: (editing as any)?.participants?.fee || DEFAULT_FEE,
        maxParticipants: (editing as any)?.participants?.maxParticipants || DEFAULT_MAX_PARTICIPANTS,
        isPrivate: !!(editing as any)?.isPrivate,
        status: editing.status || DEFAULT_STATUS
      })
    }
  }, [editing, form])
  
  const toDayjs = (value: any) => {
    if (!value) return undefined
    if ((value as any)?.toDate && typeof (value as any).toDate === 'function') {
      return dayjs((value as any).toDate())
    }
    if (value instanceof Date) return dayjs(value)
    return dayjs(value)
  }

  // ===== DATA LOADING & INITIALIZATION =====
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
        const updatedList = []
        for (const event of list) {
          const updatedStatus = await autoAdjustEventStatus(event)
          updatedList.push({ ...event, status: updatedStatus })
        }
        
        setEvents(updatedList)
        setParticipantsUsers(users)
        setCigars(cigars)
      } catch (error) {
        message.error(t('common.loadFailed'))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // ===== UI STATE MANAGEMENT =====
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    id: true,
    title: true,
    schedule: true,
    location: true,
    registration: true,
    isPrivate: true,
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

  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false

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
      // 活动已结束 - 自动将任何非终止状态的活动设置为已结束
      if (event.status !== 'completed' && event.status !== 'cancelled') {
        newStatus = 'completed'
        // 自动创建订单
        try {
          const orderResult = await createOrdersFromEventAllocations(event.id)
          if (orderResult.success) {
            const totalOrders = orderResult.createdOrders + orderResult.updatedOrders;
            if (totalOrders > 0) {
              let messageText = t('common.eventAutoEndedWithOrders', { count: totalOrders });
              if (orderResult.createdOrders > 0 && orderResult.updatedOrders > 0) {
                messageText = `${orderResult.createdOrders} ${t('common.ordersCreated')}, ${orderResult.updatedOrders} ${t('common.ordersUpdated')}`;
              }
              message.success(messageText);
            }
          }
        } catch (error) {
          // 静默处理错误
          console.warn('Auto-create orders failed:', error);
        }
      }
    }

    // 如果状态发生变化，更新数据库
    if (newStatus !== event.status) {
      try {
        await updateDocument(COLLECTIONS.EVENTS, event.id, { status: newStatus } as any)
        return newStatus
      } catch (error) {
        // 静默处理错误
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
      case 'draft': return t('events.draft')
      case 'published': return t('events.published')
      case 'ongoing': return t('events.ongoing')
      case 'completed': return t('events.completed')
      case 'cancelled': return t('events.cancelled')
      default: return t('profile.unknown')
    }
  }

  const getRegistrationProgress = (registered: number, maxParticipants: number) => {
    return (registered / maxParticipants) * 100
  }

  const columnsAll = [
    {
      title: t('events.eventName'),
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
      title: t('events.eventTime'),
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
      title: t('events.location'),
      dataIndex: ['location','name'],
      key: 'location',
    },
    {
      title: t('events.registration'),
      key: 'registration',
      render: (_: any, record: any) => (
        <div>
          <div style={{ marginBottom: 4 }}>
            {(() => {
              const registered = ((record?.participants as any)?.registered || []).length
              const maxParticipants = (record?.participants as any)?.maxParticipants || 0
              return maxParticipants === 0 ? `${registered}/∞ ${t('events.people')}` : `${registered}/${maxParticipants} ${t('events.people')}`
            })()}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {t('events.fee')}: RM{(record?.participants as any)?.fee ?? 0}
          </div>
        </div>
      ),
    },
    {
      title: t('events.revenue'),
      key: 'revenue',
      render: (_: any, record: any) => (
        <div style={{ fontWeight: 600, color: '#389e0d' }}>
          RM{revenueMap[(record as any).id] ?? 0}
        </div>
      ),
    },
    {
      title: t('events.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      filterDropdown: (props: any) => (
        <StatusFilterDropdown
          setSelectedKeys={props.setSelectedKeys}
          selectedKeys={props.selectedKeys}
          confirm={props.confirm}
          clearFilters={props.clearFilters}
        />
      ),
      onFilter: (value: any, record: any) => {
        return !value || record.status === value
      },
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 100,
      render: (_: any, record: any) => (
        <ActionButtons
          itemId={record.id}
          itemName={record.title}
          onView={() => setViewing(record)}
          showEdit={false}
          showDelete={false}
          buttonSize="small"
          type="link"
        />
      ),
    },
  ]
  const columns = columnsAll.filter(c => visibleCols[c.key as string] !== false)

  return (
    <div style={{ minHeight: '100vh' }}>
      <Modal open={orderSyncing} footer={null} closable={false} maskClosable={false} centered>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Spin />
          <span>{t('common.processingOrders')}</span>
        </div>
      </Modal>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{t('navigation.events')}</h1>
      
        <Space>
          {selectedRowKeys.length > 1 && (
            <>
              <BatchDeleteButton
                selectedIds={selectedRowKeys}
                onBatchDelete={async (ids) => {
                  await Promise.all(ids.map(id => updateDocument(COLLECTIONS.EVENTS, id, { status: 'cancelled' })))
                  return { success: true }
                }}
                onSuccess={async () => {
                  const list = await getEvents()
                  setEvents(list)
                  setSelectedRowKeys([])
                }}
                buttonText={t('common.batchCancelled')}
                itemTypeName="活动"
                style={{ padding: '8px 16px', borderRadius: 8, background: '#fff', color: '#000' }}
              />
              <BatchDeleteButton
                selectedIds={selectedRowKeys}
                onBatchDelete={async (ids) => {
                  await Promise.all(ids.map(id => deleteDocument(COLLECTIONS.EVENTS, id)))
                  return { success: true }
                }}
                onSuccess={async () => {
                      const list = await getEvents()
                      setEvents(list)
                      setSelectedRowKeys([])
                }}
                itemTypeName="活动"
                style={{ padding: '8px 16px', borderRadius: 8, background: '#ff4d4f', color: '#fff' }}
              />
            </>
          )}
          
          <CreateButton
            onCreate={() => { 
              console.log('🔵 [Events] CreateButton clicked')
              console.log('🔵 [Events] Opening create modal')
              setCreating(true)
              form.resetFields()
            }}
            buttonText={t('dashboard.createEvent')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              borderRadius: 8, 
              padding: '8px 16px', 
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
              color: '#111', 
              fontWeight: 700 
            }}
          />
        </Space>
      </div>

      {/* 搜索和筛选 */}
      <EventSearchBar
        keyword={keyword}
        onKeywordChange={setKeyword}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onReset={() => { setKeyword(''); setStatusFilter(undefined); setSelectedRowKeys([]) }}
        isMobile={isMobile}
      />

      {/** 过滤后的数据 */}
      {/* eslint-disable react-hooks/rules-of-hooks */}
      {(() => null)()}
      {/**/}
      
      {!isMobile ? (
      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        pagination={{
          total: events.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => t('common.paginationTotal', { start: range[0], end: range[1], total }),
        }}
      />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(ev => (
            <EventCard
              key={ev.id}
              event={ev}
              onView={setViewing}
              getStatusText={getStatusText}
              getStatusColor={getStatusColor}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>{t('common.noData')}</div>
          )}
        </div>
      )}

      {/* 查看活动详情 */}
      <Modal
        title={viewing?.id === 'new' ? t('dashboard.createEvent') : t('events.eventDetails')}
        open={!!viewing}
        onCancel={() => { setViewing(null); setIsEditingDetails(false) }}
        footer={null}
        width={1000}
      >
        {viewing && (
          <Tabs
            activeKey={activeViewTab}
            onChange={(k) => setActiveViewTab(k)}
            items={[
              {
                key: 'overview',
                label: t('common.overview'),
                children: (
                  <EventDetailsView
                    event={viewing}
                    isEditing={isEditingDetails}
                    editForm={editForm}
                    onEditFormChange={setEditForm}
                    onSaveField={handleSaveField}
                    onToggleEdit={() => {
                    if (isEditingDetails) {
                      setIsEditingDetails(false)
                      setEditForm({})
                    } else {
                      setIsEditingDetails(true)
                      setEditForm({
                        title: viewing.title,
                        description: (viewing as any).description || '',
                        status: viewing.status,
                        startDate: (() => {
                          const startDate = (viewing as any)?.schedule?.startDate
                          if (!startDate) return null
                          // 处理 Firestore Timestamp
                          if (startDate.toDate && typeof startDate.toDate === 'function') {
                            return dayjs(startDate.toDate())
                          }
                          // 处理 Date 对象
                          if (startDate instanceof Date) {
                            return dayjs(startDate)
                          }
                          // 处理其他格式
                          return dayjs(startDate)
                        })(),
                        endDate: (() => {
                          const endDate = (viewing as any)?.schedule?.endDate
                          if (!endDate) return null
                          // 处理 Firestore Timestamp
                          if (endDate.toDate && typeof endDate.toDate === 'function') {
                            return dayjs(endDate.toDate())
                          }
                          // 处理 Date 对象
                          if (endDate instanceof Date) {
                            return dayjs(endDate)
                          }
                          // 处理其他格式
                          return dayjs(endDate)
                        })(),
                        locationName: (viewing as any)?.location?.name || '',
                        fee: (viewing as any)?.participants?.fee ?? 0,
                        maxParticipants: (viewing as any)?.participants?.maxParticipants ?? 0,
                        isPrivate: !!(viewing as any)?.isPrivate,
                      })
                    }
                  }}
                    onDelete={() => {
                    setViewing(null)
                    setDeleting(viewing)
                  }}
                    onImageChange={async (url) => {
                      if (viewing?.id === 'new') {
                        setEditForm({...editForm, image: url})
                                      } else {
                        try {
                          const updateData = { image: url, updatedAt: new Date() }
                          const res = await updateDocument(COLLECTIONS.EVENTS, viewing.id, updateData)
                          if (res.success) {
                            message.success(t('common.saved'))
                    const list = await getEvents()
                    setEvents(list)
                            const updatedEvent = list.find(e => e.id === viewing.id)
                            if (updatedEvent) {
                              setViewing(updatedEvent)
                            }
                                    } else {
                            message.error(t('common.saveFailed'))
                          }
                        } catch (error) {
                          message.error(t('common.saveFailed'))
                        }
                      }
                    }}
                  />
                ),
              },
              {
                key: 'participants',
                label: t('common.participantsManagement'),
                children: (
                  <EventParticipantsManager
                    event={viewing}
                              participantsUsers={participantsUsers}
                              cigars={cigars}
                              onEventUpdate={(updatedEvent) => {
                                setViewing(updatedEvent)
                                setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e))
                              }}
                              getCigarPriceById={getCigarPriceById}
                            />
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
            <span>{t('common.participantsManagement')}</span>
            <div style={{ fontSize: 14, color: '#666',marginRight: 30 }}>
              {t('common.registered')}：{((participantsEvent as any)?.participants?.registered || []).length} / {(participantsEvent as any)?.participants?.maxParticipants || 0}
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
              placeholder={t('common.pleaseInputNameEmailPhoneOrUserId')}
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
               notFoundContent={manualAddValue && manualAddValue.trim() !== '' ? t('common.noMatch') : t('common.noData')}
                options={(manualAddValue && manualAddValue.trim() !== '' ? participantsUsers : []).map(u => ({
                  value: u.id,
                  // 用于搜索匹配的纯文本字段
                  searchText: `${u.displayName || ''} ${(u as any)?.profile?.phone || ''} ${u.email || ''} ${u.id}`.trim(),
                  label: (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ flex: 1, textAlign: 'left' }}>{u.displayName || t('common.unnamed')}</span>
                      <span style={{ flex: 2, textAlign: 'left', color: '#999', fontSize: '12px' }}>
                        {(u as any)?.profile?.phone || t('common.noPhone')}
                      </span>
                      <span style={{ flex: 6, textAlign: 'left', color: '#999', fontSize: '12px' }}>
                        {u.email || t('common.noEmail')}
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
                    if (!match) { message.error(t('common.userNotFound')); return }
                  userId = match.id
                  } else if (/^\+?\d[\d\s-]{5,}$/.test(raw)) {
                    const match = participantsUsers.find(u => ((u as any)?.profile?.phone || '').replace(/\s|-/g,'') === raw.replace(/\s|-/g,''))
                    if (!match) { message.error(t('common.userNotFound')); return }
                    userId = match.id
                  } else {
                    const matches = participantsUsers.filter(u => (u.displayName || '').toLowerCase().includes(raw.toLowerCase()))
                    if (matches.length === 1) userId = matches[0].id
                    else { message.info(t('common.pleaseSelectUniqueUser')); return }
                  }
                }
                const res = await registerForEvent((participantsEvent as any).id, userId)
                if (res.success) {
                  message.success(t('common.participantAdded'));
                  const list = await getEvents()
                  setEvents(list)
                  setParticipantsEvent(list.find(e => e.id === (participantsEvent as any).id) || null)
                  setManualAddValue('')
                } else {
                  message.error(t('common.addFailed'));
                }
              } finally {
                setManualAddLoading(false)
              }
            }}>{t('common.add')}</Button>
          </Space.Compact>
          </div>

        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button 
              icon={<CheckCircleOutlined />}
              type="primary"
              onClick={async () => {
              if (!participantsEvent) return
                setOrderSyncing(true)
                const orderResult = await createOrdersFromEventAllocations((participantsEvent as any).id);
                if (orderResult.success) {
                  const totalOrders = orderResult.createdOrders + orderResult.updatedOrders;
                  if (totalOrders > 0) {
                    let messageText = '';
                    if (orderResult.createdOrders > 0 && orderResult.updatedOrders > 0) {
                      messageText = `${orderResult.createdOrders} ${t('common.ordersCreated')}, ${orderResult.updatedOrders} ${t('common.ordersUpdated')} ${t('common.forEvent')}`;
                    } else if (orderResult.createdOrders > 0) {
                      messageText = `${t('common.ordersCreated')} ${orderResult.createdOrders} ${t('common.forEvent')}`;
                    } else if (orderResult.updatedOrders > 0) {
                      messageText = `${t('common.ordersUpdated')} ${orderResult.updatedOrders} ${t('common.forEvent')}`;
                    }
                    message.success(messageText);
                    // 订单创建/更新后，刷新活动数据以更新参与者列表的订单状态与ID
                    try {
                      const refreshed = await getEventById((participantsEvent as any).id)
                      if (refreshed) {
                        setParticipantsEvent(refreshed as any)
                      }
                    } catch {}
                  } else {
                    message.info(t('common.noParticipantsAssignedCigars'));
                  }
                } else {
                  message.error(t('common.createOrdersFailed') + ' ' + (orderResult.error?.message || t('common.unknownError')));
                }
                setOrderSyncing(false)
              }}
            >
              {t('common.createOrders')}
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
              {t('common.exportAllocations')}
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
                message.success(`${t('common.imported')} ${uniq.length} ${t('common.条')}`);
                const list = await getEvents()
                setEvents(list)
                setParticipantsEvent(list.find(e => e.id === (participantsEvent as any).id) || null)
                return false
              }}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>{t('common.importParticipants')}</Button>
            </Upload>
          </Space>
        </div>

        <div style={{ 
          maxHeight: 400, 
          overflow: 'hidden', 
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

      {/* 创建活动弹窗 - 仅基本信息 */}
      <Modal
        title={t('common.add')}
        open={creating}
        onCancel={() => { setCreating(false); form.resetFields() }}
        onOk={() => {
          console.log('🔵 [Events] Modal onOk clicked (desktop)')
          console.log('🔵 [Events] Current loading state:', loading)
          form.submit()
        }}
        confirmLoading={loading}
        {...getResponsiveModalConfig(isMobile, true, 720)}
        footer={isMobile ? (
          <div style={{ padding: '8px 0' }}>
            <button 
              disabled={loading} 
              onClick={() => {
                console.log('🔵 [Events] Mobile footer button clicked')
                console.log('🔵 [Events] Current loading state:', loading)
                form.submit()
              }} 
              style={{ 
                width: '100%', 
                padding: '12px', 
                borderRadius: 8, 
                background: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
                color: '#111', 
                fontWeight: 600, 
                cursor: 'pointer', 
                transition: 'all 0.2s ease', 
                opacity: loading ? 0.6 : 1, 
                boxShadow: '0 4px 15px -5px rgba(244,175,37,0.5)' 
              }}
            >
              {loading ? t('common.saving') : t('common.create')}
            </button>
          </div>
        ) : undefined}
      >
        <Form form={form} layout="vertical" onFinish={async (values: any) => {
          console.log('🔵 [Events] Form onFinish triggered')
          console.log('🔵 [Events] Form values:', values)
          console.log('🔵 [Events] Loading state:', loading)
          
          // 防止重复提交
          if (loading) {
            console.log('⚠️ [Events] Already loading, preventing duplicate submission')
            return
          }
          
          setLoading(true)
          console.log('🔵 [Events] setLoading(true) called')
          
          try {
            // 创建活动 - 只包含基本信息
            const payload: Partial<Event> = {
              title: values.title,
              description: values.description || '',
              location: { name: values.locationName || '', address: '' },
              schedule: { 
                startDate: toDateOrNull(values.startDate), 
                endDate: toDateOrNull(values.endDate), 
                registrationDeadline: toDateOrNull(values.endDate) 
              },
              participants: { 
                fee: DEFAULT_FEE, 
                maxParticipants: DEFAULT_MAX_PARTICIPANTS, 
                registered: [] 
              },
              isPrivate: false,
              status: DEFAULT_STATUS,
              updatedAt: new Date(),
            } as any
            
            console.log('🔵 [Events] Creating event with payload:', payload)
            console.log('🔵 [Events] Collection:', COLLECTIONS.EVENTS)
            console.log('🔵 [Events] Timestamp:', new Date().toISOString())
            
            const result = await createDocument<Event>(COLLECTIONS.EVENTS, { ...payload, createdAt: new Date() } as any)
            
            console.log('🔵 [Events] Create result:', result)
            console.log('🔵 [Events] Result success:', result.success)
            console.log('🔵 [Events] Result ID:', result.id)
            
            if (result.success && result.id) {
              console.log('✅ [Events] Event created successfully, ID:', result.id)
              message.success(t('common.created'))
              
              // 刷新列表
              console.log('🔵 [Events] Fetching updated events list')
              const list = await getEvents()
              console.log('🔵 [Events] Events count:', list.length)
              setEvents(list)
              
              // 关闭创建弹窗
              setCreating(false)
              form.resetFields()
              
              // 打开详情弹窗进行进一步编辑
              const newEvent = list.find(e => e.id === result.id)
              if (newEvent) {
                console.log('🔵 [Events] Opening detail view for new event')
                setViewing(newEvent)
                setActiveViewTab('overview')
              }
            } else {
              console.log('❌ [Events] Create failed:', result)
              message.error(t('common.createFailed'))
            }
          } catch (error) {
            console.error('❌ [Events] Error in onFinish:', error)
            message.error(t('common.createFailed'))
          } finally {
            console.log('🔵 [Events] setLoading(false) called')
            setLoading(false)
          }
        }}>
          <Form.Item label={t('common.eventName')} name="title" rules={[{ required: true, message: t('common.pleaseInputEventName') }]}>
            <Input />
          </Form.Item>
          <Form.Item label={t('common.description')} name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label={t('common.eventImage')} name="image">
            <ImageUpload
              folder="events"
              showPreview={true}
            />
          </Form.Item>
          <Form.Item label={t('common.locationName')} name="locationName" rules={[{ required: true, message: t('common.pleaseInputLocationName') }]}>
            <Input />
          </Form.Item>
          <Form.Item 
            label={t('common.startDate')} 
            name="startDate" 
            rules={[
              { required: true, message: t('common.pleaseSelectStartDate') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const endDate = getFieldValue('endDate')
                  if (value && endDate && dayjs(value).isAfter(dayjs(endDate))) {
                    return Promise.reject(new Error(t('common.startDateCannotBeAfterEndDate')))
                  }
                  return Promise.resolve()
                }
              })
            ]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              disabledDate={(current) => current && current < dayjs().startOf('day')}
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              placeholder={t('common.pleaseSelectStartDate')}
            />
          </Form.Item>
          <Form.Item 
            label={t('common.endDate')} 
            name="endDate" 
            rules={[
              { required: true, message: t('common.pleaseSelectEndDate') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const startDate = getFieldValue('startDate')
                  if (value && startDate && dayjs(value).isBefore(dayjs(startDate))) {
                    return Promise.reject(new Error(t('common.endDateCannotBeBeforeStartDate')))
                  }
                  return Promise.resolve()
                }
              })
            ]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              disabledDate={(current) => current && current < dayjs().startOf('day')}
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              placeholder={t('common.pleaseSelectEndDate')}
            />
          </Form.Item>
          <div style={{ 
            padding: '12px', 
            background: 'rgba(244, 175, 37, 0.1)', 
            border: '1px solid rgba(244, 175, 37, 0.3)',
            borderRadius: 8,
            fontSize: 13,
            color: '#f4af25'
          }}>
            💡 {t('common.createEventTip') || '创建后可在活动详情中编辑更多信息（费用、人数限制、私密性等）并管理参与者'}
          </div>
        </Form>
      </Modal>

      {/* 删除确认 */}
      <Modal
        title={t('common.deleteEvent')}
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onOk={async () => {
          if (!deleting) return
          setLoading(true)
          try {
            const res = await deleteDocument(COLLECTIONS.EVENTS, deleting.id)
            if (res.success) {
              message.success(t('common.deleted'))
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
        {t('common.confirmDeleteEvent')} {deleting?.title}？{t('common.thisOperationCannotBeUndone')}
      </Modal>
    </div>
  )
}

export default AdminEvents
