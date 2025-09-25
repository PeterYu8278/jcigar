// 用户管理页面
import React, { useEffect, useMemo, useState } from 'react'
import { Table, Button, Tag, Space, Typography, Input, Select, message, Modal, Form, Switch, Dropdown, Checkbox, Row, Col, Spin } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'

const { Title } = Typography
const { Search } = Input
const { Option } = Select

import { getUsers, createDocument, updateDocument, deleteDocument, COLLECTIONS } from '../../../services/firebase/firestore'
import type { User } from '../../../types'
import { sendPasswordResetEmailFor } from '../../../services/firebase/auth'

const AdminUsers: React.FC = () => {
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

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const list = await getUsers()
        setUsers(list)
      } catch (e) {
        message.error('Failed to load users')
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
      case 'admin': return 'Admin'
      case 'member': return 'Member'
      case 'guest': return 'Guest'
      default: return 'Unknown'
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
      case 'bronze': return 'Bronze'
      case 'silver': return 'Silver'
      case 'gold': return 'Gold'
      case 'platinum': return 'Platinum'
      default: return 'Regular'
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
      case 'active': return 'Active'
      case 'inactive': return 'Inactive'
      default: return 'Unknown'
    }
  }

  const allColumns = [
    {
      title: 'User ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Name',
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
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
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
            <Button size="small" type={(selectedKeys[0] === undefined) ? 'primary' : 'text'} onClick={() => { setSelectedKeys([]); clearFilters?.(); confirm({ closeDropdown: true }) }}>All</Button>
            <Button size="small" type={selectedKeys[0] === 'admin' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['admin']); confirm({ closeDropdown: true }) }}>Admin</Button>
            <Button size="small" type={selectedKeys[0] === 'member' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['member']); confirm({ closeDropdown: true }) }}>Member</Button>
            <Button size="small" type={selectedKeys[0] === 'guest' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['guest']); confirm({ closeDropdown: true }) }}>Guest</Button>
          </div>
        </div>
        )
      },
      onFilter: (value: any, record: any) => {
        return !value || record.role === value
      },
    },
    {
      title: 'Level',
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
              <Button size="small" type={(selectedKeys[0] === undefined) ? 'primary' : 'text'} onClick={() => { setSelectedKeys([]); clearFilters?.(); confirm({ closeDropdown: true }) }}>All</Button>
              <Button size="small" type={selectedKeys[0] === 'bronze' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['bronze']); confirm({ closeDropdown: true }) }}>Bronze</Button>
              <Button size="small" type={selectedKeys[0] === 'silver' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['silver']); confirm({ closeDropdown: true }) }}>Silver</Button>
              <Button size="small" type={selectedKeys[0] === 'gold' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['gold']); confirm({ closeDropdown: true }) }}>Gold</Button>
              <Button size="small" type={selectedKeys[0] === 'platinum' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['platinum']); confirm({ closeDropdown: true }) }}>Platinum</Button>
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
      title: 'Status',
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
                if (res.success) message.success('Status updated')
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
              <Button size="small" type={(selectedKeys[0] === undefined) ? 'primary' : 'text'} onClick={() => { setSelectedKeys([]); clearFilters?.(); confirm({ closeDropdown: true }) }}>All</Button>
              <Button size="small" type={selectedKeys[0] === 'active' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['active']); confirm({ closeDropdown: true }) }}>Active</Button>
              <Button size="small" type={selectedKeys[0] === 'inactive' ? 'primary' : 'text'} onClick={() => { setSelectedKeys(['inactive']); confirm({ closeDropdown: true }) }}>Inactive</Button>
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
      title: 'Actions',
      key: 'action',
      render: (_: any, record: any) => (
        <Button size="small" onClick={() => {
          setEditing(record)
          form.setFieldsValue({
            displayName: record.displayName,
            email: record.email,
            role: record.role,
            level: record.membership?.level,
            phone: (record as any)?.profile?.phone,
          })
        }}>View</Button>
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

  // 持久化列显示设置
  useEffect(() => {
    try {
      localStorage.setItem('users.visibleCols', JSON.stringify(visibleCols))
    } catch {}
  }, [visibleCols])

  return (
    <div style={{ padding: '24px' }}>
      {!isMobile && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>User Management</Title>
        <Space>
          {selectedRowKeys.length > 1 && (
            <>
              <Button onClick={async () => {
                setLoading(true)
                try {
                  await Promise.all(selectedRowKeys.map(id => updateDocument<User>(COLLECTIONS.USERS, String(id), { status: 'inactive' } as any)))
                  message.success('Batch disabled')
                  const list = await getUsers()
                  setUsers(list)
                  setSelectedRowKeys([])
                } finally {
                  setLoading(false)
                }
              }}>Batch Disable</Button>
              <Button danger onClick={async () => {
                Modal.confirm({
                  title: 'Batch Delete Confirmation',
                  content: `Are you sure you want to delete ${selectedRowKeys.length} selected users?`,
                  okButtonProps: { danger: true },
                  onOk: async () => {
                    setLoading(true)
                    try {
                      await Promise.all(selectedRowKeys.map(id => deleteDocument(COLLECTIONS.USERS, String(id))))
                      message.success('Batch deleted')
                      const list = await getUsers()
                      setUsers(list)
                      setSelectedRowKeys([])
                    } finally {
                      setLoading(false)
                    }
                  }
                })
              }}>Batch Delete</Button>
            </>
          )}

          <Button onClick={() => {
            setKeyword('')
            setRoleFilter(undefined)
            setLevelFilter(undefined)
            setSelectedRowKeys([])
          }}>Reset Filters</Button>

          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setCreating(true)
          form.resetFields()
        }}>
          Add User
        </Button>
        </Space>
      </div>
      )}

      {/* 桌面：搜索和筛选 */}
      {!isMobile && (
      <div style={{ marginBottom: 16, padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
        <Space size="middle" wrap>
          <Search
            placeholder="Search user name or email"
            allowClear
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Select
              allowClear
              placeholder="Select Role"
              value={roleFilter}
              style={{ width: 160 }}
              onChange={(v) => setRoleFilter(v)}
            >
            <Option value="admin">Admin</Option>
            <Option value="member">Member</Option>
            <Option value="guest">Guest</Option>
          </Select>
            <Select
              allowClear
              placeholder="Select Level"
              value={levelFilter}
              style={{ width: 160 }}
              onChange={(v) => setLevelFilter(v)}
            >
            <Option value="bronze">Bronze</Option>
            <Option value="silver">Silver</Option>
            <Option value="gold">Gold</Option>
            <Option value="platinum">Platinum</Option>
          </Select>
            <Select
              allowClear
              placeholder="Select Status"
              value={statusFilter}
              style={{ width: 160 }}
              onChange={(v) => setStatusFilter(v)}
            >
            <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
          </Select>
          <Button type="primary" icon={<SearchOutlined />}>
            Search
          </Button>
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
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
        }}
      />
      )}

      {/* 移动端：列表视图 */}
      {isMobile && (
        <div>
          {/* 顶部栏 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Title level={4} style={{ margin: 0, color: '#fff' }}>Member Management</Title>
            <div style={{ width: 32 }} />
          </div>
          {/* 搜索框 */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search
              placeholder="Search members"
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
                  { key: 'all', label: 'All' },
                  { key: 'admin', label: 'Admin' },
                  { key: 'member', label: 'Member' },
                  { key: 'guest', label: 'Guest' },
                ],
                onClick: ({ key }) => setRoleFilter(key === 'all' ? undefined : (key as string)),
              }}
            >
              <Button shape="round">
                Role{roleFilter ? `: ${getRoleText(roleFilter)}` : ''}
              </Button>
            </Dropdown>
            <Dropdown
              menu={{
                items: [
                  { key: 'all', label: 'All' },
                  { key: 'bronze', label: 'Bronze' },
                  { key: 'silver', label: 'Silver' },
                  { key: 'gold', label: 'Gold' },
                  { key: 'platinum', label: 'Platinum' },
                ],
                onClick: ({ key }) => setLevelFilter(key === 'all' ? undefined : (key as string)),
              }}
            >
              <Button shape="round">
                Level{levelFilter ? `: ${getMembershipText(levelFilter)}` : ''}
              </Button>
            </Dropdown>
            <Dropdown
              menu={{
                items: [
                  { key: 'all', label: 'All' },
                  { key: 'active', label: 'Active' },
                  { key: 'inactive', label: 'Inactive' },
                ],
                onClick: ({ key }) => setStatusFilter(key === 'all' ? undefined : (key as string)),
              }}
            >
              <Button shape="round">
                Status{statusFilter ? `: ${getStatusText(statusFilter)}` : ''}
              </Button>
            </Dropdown>
            <div style={{ flex: 1 }} />
            <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={() => { setCreating(true); form.resetFields() }}>Add New User</Button>
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
                          <Button type="primary" onClick={() => {
                            setEditing(u)
                            form.setFieldsValue({
                              displayName: u.displayName,
                              email: u.email,
                              role: u.role,
                              level: u.membership?.level,
                              phone: (u as any)?.profile?.phone,
                            })
                          }}>View</Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              {groupedByInitial.length === 0 && (
                <div style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>No data</div>
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

      {/* 创建/编辑弹窗复用 */}
      <Modal
        title={editing ? 'Edit User' : 'Add User'}
        open={creating || !!editing}
        onCancel={() => { setCreating(false); setEditing(null) }}
        footer={(
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Space>
              {editing && (
                <>
                  <Button onClick={async () => {
                    if (!editing?.email) { message.warning('This user has no email'); return }
                    const res = await sendPasswordResetEmailFor(editing.email)
                    if (res.success) message.success('Password reset email sent')
                    else message.error(res.error?.message || 'Failed to send')
                  }}>Reset Password</Button>
                  <Button danger onClick={() => {
                    Modal.confirm({
                      title: 'Delete User',
                      content: `Are you sure you want to delete user ${editing?.displayName || ''}?`,
                      okButtonProps: { danger: true },
                      onOk: async () => {
                        setLoading(true)
                        try {
                          const res = await deleteDocument(COLLECTIONS.USERS, (editing as any).id)
                          if (res.success) {
                            message.success('Deleted')
                            const list = await getUsers()
                            setUsers(list)
                            setEditing(null)
                          }
                        } finally {
                          setLoading(false)
                        }
                      }
                    })
                  }}>Delete</Button>
                </>
              )}
            </Space>
            <Space>
              <Button onClick={() => { setCreating(false); setEditing(null) }}>取消</Button>
              <Button type="primary" loading={loading} onClick={() => form.submit()}>确认</Button>
            </Space>
          </div>
        )}
      >
        <Form form={form} layout="vertical" onFinish={async (values: { displayName: string; email?: string; role: User['role']; level: User['membership']['level']; phone: string }) => {
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
              if (res.success) message.success('已保存')
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
              if ((res as any).success) message.success('已创建')
            }
            const list = await getUsers()
            setUsers(list)
            setCreating(false)
            setEditing(null)
          } finally {
            setLoading(false)
          }
        }}>
          <Form.Item label="姓名" name="displayName" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="手机" name="phone" rules={[{ required: true, message: '请输入手机号码' }, { pattern: /^\+?\d{7,15}$/, message: '请输入有效的手机号(7-15位数字，可含+)' }]}> 
            <Input />
          </Form.Item>
          <Form.Item label="邮箱" name="email" rules={[{ type: 'email', message: '邮箱格式不正确' }]}> 
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item label="角色" name="role" rules={[{ required: true }]} initialValue="member"> 
            <Select>
              <Option value="admin">管理员</Option>
              <Option value="member">会员</Option>
              <Option value="guest">游客</Option>
            </Select>
          </Form.Item>
          <Form.Item label="会员等级" name="level" rules={[{ required: true }]} initialValue="bronze"> 
            <Select>
              <Option value="bronze">青铜</Option>
              <Option value="silver">白银</Option>
              <Option value="gold">黄金</Option>
              <Option value="platinum">铂金</Option>
            </Select>
          </Form.Item>
          
        </Form>
      </Modal>

      {/* 删除确认 */}
      <Modal
        title="删除用户"
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
        确认删除用户 {deleting?.displayName}？该操作不可撤销。
      </Modal>
    </div>
  )
}

export default AdminUsers
