// 用户管理页面
import React, { useEffect, useMemo, useState } from 'react'
import { Table, Button, Tag, Space, Typography, Input, Select, message, Modal, Form, Switch, Dropdown, Checkbox, Row, Col, Spin } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, EyeOutlined, ArrowLeftOutlined, CalendarOutlined, ShoppingOutlined, TrophyOutlined } from '@ant-design/icons'
import { MemberProfileCard } from '../../../components/common/MemberProfileCard'

const { Title } = Typography
const { Search } = Input
const { Option } = Select

import { getUsers, createDocument, updateDocument, deleteDocument, COLLECTIONS, getEventsByUser, getOrdersByUser } from '../../../services/firebase/firestore'
import type { User, Event, Order } from '../../../types'
import { sendPasswordResetEmailFor } from '../../../services/firebase/auth'
import { useTranslation } from 'react-i18next'
import { getModalThemeStyles, getModalWidth } from '../../../config/modalTheme'
import { normalizePhoneNumber } from '../../../utils/phoneNormalization'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db } from '../../../config/firebase'

// CSS样式对象
const glassmorphismInputStyle = {
  width: '100%',
  padding: '8px 12px',
  marginTop: '4px',
  color: '#FFFFFF',
  background: 'transparent',
  border: 'none',
  borderBottom: '2px solid transparent',
  borderRadius: 0,
  fontSize: '16px',
  transition: 'border-color 0.3s ease',
  position: 'relative' as const,
  backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
  backgroundSize: '100% 2px',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'bottom'
}

const AdminUsers: React.FC = () => {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<null | User>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<null | User>(null)
  const [form] = Form.useForm()
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | undefined>()
  const [levelFilter, setLevelFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [statusMap, setStatusMap] = useState<Record<string, 'active' | 'inactive'>>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('users.visibleCols')
    if (saved) {
      try { return JSON.parse(saved) } catch {}
    }
    return {
    id: true,
    displayName: true,
    email: true,
    role: true,
    membership: true,
    lastActive: true,
    status: true,
    action: true,
    }
  })
  const [activeTab, setActiveTab] = useState<'cigar' | 'points' | 'activity' | 'referral'>('cigar')
  const [showMemberCard, setShowMemberCard] = useState(false) // 控制头像/会员卡切换
  const [userOrders, setUserOrders] = useState<Order[]>([])
  const [userEvents, setUserEvents] = useState<Event[]>([])
  const [loadingUserData, setLoadingUserData] = useState(false)
  const [activeIndex, setActiveIndex] = useState<string>('') // 当前高亮的字母
  const [showBubble, setShowBubble] = useState(false) // 字母气泡显示
  const [bubbleLetter, setBubbleLetter] = useState('') // 气泡字母

  useEffect(() => {
    ;(async () => {
    setLoading(true)
    try {
        const list = await getUsers()
      setUsers(list)
      } catch (e) {
      message.error(t('messages.dataLoadFailed'))
    } finally {
      setLoading(false)
    }
    })()
  }, [])

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // 加载用户的订单和活动数据
  useEffect(() => {
    const loadUserData = async () => {
      if (!editing?.id) {
        setUserOrders([])
        setUserEvents([])
        return
      }
      
      setLoadingUserData(true)
      try {
        const [orders, events] = await Promise.all([
          getOrdersByUser(editing.id),
          getEventsByUser(editing.id)
        ])
        setUserOrders(orders)
        setUserEvents(events)
      } catch (error) {
        console.error('Failed to load user data:', error)
      } finally {
        setLoadingUserData(false)
      }
    }
    
    loadUserData()
  }, [editing?.id])

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'red'
      case 'member': return 'blue'
      case 'guest': return 'default'
      default: return 'default'
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return t('auth.admin')
      case 'member': return t('auth.member')
      case 'guest': return t('auth.guest')
      default: return t('profile.unknown')
    }
  }

  const getMembershipColor = (level: string) => {
    switch (level) {
      case 'bronze': return 'default'
      case 'silver': return 'default'
      case 'gold': return '#faad14'
      case 'platinum': return '#722ed1'
      default: return 'default'
    }
  }

  const getMembershipText = (level: string) => {
    switch (level) {
      case 'bronze': return t('profile.bronzeMember')
      case 'silver': return t('profile.silverMember')
      case 'gold': return t('profile.goldMember')
      case 'platinum': return t('profile.platinumMember')
      default: return t('profile.regularMember')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green'
      case 'inactive': return 'default'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return t('usersAdmin.active')
      case 'inactive': return t('usersAdmin.inactive')
      default: return t('profile.unknown')
    }
  }

  const allColumns = [
    {
      title: t('usersAdmin.userId'),
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: t('usersAdmin.name'),
      dataIndex: 'displayName',
      key: 'displayName',
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.displayName || '-'}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{(record as any)?.profile?.phone || ''}</div>
        </div>
      ),
    },
    {
      title: t('usersAdmin.email'),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: t('usersAdmin.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>
          {getRoleText(role)}
        </Tag>
      ),
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
       filterDropdown: (props: any) => {
        const { setSelectedKeys, selectedKeys, confirm, clearFilters } = props as any
        return (
        <div style={{ padding: 8 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
            <Button size="small" type={(selectedKeys[0] === undefined) ? 'primary' : 'text'} onClick={() => { setSelectedKeys([]); clearFilters?.(); confirm({ closeDropdown: true }) }}>{t('common.all')}</Button>
            <Button size="small" type={selectedKeys[0] === 'admin' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['admin']); confirm({ closeDropdown: true }) }}>{t('auth.admin')}</Button>
            <Button size="small" type={selectedKeys[0] === 'member' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['member']); confirm({ closeDropdown: true }) }}>{t('auth.member')}</Button>
            <Button size="small" type={selectedKeys[0] === 'guest' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['guest']); confirm({ closeDropdown: true }) }}>{t('auth.guest')}</Button>
          </div>
        </div>
        )
      },
      onFilter: (value: any, record: any) => {
        return !value || record.role === value
      },
    },
    {
      title: t('usersAdmin.level'),
      dataIndex: ['membership', 'level'],
      key: 'membership',
      render: (level: string) => (
        <Tag color={getMembershipColor(level)}>
          {getMembershipText(level)}
        </Tag>
      ),
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      filterDropdown: (props: any) => {
        const { setSelectedKeys, selectedKeys, confirm, clearFilters } = props as any
        return (
          <div style={{ padding: 8 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
              <Button size="small" type={(selectedKeys[0] === undefined) ? 'primary' : 'text'} onClick={() => { setSelectedKeys([]); clearFilters?.(); confirm({ closeDropdown: true }) }}>{t('common.all')}</Button>
              <Button size="small" type={selectedKeys[0] === 'bronze' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['bronze']); confirm({ closeDropdown: true }) }}>{t('profile.bronzeMember')}</Button>
              <Button size="small" type={selectedKeys[0] === 'silver' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['silver']); confirm({ closeDropdown: true }) }}>{t('profile.silverMember')}</Button>
              <Button size="small" type={selectedKeys[0] === 'gold' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['gold']); confirm({ closeDropdown: true }) }}>{t('profile.goldMember')}</Button>
              <Button size="small" type={selectedKeys[0] === 'platinum' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['platinum']); confirm({ closeDropdown: true }) }}>{t('profile.platinumMember')}</Button>
            </div>
          </div>
        )
      },
      onFilter: (value: any, record: any) => {
        return !value || (record?.membership?.level === value)
      },
    },
    // 移除加入时间列以适配移动端
    // 在移动端隐藏“最后活跃”列
    // { title: '最后活跃', dataIndex: 'lastActive', key: 'lastActive', responsive: ['md'] as any },
    {
      title: t('usersAdmin.status'),
      dataIndex: 'status',
      key: 'status',
      render: (_: any, record: any) => {
        const status = statusMap[record.id] || record.status || 'active'
        return (
          <Space>
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
            <Switch
              checked={status === 'active'}
              onChange={async (checked) => {
                const next = checked ? 'active' : 'inactive'
                setStatusMap((m) => ({ ...m, [record.id]: next }))
                const res = await updateDocument<User>(COLLECTIONS.USERS, record.id, { status: next } as any)
                if (res.success) message.success(t('usersAdmin.statusUpdated'))
              }}
              size="small"
            />
        </Space>
      )
      },
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      filterDropdown: (props: any) => {
        const { setSelectedKeys, selectedKeys, confirm, clearFilters } = props as any
        return (
          <div style={{ padding: 8 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
              <Button size="small" type={(selectedKeys[0] === undefined) ? 'primary' : 'text'} onClick={() => { setSelectedKeys([]); clearFilters?.(); confirm({ closeDropdown: true }) }}>{t('common.all')}</Button>
              <Button size="small" type={selectedKeys[0] === 'active' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['active']); confirm({ closeDropdown: true }) }}>{t('usersAdmin.active')}</Button>
              <Button size="small" type={selectedKeys[0] === 'inactive' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['inactive']); confirm({ closeDropdown: true }) }}>{t('usersAdmin.inactive')}</Button>
            </div>
          </div>
        )
      },
      onFilter: (value: any, record: any) => {
        const status = record.status || 'active'
        return !value || status === value
      },
    },
    {
      title: t('usersAdmin.actions'),
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="small" style={{ justifyContent: 'center', width: '100%' }}>
          <Button type="link" icon={<EyeOutlined />} size="small" onClick={() => {
            setEditing(record)
            form.setFieldsValue({
              displayName: record.displayName,
              email: record.email,
              role: record.role,
              level: record.membership?.level,
              phone: (record as any)?.profile?.phone,
            })
          }}>
          </Button>
        </Space>
      ),
    },
  ]
  const columns = allColumns.filter(c => visibleCols[c.key as string] !== false)

  const filteredUsers = useMemo(() => {
                      const kw = keyword.trim().toLowerCase()
    const filtered = users.filter(u => {
      const passKw = !kw || u.displayName?.toLowerCase().includes(kw) || (u.email || '').toLowerCase().includes(kw) || ((u as any)?.profile?.phone || '').includes(keyword.trim())
                      const passRole = !roleFilter || u.role === roleFilter
                      const passLevel = !levelFilter || u.membership?.level === levelFilter
      const status = statusMap[u.id] || (u as any).status || 'active'
      const passStatus = !statusFilter || status === statusFilter
      return passKw && passRole && passLevel && passStatus
    })
    
    // 按字母顺序排序（按displayName）
    return filtered.sort((a, b) => {
      const nameA = (a.displayName || '').toLowerCase()
      const nameB = (b.displayName || '').toLowerCase()
      return nameA.localeCompare(nameB)
    })
  }, [users, keyword, roleFilter, levelFilter, statusFilter, statusMap])

  const groupedByInitial = useMemo(() => {
    const groups: Record<string, User[]> = {}
    for (const u of filteredUsers) {
      const name = u.displayName || ''
      const ch = name.trim().charAt(0).toUpperCase()
      const key = ch && /[A-Z]/.test(ch) ? ch : '#'
      if (!groups[key]) groups[key] = []
      groups[key].push(u)
    }
    const sortedKeys = Object.keys(groups).sort()
    return sortedKeys.map(k => ({ key: k, items: groups[k].sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')) }))
  }, [filteredUsers])

  const alphaIndex = useMemo(() => {
    const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))
    return [...letters, '#']
  }, [])

  const [alphaY, setAlphaY] = useState<number>(typeof window !== 'undefined' ? window.innerHeight / 2 : 300)

  // 监听滚动，更新当前高亮字母
  useEffect(() => {
    if (!isMobile) return

    const handleScroll = () => {
      for (const group of groupedByInitial) {
        const el = document.getElementById(`group-${group.key}`)
        if (el) {
          const rect = el.getBoundingClientRect()
          // 如果分组在可视区域顶部附近
          if (rect.top >= 0 && rect.top < 200) {
            setActiveIndex(group.key)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // 初始化

    return () => window.removeEventListener('scroll', handleScroll)
  }, [groupedByInitial, isMobile])

  const maskPhone = (phone?: string) => {
    if (!phone) return ''
    return phone.replace(/(\d{3})\d+(\d{2})/, '$1****$2')
  }

  // 玻璃拟态输入框样式
  const glassmorphismInputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    borderRadius: 0,
    color: '#FFFFFF',
    fontSize: '16px',
    paddingLeft: 0,
    paddingRight: 0,
    position: 'relative' as const,
    backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
    backgroundSize: '100% 2px',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'bottom'
  }

  // 持久化列显示设置
  useEffect(() => {
    try {
      localStorage.setItem('users.visibleCols', JSON.stringify(visibleCols))
    } catch {}
  }, [visibleCols])

  return (
    <div  style={{ minHeight: '100vh' }}>
      {!isMobile && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
         <h1 style={{ fontSize: 22, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{t('navigation.users')}</h1>
        <Space>
          {selectedRowKeys.length > 1 && (
            <>
              <Button onClick={async () => {
                setLoading(true)
                try {
                  await Promise.all(selectedRowKeys.map(id => updateDocument<User>(COLLECTIONS.USERS, String(id), { status: 'inactive' } as any)))
                  message.success(t('usersAdmin.batchDisabled'))
                  const list = await getUsers()
                  setUsers(list)
                  setSelectedRowKeys([])
                } finally {
                  setLoading(false)
                }
              }}>{t('usersAdmin.batchDisable')}</Button>
              <Button danger onClick={async () => {
    Modal.confirm({
                  title: t('usersAdmin.batchDeleteConfirm'),
                  content: t('usersAdmin.batchDeleteContent', { count: selectedRowKeys.length }),
      okButtonProps: { danger: true },
      onOk: async () => {
                    setLoading(true)
                    try {
                      await Promise.all(selectedRowKeys.map(id => deleteDocument(COLLECTIONS.USERS, String(id))))
                      message.success(t('usersAdmin.batchDeleted'))
                      const list = await getUsers()
                      setUsers(list)
                      setSelectedRowKeys([])
                    } finally {
                      setLoading(false)
                    }
                  }
                })
              }}>{t('usersAdmin.batchDelete')}</Button>
            </>
          )}

          <button onClick={() => {
          setCreating(true)
          form.resetFields()
        }} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, padding: '8px 16px', background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 700, cursor: 'pointer' }}>
          <PlusOutlined />
          {t('usersAdmin.addUser')}
        </button>
        </Space>
      </div>
      )}

      {/* 桌面：搜索和筛选 */}
      {!isMobile && (
      <div style={{ marginBottom: 16, padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
        <Space size="middle" wrap>
          <Search
            placeholder={t('usersAdmin.searchByNameOrEmail')}
            allowClear
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
            <Select
              allowClear
              placeholder={t('usersAdmin.selectRole')}
              value={roleFilter}
              style={{ width: 160 }}
              onChange={(v) => setRoleFilter(v)}
            >
            <Option value="admin">{t('common.admin')}</Option>
            <Option value="member">{t('common.member')}</Option>
            <Option value="guest">{t('common.guest')}</Option>
          </Select>
            <Select
              allowClear
              placeholder={t('usersAdmin.selectLevel')}
              value={levelFilter}
              style={{ width: 160 }}
              onChange={(v) => setLevelFilter(v)}
            >
            <Option value="bronze">{t('usersAdmin.bronzeMember')}</Option>
            <Option value="silver">{t('usersAdmin.silverMember')}</Option>
            <Option value="gold">{t('usersAdmin.goldMember')}</Option>
            <Option value="platinum">{t('usersAdmin.platinumMember')}</Option>
          </Select>
            <Select
              allowClear
              placeholder={t('usersAdmin.selectStatus')}
              value={statusFilter}
              style={{ width: 160 }}
              onChange={(v) => setStatusFilter(v)}
            >
            <Option value="active">{t('usersAdmin.active')}</Option>
              <Option value="inactive">{t('usersAdmin.inactive')}</Option>
          </Select>
          <Button onClick={() => {
            setKeyword('')
            setRoleFilter(undefined)
            setLevelFilter(undefined)
            setSelectedRowKeys([])
          }}>{t('common.resetFilters')}</Button>
        </Space>
      </div>
      )}

      {/* 桌面：表格 */}
      {!isMobile && (
      <Table
        columns={columns}
          dataSource={filteredUsers}
        rowKey="id"
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{
            total: filteredUsers.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => t('common.paginationTotal', { start: range[0], end: range[1], total }),
        }}
      />
      )}

      {/* 移动端：列表视图 */}
      {isMobile && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '90vh',
          overflow: 'hidden'
        }}>
          {/* 固定顶部区域 - 不滚动 */}
          <div style={{ flexShrink: 0 }}>
            {/* 标题栏 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent', margin: 0 }}>{t('navigation.users')}</h1>
              <div style={{ width: 32 }} />
            </div>
            
            {/* 搜索框 */}
            <div style={{ position: 'relative', padding: '0 16px', marginBottom: 12 }}>
              <Search
                placeholder={t('usersAdmin.searchByNameOrEmail')}
                allowClear
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: '100%' }}
                prefix={<SearchOutlined />}
              />
            </div>
            
            {/* 筛选与添加 */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', padding: '0 16px 12px 16px', borderBottom: '2px solid rgba(255, 215, 0, 0.2)' }}>
              <Dropdown
                menu={{
                  items: [
                    { key: 'all', label: t('common.all') },
                    { key: 'admin', label: t('common.admin') },
                    { key: 'member', label: t('common.member') },
                    { key: 'guest', label: t('common.guest') },
                  ],
                  onClick: ({ key }) => setRoleFilter(key === 'all' ? undefined : (key as string)),
                }}
              >
                <Button shape="round" size="small">
                  {t('usersAdmin.role')}{roleFilter ? `: ${getRoleText(roleFilter)}` : ''}
                </Button>
              </Dropdown>
              <Dropdown
                menu={{
                  items: [
                    { key: 'all', label: t('common.all') },
                    { key: 'bronze', label: t('usersAdmin.bronzeMember') },
                    { key: 'silver', label: t('usersAdmin.silverMember') },
                    { key: 'gold', label: t('usersAdmin.goldMember') },
                    { key: 'platinum', label: t('usersAdmin.platinumMember') },
                  ],
                  onClick: ({ key }) => setLevelFilter(key === 'all' ? undefined : (key as string)),
                }}
              >
                <Button shape="round" size="small">
                  {t('usersAdmin.level')}{levelFilter ? `：${getMembershipText(levelFilter)}` : ''}
                </Button>
              </Dropdown>
              <Dropdown
                menu={{
                  items: [
                    { key: 'all', label: t('common.all') },
                    { key: 'active', label: t('usersAdmin.active') },
                    { key: 'inactive', label: t('usersAdmin.inactive') },
                  ],
                  onClick: ({ key }) => setStatusFilter(key === 'all' ? undefined : (key as string)),
                }}
              >
                <Button shape="round" size="small">
                  {t('usersAdmin.status')}{statusFilter ? `: ${getStatusText(statusFilter)}` : ''}
                </Button>
              </Dropdown>
              <div style={{ flex: 1 }} />
              <button onClick={() => { setCreating(true); form.resetFields() }} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '6px 12px', background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 700, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}>{t('usersAdmin.addUser')}</button>
            </div>
          </div>

          {/* 可滚动内容区域 - 独立滚动 */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
            paddingBottom: '100px'
          }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <Spin />
              </div>
            ) : (
              <>
                {groupedByInitial.map(group => (
                <div key={group.key} id={`group-${group.key}`} style={{ marginBottom: 12 }}>
                  <div style={{ color: '#f4af25', fontWeight: 600, marginBottom: 8 }}>{group.key}</div>
                  {group.items.map((u) => {
                    const status = statusMap[u.id] || (u as any).status || 'active'
                    const level = u.membership?.level || 'bronze'
                    return (
                      <div key={u.id} style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', padding: 12, marginBottom: 8, backdropFilter: 'blur(6px)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ fontWeight: 700, color: '#f0f0f0' }}>{u.displayName || '-'}</div>
                              <span style={{ borderRadius: 999, background: 'rgba(148,148,148,0.2)', padding: '2px 8px', fontSize: 12, color: '#ddd' }}>{getMembershipText(level)}</span>
                            </div>
                            <div style={{ marginTop: 4, fontSize: 12, color: '#aaa' }}>{maskPhone((u as any)?.profile?.phone)}</div>
                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: 999, background: status === 'active' ? '#52c41a' : '#ff4d4f', display: 'inline-block' }} />
                              <span style={{ fontSize: 12, color: '#ccc' }}>{getStatusText(status)}</span>
                            </div>
                          </div>
                          <button style={{ padding: '4px 8px', borderRadius: 6, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => {
                            setEditing(u)
                            form.setFieldsValue({
                              displayName: u.displayName,
                              email: u.email,
                              role: u.role,
                              level: u.membership?.level,
                              phone: (u as any)?.profile?.phone,
                            })
                          }}>{t('common.viewDetails')}</button>
                        </div>
    </div>
  )
                  })}
                </div>
              ))}
                {groupedByInitial.length === 0 && (
                  <div style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>{t('common.noData')}</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 右侧字母索引（可拖动浮动）- 移至最外层 */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            right: 3,
            top: alphaY,
            transform: 'translateY(-30%)',
            padding: 6,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,215,0,0.25)',
            borderRadius: 12,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)'
          }}
          onTouchStart={(e) => {
            if (!e.touches || e.touches.length === 0) return
            const touch = e.touches[0]
            const vh = typeof window !== 'undefined' ? window.innerHeight : 800
            const min = 48
            const max = vh - 96
            const next = Math.max(min, Math.min(max, touch.clientY))
            setAlphaY(next)
          }}
          onTouchMove={(e) => {
            if (!e.touches || e.touches.length === 0) return
            const touch = e.touches[0]
            const vh = typeof window !== 'undefined' ? window.innerHeight : 800
            const min = 48
            const max = vh - 96
            const next = Math.max(min, Math.min(max, touch.clientY))
            setAlphaY(next)
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
            {alphaIndex.map(letter => {
              const enabled = groupedByInitial.some(g => g.key === letter)
              const isActive = letter === activeIndex
              return (
                <a
                  key={letter}
                  onClick={(e) => {
                    e.preventDefault()
                    if (!enabled) return
                    
                    // 1. 触摸振动反馈
                    if (navigator.vibrate) {
                      navigator.vibrate(10)
                    }
                    
                    // 2. 显示字母气泡
                    setBubbleLetter(letter)
                    setShowBubble(true)
                    setTimeout(() => setShowBubble(false), 500)
                    
                    // 3. 滚动到对应分组
                    const el = document.getElementById(`group-${letter}`)
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  style={{
                    color: isActive ? '#fff' : enabled ? '#f4af25' : '#777',
                    background: isActive ? 'rgba(244, 175, 37, 0.8)' : 'transparent',
                    textDecoration: 'none',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    cursor: enabled ? 'pointer' : 'default',
                    transition: 'all 0.3s ease',
                    fontWeight: isActive ? 700 : 600
                  }}
                >
                  {letter}
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* 字母气泡提示 - 移至最外层 */}
      {showBubble && isMobile && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100px',
          height: '100px',
          background: 'rgba(244, 175, 37, 0.95)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '56px',
          fontWeight: 'bold',
          color: '#111',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 8px 32px rgba(244, 175, 37, 0.6)',
          animation: 'bubblePop 0.3s ease-out'
        }}>
          {bubbleLetter}
        </div>
      )}

      {/* 字母气泡动画 */}
      <style>{`
        @keyframes bubblePop {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
      `}</style>

      {/* 查看用户详情弹窗 */}
      <Modal
        title={null}
        open={!!editing}
        onCancel={() => setEditing(null)}
        footer={null}
        width={isMobile ? '100%' : 480}
        style={{ top: isMobile ? 0 : 20 }}
        styles={{
          body: {
            padding: 0,
            background: 'linear-gradient(180deg, #221c10 0%, #181611 0%)',
            minHeight: isMobile ? '100vh' : 'auto'
          },
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
          content: {
            border: 'none',
            boxShadow: 'none',
            background: 'linear-gradient(180deg, #221c10 0%, #181611 0%)'
          }
        }}
        className="user-detail-modal"
        closable={false}
      >
        {editing && (
          <div style={{
            minHeight: isMobile ? '100vh' : 'auto',
            color: '#FFFFFF'
          }}>
            {/* Header */}
            <div style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              
              background: 'transparent',
              backdropFilter: 'blur(10px)'
            }}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => setEditing(null)}
                style={{ color: '#FFFFFF', fontSize: '20px' }}
              />
              <h1 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#FFFFFF',
                margin: 0,
                textAlign: 'center',
                flex: 1
              }}>
                {t('usersAdmin.memberDetails')}
              </h1>
            </div>

            {/* User Profile Section */}
            <div style={{ alignItems: 'center', textAlign: 'center' }}>
              {/* Avatar/Member Card Toggle */}
              <MemberProfileCard
                user={editing}
                showMemberCard={showMemberCard}
                onToggleMemberCard={setShowMemberCard}
                getMembershipText={getMembershipText}
              />

              {/* User Info */}
              <div style={{ textAlign: 'center' , marginTop: '24px'}}>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                  margin: '0 0 8px 0'
                }}>
                  {editing.displayName || '-'}
                </h2>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  marginBottom: '8px',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}>
                  <span>{getMembershipText(editing.membership?.level || 'bronze')}</span>
                  <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.2)' }} />
                  <span>{t('usersAdmin.points')}: 1250</span>
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  <p>{t('auth.email')}: {editing.email || '-'}</p>
                  <p>{t('auth.phone')}: {(editing as any)?.profile?.phone || '-'}</p>
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => {
                  setCreating(true)
                  form.setFieldsValue({
                    displayName: editing.displayName,
                    email: editing.email,
                    role: editing.role,
                    level: editing.membership?.level,
                    phone: (editing as any)?.profile?.phone,
                  })
                  // 不要设置 editing=null，保持编辑状态
                }}
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  height: '48px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#111',
                  textTransform: 'uppercase',
                  marginBottom: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {t('usersAdmin.editProfile')}
              </button>
            </div>

            {/* Stats Section */}
            <div style={{}}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '10px', 
                marginBottom: '10px',
                width: '100%',
                maxWidth: '320px',
                margin: '0 auto 10px auto'
              }}>
                {[
                  { title: t('profile.eventsJoined'), value: userEvents.length, icon: <CalendarOutlined /> },
                  { title: t('profile.cigarsPurchased'), value: userOrders.length, icon: <ShoppingOutlined /> },
                  { title: t('profile.communityPoints'), value: (editing?.membership as any)?.points || 0, icon: <TrophyOutlined /> },
                ].map((stat, index) => (
                  <div key={index} style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(244, 175, 37, 0.2)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '4px' }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      {stat.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs Section */}
            <div style={{ padding: '0 16px' }}>
              <div style={{
                display: 'flex',
                borderBottom: '1px solid rgba(244,175,37,0.2)',
                marginBottom: '24px'
              }}>
                {(['cigar', 'points', 'activity', 'referral'] as const).map((tabKey) => {
                  const isActive = activeTab === tabKey
                  const baseStyle: React.CSSProperties = {
                    flex: 1,
                    padding: '10px 0',
                    fontWeight: 800,
                    fontSize: 12,
                    outline: 'none',
                    borderBottom: isActive ? '2px solid transparent' : '2px solid transparent',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    position: 'relative' as const,
                  }
                  const activeStyle: React.CSSProperties = {
                    color: 'transparent',
                    backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                    WebkitBackgroundClip: 'text',
                  }
                  const inactiveStyle: React.CSSProperties = {
                    color: '#A0A0A0',
                  }
                  
                  const getTabLabel = (key: string) => {
                    switch (key) {
                      case 'cigar': return t('usersAdmin.cigarRecords')
                      case 'points': return t('usersAdmin.pointsRecords')
                      case 'activity': return t('usersAdmin.activityRecords')
                      case 'referral': return t('usersAdmin.referralRecords')
                      default: return ''
                    }
                  }

  return (
                    <button
                      key={tabKey}
                      onClick={() => setActiveTab(tabKey)}
                      style={{ ...baseStyle, ...(isActive ? activeStyle : inactiveStyle) }}
                    >
                      {getTabLabel(tabKey)}
                      {isActive && (
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '2px',
                          background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                          borderRadius: '1px'
                        }} />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Records List */}
              <div style={{ paddingBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {activeTab === 'cigar' && (
                    loadingUserData ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 20px'
                      }}>
                        <Spin />
                      </div>
                    ) : userOrders.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: 'rgba(255, 255, 255, 0.6)'
                      }}>
                        <p style={{ margin: 0, fontSize: '14px' }}>
                          {t('usersAdmin.noCigarRecords')}
                        </p>
                      </div>
                    ) : (
                      <>
                        {userOrders.map((order) => {
                          const createdDate = order.createdAt instanceof Date 
                            ? order.createdAt 
                            : (order.createdAt as any)?.toDate 
                              ? (order.createdAt as any).toDate() 
                              : new Date(order.createdAt);
                          
                          return (
                            <div key={order.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '16px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                            }}>
                              <div style={{ flex: 1 }}>
                                <p style={{
                                  fontWeight: '600',
                                  color: '#FFFFFF',
                                  margin: 0
                                }}>
                                  订单 #{order.orderNo || order.id.slice(0, 8)}
                                </p>
                                <p style={{
                                  fontSize: '12px',
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  margin: '4px 0 0 0'
                                }}>
                                  {createdDate.toLocaleDateString('zh-CN')}
                                </p>
                                <p style={{
                                  fontSize: '12px',
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  margin: '4px 0 0 0'
                                }}>
                                  {order.items?.length || 0} 件商品
                                </p>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <p style={{
                                  fontSize: '18px',
                                  fontWeight: 'bold',
                                  color: '#F4AF25',
                                  margin: 0
                                }}>
                                  RM {order.total?.toFixed(2) || '0.00'}
                                </p>
                                <Tag 
                                  color={
                                    order.status === 'delivered' ? 'success' :
                                    order.status === 'shipped' ? 'processing' :
                                    order.status === 'confirmed' ? 'blue' :
                                    order.status === 'cancelled' ? 'error' :
                                    'default'
                                  }
                                  style={{ marginTop: '4px', fontSize: '10px' }}
                                >
                                  {
                                    order.status === 'delivered' ? '已送达' :
                                    order.status === 'shipped' ? '已发货' :
                                    order.status === 'confirmed' ? '已确认' :
                                    order.status === 'cancelled' ? '已取消' :
                                    '待确认'
                                  }
                                </Tag>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )
                  )}

                  {activeTab === 'points' && (
                    <>
                      {/* Sample Points Record 1 */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}>
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontWeight: '600',
                            color: '#FFFFFF',
                            margin: 0
                          }}>
                            购买雪茄获得积分
                          </p>
                          <p style={{
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            margin: '4px 0 0 0'
                          }}>
                            2024-01-15
                          </p>
                        </div>
                        <p style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#52c41a',
                          margin: 0
                        }}>
                          + 150
                        </p>
                      </div>

                      {/* Sample Points Record 2 */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}>
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontWeight: '600',
                            color: '#FFFFFF',
                            margin: 0
                          }}>
                            参加品鉴会获得积分
                          </p>
                          <p style={{
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            margin: '4px 0 0 0'
                          }}>
                            2023-12-20
                          </p>
                        </div>
                        <p style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#52c41a',
                          margin: 0
                        }}>
                          + 50
                        </p>
                      </div>
                    </>
                  )}

                  {activeTab === 'activity' && (
                    loadingUserData ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 20px'
                      }}>
                        <Spin />
                      </div>
                    ) : userEvents.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: 'rgba(255, 255, 255, 0.6)'
                      }}>
                        <p style={{ margin: 0, fontSize: '14px' }}>
                          {t('usersAdmin.noActivityRecords')}
                        </p>
                      </div>
                    ) : (
                      <>
                        {userEvents.map((event) => {
                          const startDate = event.schedule.startDate instanceof Date 
                            ? event.schedule.startDate 
                            : (event.schedule.startDate as any)?.toDate 
                              ? (event.schedule.startDate as any).toDate() 
                              : new Date(event.schedule.startDate);
                          
                          const isRegistered = event.participants?.registered?.includes(editing?.id || '');
                          const isCheckedIn = event.participants?.checkedIn?.includes(editing?.id || '');
                          
                          return (
                            <div key={event.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '16px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                              gap: '12px'
                            }}>
                              {/* 活动封面 */}
                              <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                flexShrink: 0,
                                background: 'rgba(255, 255, 255, 0.1)'
                              }}>
                                {event.coverImage ? (
                                  <img 
                                    src={event.coverImage} 
                                    alt={event.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'rgba(255, 255, 255, 0.3)'
                                  }}>
                                    <CalendarOutlined style={{ fontSize: '24px' }} />
                                  </div>
                                )}
                              </div>
                              
                              <div style={{ flex: 1 }}>
                                <p style={{
                                  fontWeight: '600',
                                  color: '#FFFFFF',
                                  margin: 0
                                }}>
                                  {event.title}
                                </p>
                                <p style={{
                                  fontSize: '12px',
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  margin: '4px 0 0 0'
                                }}>
                                  {startDate.toLocaleDateString('zh-CN')}
                                </p>
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                                <Tag 
                                  color={
                                    event.status === 'upcoming' ? 'blue' :
                                    event.status === 'ongoing' ? 'green' :
                                    event.status === 'completed' ? 'default' :
                                    'red'
                                  }
                                  style={{ margin: 0, fontSize: '10px' }}
                                >
                                  {
                                    event.status === 'upcoming' ? '即将开始' :
                                    event.status === 'ongoing' ? '进行中' :
                                    event.status === 'completed' ? '已结束' :
                                    '已取消'
                                  }
                                </Tag>
                                
                                {isCheckedIn && (
                                  <Tag color="success" style={{ margin: 0, fontSize: '10px' }}>
                                    已签到
                                  </Tag>
                                )}
                                {isRegistered && !isCheckedIn && (
                                  <Tag color="warning" style={{ margin: 0, fontSize: '10px' }}>
                                    已报名
                                  </Tag>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )
                  )}

                  {activeTab === 'referral' && (
                    <>
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: 'rgba(255, 255, 255, 0.6)'
                      }}>
                        <p style={{ margin: 0, fontSize: '14px' }}>
                          {t('usersAdmin.noReferralRecords')}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editing ? t('usersAdmin.editUser') : t('usersAdmin.addUser')}
        open={creating}
        onCancel={() => { 
          setCreating(false)
          setEditing(null)
        }}
        onOk={() => form.submit()}
        confirmLoading={loading}
        width={getModalWidth(isMobile, 520)}
        styles={getModalThemeStyles(isMobile, true)}
      >
          <Form 
          form={form}
          layout="vertical"
            style={{ color: '#FFFFFF' }}
            onFinish={async (values) => {
          setLoading(true)
          try {
            // 标准化手机号
            let normalizedPhone: string | undefined = undefined
            if (values.phone) {
              const normalized = normalizePhoneNumber(values.phone)
              if (!normalized) {
                message.error('手机号格式无效')
                setLoading(false)
                return
              }
              normalizedPhone = normalized
              
              // 检查手机号唯一性
              const phoneQuery = query(
                collection(db, 'users'), 
                where('profile.phone', '==', normalizedPhone), 
                limit(1)
              )
              const phoneSnap = await getDocs(phoneQuery)
              
              if (!phoneSnap.empty) {
                const existingUserId = phoneSnap.docs[0].id
                // 如果是编辑模式，检查是否是当前用户自己的手机号
                if (!editing || existingUserId !== editing.id) {
                  message.error('该手机号已被其他用户使用')
                  setLoading(false)
                  return
                }
              }
            }
            
            if (editing) {
              const res = await updateDocument<User>(COLLECTIONS.USERS, editing.id, {
                displayName: values.displayName,
                email: values.email,
                role: values.role,
                membership: { ...editing.membership, level: values.level },
                profile: { ...(editing as any).profile, phone: normalizedPhone },
              } as any)
                if (res.success) message.success(t('usersAdmin.saved'))
            } else {
              const res = await createDocument<User>(COLLECTIONS.USERS, {
                displayName: values.displayName,
                email: values.email,
                role: values.role,
                profile: { phone: normalizedPhone, preferences: { language: 'zh', notifications: true } },
                membership: { level: values.level, joinDate: new Date(), lastActive: new Date() },
                createdAt: new Date(),
                updatedAt: new Date(),
              } as any)
                if ((res as any).success) message.success(t('usersAdmin.created'))
            }
            const list = await getUsers()
            setUsers(list)
            setCreating(false)
            setEditing(null)
          } finally {
            setLoading(false)
          }
        }}>
          <Form.Item 
            label={<span style={{ color: '#FFFFFF' }}>{t('common.name')}</span>}
            name="displayName" 
            rules={[{ required: true, message: t('profile.nameRequired') }]}
          >
            <Input placeholder={t('auth.name')} />
          </Form.Item>

          <Form.Item 
            label={<span style={{ color: '#FFFFFF' }}>{t('auth.email')}</span>}
            name="email"
            rules={[
              { required: true, message: t('auth.emailRequired') },
              { type: 'email', message: t('auth.emailInvalid') }
            ]}
          >
            <Input placeholder={t('auth.email')} />
          </Form.Item>

          <Form.Item 
            label={<span style={{ color: '#FFFFFF' }}>{t('auth.phone')}</span>}
            name="phone" 
            rules={[{ required: true, message: t('profile.phoneRequired') }]}
          >
            <Input placeholder={t('auth.phone')} />
          </Form.Item>

          <Form.Item 
            label={<span style={{ color: '#FFFFFF' }}>{t('usersAdmin.role')}</span>}
            name="role" 
            rules={[{ required: true }]} 
            initialValue="member"
          >
            <Select>
              <Option value="admin">{t('common.admin')}</Option>
              <Option value="member">{t('common.member')}</Option>
              <Option value="guest">{t('common.guest')}</Option>
            </Select>
          </Form.Item>

          <Form.Item 
            label={<span style={{ color: '#FFFFFF' }}>{t('usersAdmin.membershipLevel')}</span>}
            name="level" 
            rules={[{ required: true }]} 
            initialValue="bronze"
          >
            <Select>
              <Option value="bronze">{t('usersAdmin.bronzeMember')}</Option>
              <Option value="silver">{t('usersAdmin.silverMember')}</Option>
              <Option value="gold">{t('usersAdmin.goldMember')}</Option>
              <Option value="platinum">{t('usersAdmin.platinumMember')}</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 删除确认 */}
      <Modal
        title={t('usersAdmin.deleteUser')}
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onOk={async () => {
          if (!deleting) return
          setLoading(true)
          try {
            const res = await deleteDocument(COLLECTIONS.USERS, deleting.id)
            if (res.success) {
              message.success(t('common.deleted'))
              const list = await getUsers()
              setUsers(list)
            }
          } finally {
            setLoading(false)
            setDeleting(null)
          }
        }}
        okButtonProps={{ danger: true }}
      >
        {t('usersAdmin.deleteUserConfirm', { name: deleting?.displayName })}
      </Modal>
    </div>
  )
}

export default AdminUsers
