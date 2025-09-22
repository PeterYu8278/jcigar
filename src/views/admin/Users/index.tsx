// 用户管理页面
import React, { useEffect, useMemo, useState } from 'react'
import { Table, Button, Tag, Space, Typography, Input, Select, DatePicker, message, Modal, Form, Switch, Dropdown, Checkbox } from 'antd'
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
  const [statusMap, setStatusMap] = useState<Record<string, 'active' | 'inactive'>>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    id: true,
    displayName: true,
    email: true,
    role: true,
    membership: true,
    joinDate: true,
    lastActive: true,
    status: true,
    action: true,
  })

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const list = await getUsers()
        setUsers(list)
      } catch (e) {
        message.error('加载用户失败')
      } finally {
        setLoading(false)
      }
    })()
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
      case 'admin': return '管理员'
      case 'member': return '会员'
      case 'guest': return '游客'
      default: return '未知'
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
      case 'bronze': return '青铜'
      case 'silver': return '白银'
      case 'gold': return '黄金'
      case 'platinum': return '铂金'
      default: return '普通'
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
      case 'active': return '活跃'
      case 'inactive': return '非活跃'
      default: return '未知'
    }
  }

  const allColumns = [
    {
      title: '用户ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '姓名',
      dataIndex: 'displayName',
      key: 'displayName',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>
          {getRoleText(role)}
        </Tag>
      ),
    },
    {
      title: '会员等级',
      dataIndex: ['membership', 'level'],
      key: 'membership',
      render: (level: string) => (
        <Tag color={getMembershipColor(level)}>
          {getMembershipText(level)}
        </Tag>
      ),
    },
    {
      title: '加入时间',
      dataIndex: ['membership', 'joinDate'],
      key: 'joinDate',
    },
    {
      title: '最后活跃',
      dataIndex: 'lastActive',
      key: 'lastActive',
    },
    {
      title: '状态',
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
                if (res.success) message.success('已更新状态')
              }}
              size="small"
            />
          </Space>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} size="small" onClick={() => {
            setEditing(record)
            form.setFieldsValue({
              displayName: record.displayName,
              email: record.email,
              role: record.role,
              level: record.membership?.level,
            })
          }}>
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} size="small" onClick={() => setDeleting(record)}>
            删除
          </Button>
          <Button type="link" size="small" onClick={async () => {
            const res = await sendPasswordResetEmailFor(record.email)
            if (res.success) message.success('已发送密码重置邮件')
            else message.error(res.error?.message || '发送失败')
          }}>
            重置密码
          </Button>
        </Space>
      ),
    },
  ]
  const columns = allColumns.filter(c => visibleCols[c.key as string] !== false)

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>用户管理</Title>
        <Space>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'export',
                  label: '导出 CSV',
                  onClick: async () => {
                    // 导出当前过滤后的列表
                    const data = users.filter(u => {
                      const kw = keyword.trim().toLowerCase()
                      const passKw = !kw || u.displayName?.toLowerCase().includes(kw) || u.email?.toLowerCase().includes(kw)
                      const passRole = !roleFilter || u.role === roleFilter
                      const passLevel = !levelFilter || u.membership?.level === levelFilter
                      return passKw && passRole && passLevel
                    })
                    const header = ['id','displayName','email','role','membership.level','membership.joinDate','lastActive','status']
                    const rows = data.map(u => [
                      u.id,
                      u.displayName,
                      u.email,
                      u.role,
                      u.membership?.level,
                      (u.membership?.joinDate as any) || '',
                      (u as any).lastActive || '',
                      (u as any).status || '',
                    ])
                    const csv = [header.join(','), ...rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g,'""')}"`).join(','))].join('\n')
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'users.csv'
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

          <Button onClick={() => {
            setKeyword('')
            setRoleFilter(undefined)
            setLevelFilter(undefined)
            setSelectedRowKeys([])
          }}>重置筛选</Button>

          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setCreating(true)
          form.resetFields()
        }}>
          添加用户
          </Button>
        </Space>
      </div>

      {/* 搜索和筛选 */}
      <div style={{ marginBottom: 16, padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
        <Space size="middle" wrap>
          <Search
            placeholder="搜索用户姓名或邮箱"
            allowClear
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select placeholder="选择角色" style={{ width: 120 }} allowClear value={roleFilter} onChange={setRoleFilter}>
            <Option value="admin">管理员</Option>
            <Option value="member">会员</Option>
            <Option value="guest">游客</Option>
          </Select>
          <Select placeholder="选择会员等级" style={{ width: 120 }} allowClear value={levelFilter} onChange={setLevelFilter}>
            <Option value="bronze">青铜</Option>
            <Option value="silver">白银</Option>
            <Option value="gold">黄金</Option>
            <Option value="platinum">铂金</Option>
          </Select>
          <Select placeholder="选择状态" style={{ width: 120 }} allowClear>
            <Option value="active">活跃</Option>
            <Option value="inactive">非活跃</Option>
          </Select>
          <DatePicker placeholder="加入时间" />
          <Button type="primary" icon={<SearchOutlined />}>
            搜索
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={users.filter(u => {
          const kw = keyword.trim().toLowerCase()
          const passKw = !kw || u.displayName?.toLowerCase().includes(kw) || u.email?.toLowerCase().includes(kw)
          const passRole = !roleFilter || u.role === roleFilter
          const passLevel = !levelFilter || u.membership?.level === levelFilter
          return passKw && passRole && passLevel
        })}
        rowKey="id"
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        title={() => (
          <Space>
            <Button disabled={selectedRowKeys.length === 0} onClick={async () => {
              setLoading(true)
              try {
                await Promise.all(selectedRowKeys.map(id => updateDocument<User>(COLLECTIONS.USERS, String(id), { status: 'inactive' } as any)))
                message.success('已批量禁用')
                const list = await getUsers()
                setUsers(list)
                setSelectedRowKeys([])
              } finally {
                setLoading(false)
              }
            }}>批量禁用</Button>
            <Button danger disabled={selectedRowKeys.length === 0} onClick={async () => {
              Modal.confirm({
                title: '批量删除确认',
                content: `确定删除选中的 ${selectedRowKeys.length} 个用户吗？`,
                okButtonProps: { danger: true },
                onOk: async () => {
                  setLoading(true)
                  try {
                    await Promise.all(selectedRowKeys.map(id => deleteDocument(COLLECTIONS.USERS, String(id))))
                    message.success('已批量删除')
                    const list = await getUsers()
                    setUsers(list)
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
          total: users.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
        }}
      />

      {/* 创建/编辑弹窗复用 */}
      <Modal
        title={editing ? '编辑用户' : '添加用户'}
        open={creating || !!editing}
        onCancel={() => { setCreating(false); setEditing(null) }}
        onOk={() => form.submit()}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={async (values: { displayName: string; email: string; role: User['role']; level: User['membership']['level'] }) => {
          setLoading(true)
          try {
            if (editing) {
              const res = await updateDocument<User>(COLLECTIONS.USERS, editing.id, {
                displayName: values.displayName,
                email: values.email,
                role: values.role,
                membership: { ...editing.membership, level: values.level },
              })
              if (res.success) message.success('已保存')
            } else {
              const res = await createDocument<User>(COLLECTIONS.USERS, {
                displayName: values.displayName,
                email: values.email,
                role: values.role,
                profile: { preferences: { language: 'zh', notifications: true } },
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
          <Form.Item label="邮箱" name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="角色" name="role" rules={[{ required: true }]}> 
            <Select>
              <Option value="admin">管理员</Option>
              <Option value="member">会员</Option>
              <Option value="guest">游客</Option>
            </Select>
          </Form.Item>
          <Form.Item label="会员等级" name="level" rules={[{ required: true }]}> 
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
