// 用户管理页面
import React, { useEffect, useMemo, useState } from 'react'
import { Table, Button, Tag, Space, Typography, Input, Select, message, Modal, Form, Switch, Dropdown, Checkbox, Row, Col, Spin, App } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, EyeOutlined, ArrowLeftOutlined, CalendarOutlined, ShoppingOutlined, TrophyOutlined } from '@ant-design/icons'
import { MemberProfileCard } from '../../../components/common/MemberProfileCard'
import { ProfileView } from '../../../components/common/ProfileView'
import { ReferralTreeView } from '../../../components/admin/ReferralTreeView'

const { Title, Text } = Typography
const { Search } = Input
const { Option } = Select

import { getUsers, createDocument, updateDocument, deleteDocument, COLLECTIONS, getEventsByUser, getOrdersByUser } from '../../../services/firebase/firestore'
import { getUsersPaginated } from '../../../services/firebase/paginatedQueries'
import { usePaginatedData } from '../../../hooks/usePaginatedData'
import type { User, Event, Order } from '../../../types'
import { sendPasswordResetEmailFor } from '../../../services/firebase/auth'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../../store/modules/auth'
import { getModalThemeStyles, getModalWidth } from '../../../config/modalTheme'
import { normalizePhoneNumber } from '../../../utils/phoneNormalization'
import { collection, query, where, getDocs, limit, doc, setDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { generateMemberId } from '../../../utils/memberId'

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
  const { modal } = App.useApp() // 使用 App.useApp() 获取 modal 实例以支持 React 19
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<User[]>([]) // 保留用于搜索和筛选
  const [loading, setLoading] = useState(false)
  
  // 服务端分页
  const {
    data: paginatedUsers,
    loading: paginatedLoading,
    hasMore,
    currentPage,
    loadPage,
    refresh: refreshPaginated
  } = usePaginatedData(
    async (pageSize, lastDoc, filters) => {
      const result = await getUsersPaginated(pageSize, lastDoc, filters)
      return result
    },
    {
      pageSize: 20, // 桌面端20条/页
      mobilePageSize: 10, // 移动端10条/页
      initialLoad: false // 手动控制加载
    }
  )
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
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('users.visibleCols')
    if (saved) {
      try { return JSON.parse(saved) } catch {}
    }
    return {
    id: true,
    memberId: true,
    displayName: true,
    email: true,
    role: true,
    lastActive: true,
    status: true,
    action: true,
    }
  })
  const [activeTab, setActiveTab] = useState<'list' | 'referralTree'>('list')
  const [showMemberCard, setShowMemberCard] = useState(false) // 控制头像/会员卡切换
  const [userOrders, setUserOrders] = useState<Order[]>([])
  const [userEvents, setUserEvents] = useState<Event[]>([])
  const [loadingUserData, setLoadingUserData] = useState(false)
  const [activeIndex, setActiveIndex] = useState<string>('') // 当前高亮的字母
  const [showBubble, setShowBubble] = useState(false) // 字母气泡显示
  const [bubbleLetter, setBubbleLetter] = useState('') // 气泡字母

  // 筛选条件变化时不需要重新加载数据（因为现在使用客户端筛选）
  // 数据加载已在下面的 useEffect 中处理

  // 加载所有用户数据（用于显示和搜索）
  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        // 始终加载所有用户数据，以便显示完整列表和进行客户端搜索/筛选
        const list = await getUsers()
        setUsers(list)
      } catch (e) {
        message.error(t('messages.dataLoadFailed'))
      } finally {
        setLoading(false)
      }
    })()
  }, []) // 只在组件挂载时加载一次

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
      } finally {
        setLoadingUserData(false)
      }
    }
    
    loadUserData()
  }, [editing?.id])

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'developer': return 'red'
      case 'admin': return 'red'
      case 'member': return 'blue'
      case 'vip': return 'gold'  // VIP 使用自定义渐变样式，此颜色不会被使用
      case 'guest': return 'default'
      default: return 'default'
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'developer': return t('auth.developer')
      case 'admin': return t('auth.admin')
      case 'member': return t('auth.member')
      case 'vip': return t('auth.vip')
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
      title: t('usersAdmin.memberId'),
      dataIndex: 'memberId',
      key: 'memberId',
      width: 100,
      render: (memberId: string) => memberId || '-',
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
      render: (role: string) => {
        // ✅ VIP 标签使用金色渐变背景和黑色字体
        if (role === 'vip') {
          return (
            <Tag 
              style={{
                background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                color: '#000000',
                border: 'none',
                fontWeight: 600
              }}
            >
              {getRoleText(role)}
            </Tag>
          )
        }
        // 其他角色使用默认颜色
        return (
        <Tag color={getRoleColor(role)}>
          {getRoleText(role)}
        </Tag>
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
                
                // ✅ 当状态变为活跃时，角色自动变为 VIP；变为非活跃时，角色改回 member（不影响 admin）
                const updateData: Partial<User> = { status: next }
                if (checked && record.role !== 'admin') {
                  updateData.role = 'vip'
                } else if (!checked && record.role === 'vip') {
                  updateData.role = 'member'
                }
                
                const res = await updateDocument<User>(COLLECTIONS.USERS, record.id, updateData as any)
                if (res.success) {
                  message.success(t('usersAdmin.statusUpdated'))
                  // 刷新用户列表以显示角色变化
                  await refreshPaginated()
                }
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
      title: 'AI识茄使用',
      key: 'aiUsageStats',
      width: 120,
      render: (_: any, record: any) => {
        const scanCount = record.aiUsageStats?.cigarScanCount || 0;
        const lastScanAt = record.aiUsageStats?.lastCigarScanAt;
        
        if (scanCount === 0) {
          return <Text style={{ color: '#FFFFFF' }}>未使用</Text>;
        }
        
        // 处理 Firestore Timestamp 或 Date 对象
        let formattedDate = '';
        if (lastScanAt) {
          try {
            // 如果是 Firestore Timestamp，使用 toDate() 方法
            const date = lastScanAt?.toDate ? lastScanAt.toDate() : new Date(lastScanAt);
            if (date && !isNaN(date.getTime())) {
              formattedDate = date.toLocaleDateString();
            }
          } catch (error) {
            console.error('[Users] 日期格式化失败:', error);
          }
        }
        
        return (
          <Space direction="vertical" size="small">
            <Tag color="blue">{scanCount} 次</Tag>
            {formattedDate && (
              <Text style={{ fontSize: '11px', color: '#FFFFFF' }}>
                最后: {formattedDate}
              </Text>
            )}
          </Space>
        );
      },
      sorter: (a: any, b: any) => {
        const aCount = a.aiUsageStats?.cigarScanCount || 0;
        const bCount = b.aiUsageStats?.cigarScanCount || 0;
        return aCount - bCount;
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
      // 如果不是开发者，过滤掉开发者角色的用户
      if (currentUser?.role !== 'developer' && u.role === 'developer') {
        return false
      }
      // 关键词搜索（客户端）
      const passKw = !kw || 
        u.displayName?.toLowerCase().includes(kw) || 
        (u.email || '').toLowerCase().includes(kw) || 
        ((u as any)?.profile?.phone || '').includes(keyword.trim()) || 
        (u.memberId || '').toLowerCase().includes(kw)
      
      // 状态筛选（客户端，因为statusMap是动态的）
      const status = statusMap[u.id] || (u as any).status || 'active'
      const passStatus = !statusFilter || status === statusFilter
      
      // role筛选（客户端）
      const passRole = !roleFilter || u.role === roleFilter
      
      // level筛选（客户端）
      const passLevel = !levelFilter || u.membership?.level === levelFilter
      
      return passKw && passStatus && passRole && passLevel
    })
    // 按字母顺序排序（按displayName）
    return filtered.sort((a, b) => {
      const nameA = (a.displayName || '').toLowerCase()
      const nameB = (b.displayName || '').toLowerCase()
      return nameA.localeCompare(nameB)
    })
  }, [users, keyword, statusFilter, roleFilter, levelFilter, statusMap, currentUser?.role])

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
    <div style={{ 
      height: isMobile ? '90vh' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      overflow: isMobile ? (activeTab === 'referralTree' ? 'auto' : 'hidden') : 'visible',
      paddingRight: isMobile && activeTab === 'list' ? '32px' : '0',  // 为右侧索引栏预留空间（仅在用户列表标签页）
      paddingBottom: isMobile ? '60px' : '0'
    }}>
      {/* 标签页 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(244,175,37,0.2)',
          marginBottom: 16
        }}>
          {(['list', 'referralTree'] as const).map((tabKey) => {
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
                case 'list': return t('usersAdmin.userList')
                case 'referralTree': return t('usersAdmin.referralTree')
                default: return ''
              }
            }

            return (
              <button
                key={tabKey}
                style={{
                  ...baseStyle,
                  ...(isActive ? activeStyle : inactiveStyle),
                }}
                onClick={() => setActiveTab(tabKey)}
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
                  }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'referralTree' && (
        <ReferralTreeView users={users} />
      )}

      {activeTab === 'list' && (
        <>
      {!isMobile && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
         <h1 style={{ fontSize: 22, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{t('navigation.users')}</h1>
        <Space>
          {selectedRowKeys.length > 0 && (
            <>
              <Button 
                onClick={async () => {
                setLoading(true)
                try {
                    // ✅ 批量禁用时，将 VIP 角色改回 member
                    await Promise.all(selectedRowKeys.map(id => {
                      const user = users.find(u => u.id === String(id))
                      const updateData: Partial<User> = { status: 'inactive' }
                      if (user?.role === 'vip') {
                        updateData.role = 'member'
                      }
                      return updateDocument<User>(COLLECTIONS.USERS, String(id), updateData as any)
                    }))
                  message.success(t('usersAdmin.batchDisabled'))
                  await refreshPaginated()
                  setSelectedRowKeys([])
                } finally {
                  setLoading(false)
                }
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF'
                }}
              >
                {t('usersAdmin.batchDisable')}
              </Button>
              <Button 
                onClick={async () => {
                try {
                  modal.confirm({
                  title: t('usersAdmin.batchDeleteConfirm'),
                  content: t('usersAdmin.batchDeleteContent', { count: selectedRowKeys.length }),
      okButtonProps: { danger: true },
      onOk: async () => {
                    setLoading(true)
                    try {
                        const results = await Promise.all(selectedRowKeys.map(id => deleteDocument(COLLECTIONS.USERS, String(id))))
                        const failedCount = results.filter(r => !r.success).length
                        const successCount = results.filter(r => r.success).length
                        
                        if (failedCount > 0) {
                          message.error(t('usersAdmin.batchDeleteFailed', { failed: failedCount, total: selectedRowKeys.length }))
                        } else {
                      message.success(t('usersAdmin.batchDeleted'))
                        }
                        
                        if (successCount > 0) {
                      await refreshPaginated()
                      setSelectedRowKeys([])
                        }
                      } catch (error: any) {
                        console.error('[AdminUsers] 批量删除失败:', error)
                        message.error(error.message || t('messages.operationFailed'))
                    } finally {
                      setLoading(false)
                    }
                  }
                })
                } catch (error: any) {
                  console.error('[AdminUsers] 打开确认对话框失败:', error)
                  message.error(error.message || '无法打开确认对话框')
                }
              }}
              style={{
                background: 'rgba(255, 77, 79, 0.8)',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: 700
              }}
            >
              {t('usersAdmin.batchDelete')}
            </Button>
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
      <div style={{ 
        marginBottom: 16, 
        padding: '16px', 
        background: 'rgba(255, 255, 255, 0.05)', 
        borderRadius: 12,
        border: '1px solid rgba(244, 175, 37, 0.6)',
        backdropFilter: 'blur(10px)'
      }}>
        <Space size="middle" wrap>
          <Search
            placeholder={t('usersAdmin.searchByNameOrEmail')}
            allowClear
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="points-config-form"
          />
            <Select
              allowClear
              placeholder={t('usersAdmin.selectRole')}
              value={roleFilter}
              style={{ width: 160 }}
              onChange={(v) => setRoleFilter(v)}
              className="points-config-form"
            >
            <Option value="admin">{t('common.admin')}</Option>
            <Option value="member">{t('common.member')}</Option>
            <Option value="guest">{t('common.guest')}</Option>
            {currentUser?.role === 'developer' && (
              <Option value="developer">{t('auth.developer')}</Option>
            )}
          </Select>
            <Select
              allowClear
              placeholder={t('usersAdmin.selectLevel')}
              value={levelFilter}
              style={{ width: 160 }}
              onChange={(v) => setLevelFilter(v)}
              className="points-config-form"
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
              className="points-config-form"
            >
            <Option value="active">{t('usersAdmin.active')}</Option>
              <Option value="inactive">{t('usersAdmin.inactive')}</Option>
          </Select>
          <Button 
            onClick={() => {
            setKeyword('')
            setRoleFilter(undefined)
            setLevelFilter(undefined)
            setSelectedRowKeys([])
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF'
            }}
          >
            {t('common.resetFilters')}
          </Button>
        </Space>
      </div>
      )}

      {/* 桌面：表格 */}
      {!isMobile && (
      <div className="points-config-form">
      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowKey="id"
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{
          y: 'calc(100vh - 300px)', // 启用虚拟滚动，设置固定高度
          x: 'max-content' // 水平滚动
        }}
        pagination={{
          pageSize: isMobile ? 10 : 20,
          total: filteredUsers.length,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => t('common.paginationTotal', { start: range[0], end: range[1], total }),
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
          style={{
            background: 'transparent'
          }}
      />
      </div>
      )}

      {/* 移动端：列表视图 */}
      {isMobile && activeTab === 'list' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden'
        }}>
          {/* 固定顶部区域 - 不滚动 */}
          <div style={{ flexShrink: 0 }}>
            {/* 标题栏 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0px' }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent', margin: 0 }}>{t('navigation.users')}</h1>
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
                className="points-config-form"
              />
            </div>
            
            {/* 筛选与添加 */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', padding: '0 0px 12px 0px', borderBottom: '2px solid rgba(255, 215, 0, 0.2)' }}>
              <Dropdown
                menu={{
                  items: [
                    { key: 'all', label: t('common.all') },
                    { key: 'admin', label: t('common.admin') },
                    { key: 'member', label: t('common.member') },
                    { key: 'guest', label: t('common.guest') },
                    ...(currentUser?.role === 'developer' ? [{ key: 'developer', label: t('auth.developer') }] : []),
                  ],
                  onClick: ({ key }) => setRoleFilter(key === 'all' ? undefined : (key as string)),
                }}
              >
                <Button 
                  shape="round" 
                  size="small"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF'
                  }}
                >
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
                <Button 
                  shape="round" 
                  size="small"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF'
                  }}
                >
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
                <Button 
                  shape="round" 
                  size="small"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF'
                  }}
                >
                  {t('usersAdmin.status')}{statusFilter ? `: ${getStatusText(statusFilter)}` : ''}
                </Button>
              </Dropdown>
              <div style={{ flex: 1 }} />
              <button onClick={() => { setCreating(true); form.resetFields() }} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '6px 12px', background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 700, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}>{t('usersAdmin.addUser')}</button>
            </div>
          </div>

          {/* 顶部渐变装饰 */}
          <div style={{
            position: 'sticky',
            top: 0,
            left: 0,
            right: 0,
            height: '20px',
            background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, transparent 100%)',
            zIndex: 2,
            pointerEvents: 'none',
            marginLeft: '-12px',
            marginRight: '-12px'
          }} />

          {/* 可滚动内容区域 - 独立滚动 */}
          <div 
            className="users-scroll-area"
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingBottom: '16px',
              position: 'relative',
              zIndex: 1
            }}
          >
            {(loading || paginatedLoading) ? (
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
                    const role = u.role || 'member'
                    return (
                      <div key={u.id} style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', padding: 12, marginBottom: 8, backdropFilter: 'blur(6px)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ fontWeight: 700, color: '#f0f0f0' }}>{u.displayName || '-'}</div>
                              <Tag color={getRoleColor(role)} style={{ margin: 0 }}>
                                {getRoleText(role)}
                              </Tag>
                            </div>
                            <div style={{ marginTop: 4, fontSize: 12, color: '#aaa' }}>
                              {u.memberId && <span style={{ marginRight: 8, fontFamily: 'monospace' }}>{t('usersAdmin.memberId')}: {u.memberId}</span>}
                              {maskPhone((u as any)?.profile?.phone)}
                            </div>
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

      {/* 右侧字母索引（固定居中）- 移至最外层 */}
      {isMobile && activeTab === 'list' && (
        <div
          style={{
            position: 'fixed',
            right: 7,
            top: '48%',
            transform: 'translateY(-50%)',
            maxHeight: '90vh',
            padding: 4,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,215,0,0.25)',
            borderRadius: 12,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600 }}>
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
                    padding: '1px 3px',
                    borderRadius: '3px',
                    cursor: enabled ? 'pointer' : 'default',
                    transition: 'all 0.3s ease',
                    fontWeight: isActive ? 700 : 600,
                    lineHeight: 1
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

      {/* 字母气泡动画 + 隐藏滚动条 */}
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
        
        /* 隐藏滚动条但保持滚动功能 */
        .users-scroll-area::-webkit-scrollbar {
          display: none;
        }
        .users-scroll-area {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
      </>
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

            {/* ProfileView Component */}
            <div>
              <ProfileView
                user={editing}
                readOnly={false}
                showEditButton={true}
                onEdit={(user) => {
                  setCreating(true)
                  form.setFieldsValue({
                    displayName: user.displayName,
                    email: user.email,
                    role: user.role,
                    level: user.membership?.level,
                    phone: (user as any)?.profile?.phone,
                  })
                }}
              />
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
              // 创建新用户时，先创建文档获取ID，然后生成会员ID并更新
              const userData: Omit<User, 'id'> = {
                displayName: values.displayName,
                email: values.email,
                role: values.role,
                status: 'inactive',  // ✅ 默认状态为非活跃
                profile: { phone: normalizedPhone },
                preferences: {
                  locale: 'zh',
                  notifications: true,
                },
                membership: { level: values.level, joinDate: new Date(), lastActive: new Date() },
                createdAt: new Date(),
                updatedAt: new Date(),
              } as any
              
              const res = await createDocument<User>(COLLECTIONS.USERS, userData)
              
              if ((res as any).success) {
                const newUserId = (res as any).id
                
                // 生成会员ID并更新用户文档
                try {
                  const memberId = await generateMemberId(newUserId)
                  await updateDocument<User>(COLLECTIONS.USERS, newUserId, { memberId } as any)
                  message.success(t('usersAdmin.created'))
                } catch (error) {
                  console.error('生成会员ID失败:', error)
                  message.warning(t('usersAdmin.created') + '，但会员ID生成失败，请稍后手动添加')
                }
              } else {
                message.error(t('messages.dataLoadFailed'))
              }
            }
            await refreshPaginated()
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
              { type: 'email', message: t('auth.emailInvalid') },
              {
                validator: async (_, value) => {
                  // 如果没有输入，跳过验证（非必填）
                  if (!value) {
                    return Promise.resolve()
                  }
                  
                  // ✅ 如果是编辑模式且邮箱没有改变，跳过验证
                  if (editing && value === editing.email) {
                    return Promise.resolve()
                  }
                  
                  // ✅ 先验证格式，格式无效则跳过唯一性检查
                  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                  if (!emailPattern.test(value)) {
                    return Promise.resolve()
                  }
                  
                  // ✅ 格式有效，检查邮箱唯一性
                  try {
                    const emailQuery = query(
                      collection(db, 'users'), 
                      where('email', '==', value.toLowerCase().trim()),
                      limit(1)
                    )
                    const emailSnap = await getDocs(emailQuery)
                    
                    if (!emailSnap.empty) {
                      const existingUserId = emailSnap.docs[0].id
                      // 如果是编辑模式，检查是否是当前用户
                      if (!editing || existingUserId !== editing.id) {
                        return Promise.reject(new Error('该邮箱已被其他用户使用'))
                      }
                    }
                  } catch (error) {
                    // 如果查询失败，允许通过（不阻止用户提交）
                  }
                  
                  return Promise.resolve()
                }
              }
            ]}
            validateTrigger={['onBlur', 'onChange']}
            validateDebounce={500}
          >
            <Input placeholder={t('auth.email')} />
          </Form.Item>

          <Form.Item 
            label={<span style={{ color: '#FFFFFF' }}>{t('auth.phone')}</span>}
            name="phone" 
            rules={[
              { required: true, message: t('profile.phoneRequired') },
              { 
                pattern: /^((\+?60[1-9]\d{8,9})|(0[1-9]\d{8,9}))$/, 
                message: '手机号格式无效（需10-12位数字）' 
              },
              {
                validator: async (_, value) => {
                  if (!value) return Promise.resolve()
                  
                  // ✅ 如果是编辑模式且手机号没有改变，跳过验证
                  if (editing) {
                    const currentPhone = normalizePhoneNumber((editing as any)?.profile?.phone || '')
                    const newPhone = normalizePhoneNumber(value)
                    if (newPhone === currentPhone) {
                      return Promise.resolve()
                    }
                  }
                  
                  // ✅ 先验证格式，格式无效则跳过唯一性检查
                  const formatPattern = /^((\+?60[1-9]\d{8,9})|(0[1-9]\d{8,9}))$/
                  if (!formatPattern.test(value)) {
                    return Promise.resolve()
                  }
                  
                  // ✅ 格式有效，检查手机号唯一性
                  const normalized = normalizePhoneNumber(value)
                  if (!normalized) {
                    return Promise.resolve()
                  }
                  
                  try {
                    const phoneQuery = query(
                      collection(db, 'users'), 
                      where('profile.phone', '==', normalized),
                      limit(1)
                    )
                    const phoneSnap = await getDocs(phoneQuery)
                    
                    if (!phoneSnap.empty) {
                      const existingUserId = phoneSnap.docs[0].id
                      // 如果是编辑模式，检查是否是当前用户
                      if (!editing || existingUserId !== editing.id) {
                        return Promise.reject(new Error('该手机号已被其他用户使用'))
                      }
                    }
                  } catch (error) {
                    // 如果查询失败，允许通过（不阻止用户提交）
                  }
                  
                  return Promise.resolve()
                }
              }
            ]}
            validateTrigger={['onBlur', 'onChange']}
            validateDebounce={500}
          >
            <Input 
              placeholder={t('auth.phone')}
              onInput={(e) => {
                const input = e.currentTarget
                // ✅ 只保留数字、加号和空格
                input.value = input.value.replace(/[^\d+\s-]/g, '')
              }}
            />
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
              {currentUser?.role === 'developer' && (
                <Option value="developer">{t('auth.developer')}</Option>
              )}
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
              await refreshPaginated()
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
