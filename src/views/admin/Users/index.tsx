// 用户管理页面
import React, { useEffect, useMemo, useState } from 'react'
import { Table, Button, Tag, Space, Typography, Input, Select, message, Modal, Form, Switch, Dropdown, Checkbox, Row, Col, Spin } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, EyeOutlined, ArrowLeftOutlined } from '@ant-design/icons'

const { Title } = Typography
const { Search } = Input
const { Option } = Select

import { getUsers, createDocument, updateDocument, deleteDocument, COLLECTIONS } from '../../../services/firebase/firestore'
import type { User } from '../../../types'
import { sendPasswordResetEmailFor } from '../../../services/firebase/auth'
import { useTranslation } from 'react-i18next'

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
  const [activeTab, setActiveTab] = useState<'purchase' | 'points' | 'activity' | 'referral'>('purchase')

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
    return users.filter(u => {
      const passKw = !kw || u.displayName?.toLowerCase().includes(kw) || (u.email || '').toLowerCase().includes(kw) || ((u as any)?.profile?.phone || '').includes(keyword.trim())
                      const passRole = !roleFilter || u.role === roleFilter
                      const passLevel = !levelFilter || u.membership?.level === levelFilter
      const status = statusMap[u.id] || (u as any).status || 'active'
      const passStatus = !statusFilter || status === statusFilter
      return passKw && passRole && passLevel && passStatus
    })
  }, [users, keyword, roleFilter, levelFilter, statusFilter])

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
    <div style={{ paddingRight: '24px' }}>
      {!isMobile && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent'}}>{t('navigation.users')}</Title>
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

          <Button onClick={() => {
            setKeyword('')
            setRoleFilter(undefined)
            setLevelFilter(undefined)
            setSelectedRowKeys([])
          }}>{t('common.resetFilters')}</Button>

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
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}>
            <SearchOutlined />
            {t('common.search')}
          </button>
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
        <div>
          {/* 顶部栏 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent', marginBottom: 12 }}>{t('navigation.users')}</h1>
          <div style={{ width: 32 }} />
          </div>
          {/* 搜索框 */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
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
              <Button shape="round">
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
              <Button shape="round">
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
              <Button shape="round">
                {t('usersAdmin.status')}{statusFilter ? `: ${getStatusText(statusFilter)}` : ''}
              </Button>
            </Dropdown>
            <div style={{ flex: 1 }} />
            <button onClick={() => { setCreating(true); form.resetFields() }} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, padding: '8px 16px', background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 700, cursor: 'pointer' }}>{t('usersAdmin.addUser')}</button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <Spin />
            </div>
          ) : (
            <div>
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
              {/* 右侧字母索引（可拖动浮动） */}
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
                    return (
                      <a
                        key={letter}
                        onClick={(e) => {
                          e.preventDefault()
                          const el = document.getElementById(`group-${letter}`)
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }}
                        style={{
                          color: enabled ? '#f4af25' : '#777',
                          textDecoration: 'none',
                          padding: '2px 4px',
                          cursor: enabled ? 'pointer' : 'default',
                        }}
                      >
                        {letter}
                      </a>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
            background: 'linear-gradient(180deg, #221c10 0%, #181611 100%)',
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
                margin: 0
              }}>
                {t('usersAdmin.memberDetails')}
              </h1>
              <Button
                type="text"
                onClick={() => setEditing(null)}
                style={{ color: '#FFFFFF', fontSize: '20px', minWidth: 'auto' }}
              >
                ×
              </Button>
            </div>

            {/* User Profile Section */}
            <div style={{ padding: '24px', textAlign: 'center' }}>
              {/* Avatar */}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
                <div style={{
                  width: '128px',
                  height: '128px',
                  borderRadius: '50%',
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  color: '#221c10',
                  fontWeight: 'bold',
                  boxShadow: '0 8px 32px rgba(244, 175, 37, 0.3)'
                }}>
                  {editing.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #221c10'
                }}>
                  <span style={{ color: '#221c10', fontSize: '16px' }}>👑</span>
                </div>
              </div>

              {/* User Info */}
              <div style={{ textAlign: 'center' }}>
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
                  <span>{t('usersAdmin.membershipLevel')}: {getMembershipText(editing.membership?.level || 'bronze')}</span>
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
                  setEditing(null)
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
                  marginTop: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {t('usersAdmin.editMemberInfo')}
              </button>
            </div>

            {/* Tabs Section */}
            <div style={{ padding: '0 16px' }}>
              <div style={{
                borderBottom: '1px solid rgba(244, 175, 37, 0.2)',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  overflowX: 'auto',
                  paddingBottom: '16px'
                }}>
                  <button 
                    style={{
                      padding: '16px 4px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: activeTab === 'purchase' ? '#F4AF25' : 'rgba(255, 255, 255, 0.6)',
                      borderBottom: '2px solid transparent',
                      whiteSpace: activeTab === 'purchase' ? 'nowrap' : 'none',
                      position: 'relative' as const,
                      backgroundImage: activeTab === 'purchase' ? 'linear-gradient(to right,#FDE08D,#C48D3A)' : 'none',
                      backgroundSize: activeTab === 'purchase' ? '100% 2px' : 'none',
                      backgroundRepeat: activeTab === 'purchase' ? 'no-repeat' : 'none',
                      backgroundPosition: activeTab === 'purchase' ? 'bottom' : 'none',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onClick={() => setActiveTab('purchase')}
                  >
                    {t('usersAdmin.purchaseRecords')}
                  </button>
                  <button 
                    style={{
                      padding: '16px 4px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: activeTab === 'points' ? '#F4AF25' : 'rgba(255, 255, 255, 0.6)',
                      borderBottom: '2px solid transparent',
                      whiteSpace: activeTab === 'points' ? 'nowrap' : 'none',
                      backgroundImage: activeTab === 'points' ? 'linear-gradient(to right,#FDE08D,#C48D3A)' : 'none',
                      backgroundSize: activeTab === 'points' ? '100% 2px' : 'none',
                      backgroundRepeat: activeTab === 'points' ? 'no-repeat' : 'none',
                      backgroundPosition: activeTab === 'points' ? 'bottom' : 'none',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onClick={() => setActiveTab('points')}
                  >
                    {t('usersAdmin.pointsRecords')}
                  </button>
                  <button 
                    style={{
                      padding: '16px 4px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: activeTab === 'activity' ? '#F4AF25' : 'rgba(255, 255, 255, 0.6)',
                      borderBottom: '2px solid transparent',
                      whiteSpace: activeTab === 'activity' ? 'nowrap' : 'none',
                      backgroundImage: activeTab === 'activity' ? 'linear-gradient(to right,#FDE08D,#C48D3A)' : 'none',
                      backgroundSize: activeTab === 'activity' ? '100% 2px' : 'none',
                      backgroundRepeat: activeTab === 'activity' ? 'no-repeat' : 'none',
                      backgroundPosition: activeTab === 'activity' ? 'bottom' : 'none',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onClick={() => setActiveTab('activity')}
                  >
                    {t('usersAdmin.activityRecords')}
                  </button>
                  <button 
                    style={{
                      padding: '16px 4px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: activeTab === 'referral' ? '#F4AF25' : 'rgba(255, 255, 255, 0.6)',
                      borderBottom: '2px solid transparent',
                      whiteSpace: activeTab === 'referral' ? 'nowrap' : 'none',
                      backgroundImage: activeTab === 'referral' ? 'linear-gradient(to right,#FDE08D,#C48D3A)' : 'none',
                      backgroundSize: activeTab === 'referral' ? '100% 2px' : 'none',
                      backgroundRepeat: activeTab === 'referral' ? 'no-repeat' : 'none',
                      backgroundPosition: activeTab === 'referral' ? 'bottom' : 'none',
                      background:  'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onClick={() => setActiveTab('referral')}
                  >
                    {t('usersAdmin.referralRecords')}
                  </button>
                </div>
              </div>

              {/* Records List */}
              <div style={{ paddingBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {activeTab === 'purchase' && (
                    <>
                      {/* Sample Purchase Record 1 */}
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
                            {t('usersAdmin.purchaseCigar')}
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
                          color: '#F4AF25',
                          margin: 0
                        }}>
                          - ￥1500
                        </p>
                      </div>

                      {/* Sample Purchase Record 2 */}
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
                            {t('usersAdmin.attendTasting')}
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
                          color: '#F4AF25',
                          margin: 0
                        }}>
                          - ￥500
                        </p>
                      </div>

                      {/* Sample Purchase Record 3 */}
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
                            {t('usersAdmin.purchaseAccessories')}
                          </p>
                          <p style={{
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            margin: '4px 0 0 0'
                          }}>
                            2023-11-05
                          </p>
                        </div>
                        <p style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#F4AF25',
                          margin: 0
                        }}>
                          - ￥300
                        </p>
                      </div>
                    </>
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
                    <>
                      {/* Sample Activity Record 1 */}
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
                            参加雪茄品鉴会
                          </p>
                          <p style={{
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            margin: '4px 0 0 0'
                          }}>
                            2024-01-20
                          </p>
                        </div>
                        <p style={{
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: '#1890ff',
                          margin: 0
                        }}>
                          已参加
                        </p>
                      </div>

                      {/* Sample Activity Record 2 */}
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
                            会员等级升级
                          </p>
                          <p style={{
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            margin: '4px 0 0 0'
                          }}>
                            2023-12-15
                          </p>
                        </div>
                        <p style={{
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: '#f4af25',
                          margin: 0
                        }}>
                          青铜 → 白银
                        </p>
                      </div>
                    </>
                  )}

                  {activeTab === 'referral' && (
                    <>
                      {/* Sample Referral Record 1 */}
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
                            推荐好友：张三
                          </p>
                          <p style={{
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            margin: '4px 0 0 0'
                          }}>
                            2024-01-10
                          </p>
                        </div>
                        <p style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#52c41a',
                          margin: 0
                        }}>
                          + 100
                        </p>
                      </div>

                      {/* Sample Referral Record 2 */}
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
                            推荐好友：李四
                          </p>
                          <p style={{
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            margin: '4px 0 0 0'
                          }}>
                            2023-11-25
                          </p>
                        </div>
                        <p style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#52c41a',
                          margin: 0
                        }}>
                          + 100
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
        title={creating ? t('usersAdmin.addUser') : t('usersAdmin.editUser')}
        open={creating}
        onCancel={() => { setCreating(false) }}
        footer={null}
        width={400}
        style={{ top: 20 }}
      >
        <div style={{ 
          background: 'linear-gradient(165deg, #2a2a2a 0%, #1a1a1a 100%)',
          borderRadius: 16,
          padding: 24,
          margin: -24
        }}>
          <Form form={form} layout="vertical" onFinish={async (values) => {
          setLoading(true)
          try {
            if (editing) {
              const res = await updateDocument<User>(COLLECTIONS.USERS, editing.id, {
                displayName: values.displayName,
                email: values.email,
                role: values.role,
                membership: { ...editing.membership, level: values.level },
                profile: { ...(editing as any).profile, phone: values.phone },
              } as any)
                if (res.success) message.success(t('usersAdmin.saved'))
            } else {
              const res = await createDocument<User>(COLLECTIONS.USERS, {
                displayName: values.displayName,
                email: values.email,
                role: values.role,
                profile: { phone: values.phone, preferences: { language: 'zh', notifications: true } },
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
            <div style={{ marginBottom: 32 }}>
              <Form.Item 
                name="displayName" 
                rules={[{ required: true, message: t('profile.nameRequired') }]}
                style={{ marginBottom: 0 }}
              >
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(244, 175, 37, 0.2)',
                  borderRadius: 12,
                  padding: 24,
                  transition: 'all 0.3s ease'
                }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 14, 
                    fontWeight: 500, 
                    color: 'rgba(244, 175, 37, 0.8)', 
                    marginBottom: 8 
                  }}>
                    {t('common.name')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ 
                      fontSize: 20, 
                      color: 'rgba(244, 175, 37, 0.7)',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      👤
                    </span>
                    <Input 
                      style={{
                        background: 'transparent',
                        color: '#fff',
                        border: 'none',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: 0,
                        padding: '8px 0',
                        fontSize: 16,
                        boxShadow: 'none'
                      }}
                      placeholder="请输入姓名"
                    />
                  </div>
                </div>
          </Form.Item>
            </div>

            <div style={{ marginBottom: 32 }}>
              <Form.Item 
                name="email"
                style={{ marginBottom: 0 }}
              >
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(244, 175, 37, 0.2)',
                  borderRadius: 12,
                  padding: 24,
                  transition: 'all 0.3s ease'
                }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 14, 
                    fontWeight: 500, 
                    color: 'rgba(244, 175, 37, 0.8)', 
                    marginBottom: 8 
                  }}>
                    {t('auth.email')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ 
                      fontSize: 20, 
                      color: 'rgba(244, 175, 37, 0.7)',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      ✉️
                    </span>
            <Input 
                      style={{
                        background: 'transparent',
                        color: '#fff',
                        border: 'none',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: 0,
                        padding: '8px 0',
                        fontSize: 16,
                        boxShadow: 'none'
                      }}
                      placeholder="请输入邮箱"
                    />
                  </div>
                </div>
          </Form.Item>
            </div>

            <div style={{ marginBottom: 32 }}>
              <Form.Item 
                name="phone" 
                rules={[{ required: true, message: t('profile.phoneRequired') }]}
                style={{ marginBottom: 0 }}
              >
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(244, 175, 37, 0.2)',
                  borderRadius: 12,
                  padding: 24,
                  transition: 'all 0.3s ease'
                }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 14, 
                    fontWeight: 500, 
                    color: 'rgba(244, 175, 37, 0.8)', 
                    marginBottom: 8 
                  }}>
                    {t('auth.phone')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ 
                      fontSize: 20, 
                      color: 'rgba(244, 175, 37, 0.7)',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      📱
                    </span>
                    <Input 
                      style={{
                        background: 'transparent',
                        color: '#fff',
                        border: 'none',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: 0,
                        padding: '8px 0',
                        fontSize: 16,
                        boxShadow: 'none'
                      }}
                      placeholder="请输入手机号"
                    />
                  </div>
                </div>
          </Form.Item>
            </div>

            <div style={{ marginBottom: 32 }}>
              <Form.Item 
                name="role" 
                rules={[{ required: true }]} 
                initialValue="member"
                style={{ marginBottom: 0 }}
              >
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(244, 175, 37, 0.2)',
                  borderRadius: 12,
                  padding: 24,
                  transition: 'all 0.3s ease'
                }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 14, 
                    fontWeight: 500, 
                    color: 'rgba(244, 175, 37, 0.8)', 
                    marginBottom: 8 
                  }}>
                    {t('usersAdmin.role')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ 
                      fontSize: 20, 
                      color: 'rgba(244, 175, 37, 0.7)',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      👥
                    </span>
                    <Select
                      style={{ 
                        flex: 1,
                        background: 'transparent'
                      }}
                      dropdownStyle={{
                        background: '#2a2a2a',
                        border: '1px solid rgba(244, 175, 37, 0.2)'
                      }}
                    >
                      <Option value="admin">{t('common.admin')}</Option>
                      <Option value="member">{t('common.member')}</Option>
                      <Option value="guest">{t('common.guest')}</Option>
            </Select>
                  </div>
                </div>
          </Form.Item>
            </div>

            <div style={{ marginBottom: 32 }}>
              <Form.Item 
                name="level" 
                rules={[{ required: true }]} 
                initialValue="bronze"
                style={{ marginBottom: 0 }}
              >
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(244, 175, 37, 0.2)',
                  borderRadius: 12,
                  padding: 24,
                  transition: 'all 0.3s ease'
                }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 14, 
                    fontWeight: 500, 
                    color: 'rgba(244, 175, 37, 0.8)', 
                    marginBottom: 8 
                  }}>
                    {t('usersAdmin.membershipLevel')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ 
                      fontSize: 20, 
                      color: 'rgba(244, 175, 37, 0.7)',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      🏆
                    </span>
                    <Select
                      style={{ 
                        flex: 1,
                        background: 'transparent'
                      }}
                      dropdownStyle={{
                        background: '#2a2a2a',
                        border: '1px solid rgba(244, 175, 37, 0.2)'
                      }}
                    >
                      <Option value="bronze">{t('usersAdmin.bronzeMember')}</Option>
                      <Option value="silver">{t('usersAdmin.silverMember')}</Option>
                      <Option value="gold">{t('usersAdmin.goldMember')}</Option>
                      <Option value="platinum">{t('usersAdmin.platinumMember')}</Option>
            </Select>
                  </div>
                </div>
          </Form.Item>
            </div>

            <div style={{ marginTop: 64 }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: 16,
                  fontWeight: 'bold',
                  color: '#1a1a1a',
                  textTransform: 'uppercase',
                  borderRadius: 8,
                  background: 'linear-gradient(to right, #DAA520, #F4AF25, #DAA520)',
                  backgroundSize: '200% auto',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 10px 25px -5px rgba(244, 175, 37, 0.3), 0 8px 10px -6px rgba(244, 175, 37, 0.2)',
                  opacity: loading ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundPosition = 'right center'
                  e.currentTarget.style.transform = 'scale(1.02)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundPosition = 'left center'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                {loading ? '保存中...' : '保存更改'}
              </button>
            </div>
        </Form>
        </div>
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
              message.success('已删除')
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
