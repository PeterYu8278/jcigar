/**
 * 用户管理页面 - 重构版
 * 使用通用 DataTable 组件和新的工具函数
 */

import React, { useEffect, useState } from 'react'
import { Tag, Space, Button, Modal, Form, Input, Select, Switch, message, Tooltip } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined, MailOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

// 新组件和工具
import DataTable, { type DataTableColumn } from '../../../components/data/DataTable'
import FormLayout, { type FormSection } from '../../../components/forms/FormLayout'
import FormActions, { FormActionPresets } from '../../../components/forms/FormActions'
import { formatDate } from '../../../utils/format'
import { cachedRequest } from '../../../utils/cache'

// 服务和类型
import { getUsers, createDocument, updateDocument, deleteDocument, COLLECTIONS } from '../../../services/firebase/firestore'
import { sendPasswordResetEmailFor } from '../../../services/firebase/auth'
import type { User } from '../../../types'

const { Option } = Select

const AdminUsersRefactored: React.FC = () => {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm()

  // 加载用户数据（使用缓存）
  const loadUsers = async () => {
    setLoading(true)
    try {
      const list = await cachedRequest<User[]>('admin-users', () => getUsers(), { ttl: 30000 })
      setUsers(list)
    } catch (error) {
      message.error(t('messages.dataLoadFailed'))
      console.error('Load users error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // 获取角色颜色
  const getRoleColor = (role: string): string => {
    const colors: Record<string, string> = {
      admin: 'red',
      member: 'blue',
      guest: 'default'
    }
    return colors[role] || 'default'
  }

  // 获取会员等级颜色
  const getMembershipColor = (level: string): string => {
    const colors: Record<string, string> = {
      bronze: '#cd7f32',
      silver: '#c0c0c0',
      gold: '#ffd700',
      platinum: '#e5e4e2'
    }
    return colors[level] || 'default'
  }

  // 表格列定义
  const columns: DataTableColumn<User>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => (
        <Tooltip title={id}>
          <span style={{ color: 'var(--cigar-text-secondary)' }}>
            {id.substring(0, 8)}...
          </span>
        </Tooltip>
      )
    },
    {
      title: t('user.displayName'),
      dataIndex: 'displayName',
      key: 'displayName',
      searchable: true,
      render: (name: string, record: User) => (
        <Space>
          {record.photoURL && (
            <img
              src={record.photoURL}
              alt={name}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          )}
          <span style={{ color: 'var(--cigar-text-primary)', fontWeight: 500 }}>
            {name}
          </span>
        </Space>
      )
    },
    {
      title: t('user.email'),
      dataIndex: 'email',
      key: 'email',
      searchable: true,
      render: (email: string) => (
        <span style={{ color: 'var(--cigar-text-secondary)' }}>{email}</span>
      )
    },
    {
      title: t('user.phone'),
      dataIndex: 'phone',
      key: 'phone',
      searchable: true,
      render: (phone: string) => (
        <span style={{ color: 'var(--cigar-text-secondary)' }}>{phone || '-'}</span>
      )
    },
    {
      title: t('user.role'),
      dataIndex: 'role',
      key: 'role',
      filterable: true,
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>
          {t(`user.roles.${role}`)}
        </Tag>
      )
    },
    {
      title: t('user.membership'),
      dataIndex: 'membership',
      key: 'membership',
      filterable: true,
      render: (level: string) => (
        <Tag color={getMembershipColor(level)}>
          {t(`user.levels.${level}`)}
        </Tag>
      )
    },
    {
      title: t('user.status'),
      dataIndex: 'status',
      key: 'status',
      filterable: true,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {t(`common.${status}`)}
        </Tag>
      )
    },
    {
      title: t('user.lastActive'),
      dataIndex: 'lastActive',
      key: 'lastActive',
      render: (date: any) => (
        <span style={{ color: 'var(--cigar-text-secondary)' }}>
          {date ? formatDate(date) : '-'}
        </span>
      )
    },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_: any, record: User) => (
        <Space size="small">
          <Tooltip title={t('common.view')}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
              style={{ color: 'var(--cigar-gold-primary)' }}
            />
          </Tooltip>
          <Tooltip title={t('common.edit')}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ color: 'var(--cigar-gold-primary)' }}
            />
          </Tooltip>
          <Tooltip title={t('user.resetPassword')}>
            <Button
              type="text"
              icon={<MailOutlined />}
              onClick={() => handleResetPassword(record)}
              style={{ color: 'var(--cigar-gold-primary)' }}
            />
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ]

  // 表单配置
  const getFormSections = (): FormSection[] => [
    {
      title: t('user.basicInfo'),
      fields: [
        {
          type: 'text',
          name: 'displayName',
          label: t('user.displayName'),
          placeholder: t('user.pleaseInputDisplayName'),
          required: true,
          rules: [{ required: true, message: t('user.displayNameRequired') }]
        },
        {
          type: 'email',
          name: 'email',
          label: t('user.email'),
          placeholder: t('user.pleaseInputEmail'),
          required: true,
          disabled: modalMode === 'edit',
          rules: [
            { required: true, message: t('user.emailRequired') },
            { type: 'email', message: t('user.emailInvalid') }
          ]
        },
        {
          type: 'text',
          name: 'phone',
          label: t('user.phone'),
          placeholder: t('user.pleaseInputPhone')
        }
      ],
      columns: 1
    },
    {
      title: t('user.roleAndMembership'),
      fields: [
        {
          type: 'select',
          name: 'role',
          label: t('user.role'),
          placeholder: t('user.pleaseSelectRole'),
          required: true,
          options: [
            { label: t('user.roles.admin'), value: 'admin' },
            { label: t('user.roles.member'), value: 'member' },
            { label: t('user.roles.guest'), value: 'guest' }
          ],
          rules: [{ required: true, message: t('user.roleRequired') }]
        },
        {
          type: 'select',
          name: 'membership',
          label: t('user.membership'),
          placeholder: t('user.pleaseSelectMembership'),
          options: [
            { label: t('user.levels.bronze'), value: 'bronze' },
            { label: t('user.levels.silver'), value: 'silver' },
            { label: t('user.levels.gold'), value: 'gold' },
            { label: t('user.levels.platinum'), value: 'platinum' }
          ]
        }
      ],
      columns: 2
    },
    {
      title: t('user.additionalInfo'),
      fields: [
        {
          type: 'textarea',
          name: 'address',
          label: t('user.address'),
          placeholder: t('user.pleaseInputAddress'),
          rows: 3
        },
        {
          type: 'switch',
          name: 'status',
          label: t('user.status'),
          render: (value, onChange) => (
            <Switch
              checked={value === 'active'}
              onChange={(checked) => onChange(checked ? 'active' : 'inactive')}
              checkedChildren={t('common.active')}
              unCheckedChildren={t('common.inactive')}
            />
          )
        }
      ],
      columns: 1
    }
  ]

  // 处理查看
  const handleView = (user: User) => {
    Modal.info({
      title: t('user.userDetails'),
      width: 600,
      content: (
        <div style={{ color: 'var(--cigar-text-primary)' }}>
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>{t('user.displayName')}:</strong> {user.displayName}</p>
          <p><strong>{t('user.email')}:</strong> {user.email}</p>
          <p><strong>{t('user.phone')}:</strong> {user.phone || '-'}</p>
          <p><strong>{t('user.role')}:</strong> {t(`user.roles.${user.role}`)}</p>
          <p><strong>{t('user.membership')}:</strong> {t(`user.levels.${user.membership}`)}</p>
          <p><strong>{t('user.status')}:</strong> {t(`common.${user.status}`)}</p>
          <p><strong>{t('user.lastActive')}:</strong> {user.lastActive ? formatDate(user.lastActive) : '-'}</p>
        </div>
      )
    })
  }

  // 处理创建
  const handleCreate = () => {
    setModalMode('create')
    setEditingUser(null)
    form.resetFields()
    form.setFieldsValue({
      role: 'member',
      membership: 'bronze',
      status: 'active'
    })
    setModalVisible(true)
  }

  // 处理编辑
  const handleEdit = (user: User) => {
    setModalMode('edit')
    setEditingUser(user)
    form.setFieldsValue({
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      membership: user.membership,
      address: user.address,
      status: user.status
    })
    setModalVisible(true)
  }

  // 处理删除
  const handleDelete = (user: User) => {
    Modal.confirm({
      title: t('user.confirmDelete'),
      content: t('user.deleteWarning', { name: user.displayName }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteDocument(COLLECTIONS.USERS, user.id)
          message.success(t('messages.deleteSuccess'))
          await loadUsers()
        } catch (error) {
          message.error(t('messages.deleteFailed'))
          console.error('Delete user error:', error)
        }
      }
    })
  }

  // 处理重置密码
  const handleResetPassword = (user: User) => {
    Modal.confirm({
      title: t('user.resetPassword'),
      content: t('user.resetPasswordConfirm', { email: user.email }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await sendPasswordResetEmailFor(user.email)
          message.success(t('user.resetPasswordEmailSent'))
        } catch (error) {
          message.error(t('user.resetPasswordFailed'))
          console.error('Reset password error:', error)
        }
      }
    })
  }

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (modalMode === 'create') {
        await createDocument(COLLECTIONS.USERS, {
          ...values,
          createdAt: new Date(),
          lastActive: new Date()
        })
        message.success(t('messages.createSuccess'))
      } else if (editingUser) {
        await updateDocument(COLLECTIONS.USERS, editingUser.id, {
          ...values,
          updatedAt: new Date()
        })
        message.success(t('messages.updateSuccess'))
      }

      setModalVisible(false)
      await loadUsers()
    } catch (error) {
      console.error('Submit error:', error)
    }
  }

  // 批量操作
  const batchActions = [
    {
      key: 'activate',
      label: t('user.batchActivate'),
      action: async (selectedUsers: User[]) => {
        try {
          await Promise.all(
            selectedUsers.map(user =>
              updateDocument(COLLECTIONS.USERS, user.id, { status: 'active' })
            )
          )
          message.success(t('messages.batchUpdateSuccess'))
          await loadUsers()
        } catch (error) {
          message.error(t('messages.batchUpdateFailed'))
        }
      }
    },
    {
      key: 'deactivate',
      label: t('user.batchDeactivate'),
      action: async (selectedUsers: User[]) => {
        try {
          await Promise.all(
            selectedUsers.map(user =>
              updateDocument(COLLECTIONS.USERS, user.id, { status: 'inactive' })
            )
          )
          message.success(t('messages.batchUpdateSuccess'))
          await loadUsers()
        } catch (error) {
          message.error(t('messages.batchUpdateFailed'))
        }
      },
      danger: true
    }
  ]

  // 筛选器配置
  const filters = [
    {
      key: 'role',
      label: t('user.role'),
      options: [
        { label: t('user.roles.admin'), value: 'admin' },
        { label: t('user.roles.member'), value: 'member' },
        { label: t('user.roles.guest'), value: 'guest' }
      ]
    },
    {
      key: 'membership',
      label: t('user.membership'),
      options: [
        { label: t('user.levels.bronze'), value: 'bronze' },
        { label: t('user.levels.silver'), value: 'silver' },
        { label: t('user.levels.gold'), value: 'gold' },
        { label: t('user.levels.platinum'), value: 'platinum' }
      ]
    },
    {
      key: 'status',
      label: t('user.status'),
      options: [
        { label: t('common.active'), value: 'active' },
        { label: t('common.inactive'), value: 'inactive' }
      ]
    }
  ]

  return (
    <div>
      <DataTable<User>
        data={users}
        columns={columns}
        loading={loading}
        searchable
        searchPlaceholder={t('user.searchPlaceholder')}
        filterable
        filters={filters}
        batchActions={batchActions}
        toolbar={{
          title: t('navigation.users'),
          actions: [
            <Button
              key="create"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              {t('user.createUser')}
            </Button>
          ],
          showRefresh: true,
          showExport: true
        }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true
        }}
        onRefresh={loadUsers}
        onExport={(data) => {
          const json = JSON.stringify(data, null, 2)
          const blob = new Blob([json], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `users-${Date.now()}.json`
          a.click()
          URL.revokeObjectURL(url)
        }}
      />

      {/* 创建/编辑模态框 */}
      <Modal
        title={modalMode === 'create' ? t('user.createUser') : t('user.editUser')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
        style={{
          background: 'var(--cigar-black-secondary)',
          borderColor: 'var(--cigar-border-primary)'
        }}
      >
        <FormLayout
          form={form}
          sections={getFormSections()}
          layout="vertical"
        />
        
        <FormActions
          actions={FormActionPresets.saveCancel(handleSubmit, () => setModalVisible(false))}
          align="right"
        />
      </Modal>
    </div>
  )
}

export default AdminUsersRefactored
