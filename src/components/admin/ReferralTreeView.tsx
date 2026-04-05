// 引荐关系图组件
import React, { useMemo, useState, useEffect } from 'react'
import { Card, Space, Input, Select, Button, Typography, Spin, message, Tag } from 'antd'
import { SearchOutlined, UserOutlined, ExpandOutlined, ShrinkOutlined, ReloadOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { User } from '../../types'
import { getUsers } from '../../services/firebase/firestore'

const { Text } = Typography
const { Search } = Input
const { Option } = Select

interface ReferralNode {
  user: User
  children: ReferralNode[]
  level: number
  path: string[]
  expanded: boolean
}

interface ReferralTreeViewProps {
  users?: User[] // 可选：直接传入用户列表
}

export const ReferralTreeView: React.FC<ReferralTreeViewProps> = ({ users: propUsers }) => {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>(propUsers || [])
  const [loading, setLoading] = useState(!propUsers)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'hasReferrer' | 'hasReferrals'>('all')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // 加载用户数据
  useEffect(() => {
    if (propUsers) {
      setUsers(propUsers)
      return
    }

    const loadUsers = async () => {
      setLoading(true)
      try {
        const userList = await getUsers()
        setUsers(userList)
      } catch (error) {
        console.error('Error loading users:', error)
        message.error(t('messages.dataLoadFailed'))
      } finally {
        setLoading(false)
      }
    }
    loadUsers()
  }, [propUsers, t])

  // 构建引荐关系树
  const referralTree = useMemo(() => {
    if (users.length === 0) return []

    // 创建用户ID到用户的映射
    const userMap = new Map<string, User>()
    users.forEach(user => userMap.set(user.id, user))

    // 创建节点映射
    const nodeMap = new Map<string, ReferralNode>()

    // 初始化所有节点
    users.forEach(user => {
      nodeMap.set(user.id, {
        user,
        children: [],
        level: 0,
        path: [],
        expanded: expandedNodes.has(user.id)
      })
    })

    // 构建树结构
    const rootNodes: ReferralNode[] = []

    users.forEach(user => {
      const node = nodeMap.get(user.id)!
      const referrerId = user.referral?.referredByUserId

      if (referrerId && nodeMap.has(referrerId)) {
        // 有引荐人，添加到引荐人的children
        const referrerNode = nodeMap.get(referrerId)!
        node.level = (referrerNode.level || 0) + 1
        node.path = [...referrerNode.path, referrerId]
        referrerNode.children.push(node)
      } else {
        // 没有引荐人或引荐人不存在，作为根节点
        rootNodes.push(node)
      }
    })

    // 对每个节点的children按注册时间排序
    const sortChildren = (node: ReferralNode) => {
      node.children.sort((a, b) => {
        const dateA = a.user.createdAt instanceof Date ? a.user.createdAt : new Date(a.user.createdAt)
        const dateB = b.user.createdAt instanceof Date ? b.user.createdAt : new Date(b.user.createdAt)
        return dateB.getTime() - dateA.getTime()
      })
      node.children.forEach(sortChildren)
    }

    rootNodes.forEach(sortChildren)

    return rootNodes
  }, [users, expandedNodes])

  // 过滤和搜索
  const filteredTree = useMemo(() => {
    const filterNode = (node: ReferralNode): ReferralNode | null => {
      const user = node.user
      const keyword = searchKeyword.trim().toLowerCase()

      // 搜索过滤
      const matchSearch = !keyword ||
        user.displayName?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword) ||
        user.memberId?.toLowerCase().includes(keyword)

      // 类型过滤
      let matchFilter = true
      if (filterType === 'hasReferrer') {
        matchFilter = !!user.referral?.referredByUserId
      } else if (filterType === 'hasReferrals') {
        matchFilter = (user.referral?.referrals?.length || 0) > 0
      }

      if (!matchSearch || !matchFilter) {
        return null
      }

      // 过滤子节点
      const filteredChildren = node.children
        .map(filterNode)
        .filter((child): child is ReferralNode => child !== null)

      return {
        ...node,
        children: filteredChildren
      }
    }

    return referralTree.map(filterNode).filter((node): node is ReferralNode => node !== null)
  }, [referralTree, searchKeyword, filterType])

  // 展开/折叠节点
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  // 展开全部
  const expandAll = () => {
    const allIds = new Set<string>()
    const collectIds = (nodes: ReferralNode[]) => {
      nodes.forEach(node => {
        allIds.add(node.user.id)
        if (node.children.length > 0) {
          collectIds(node.children)
        }
      })
    }
    collectIds(filteredTree)
    setExpandedNodes(allIds)
  }

  // 折叠全部
  const collapseAll = () => {
    setExpandedNodes(new Set())
  }

  // 渲染节点
  const renderNode = (node: ReferralNode, isRoot: boolean = false) => {
    const user = node.user
    const hasChildren = node.children.length > 0
    const isExpanded = expandedNodes.has(user.id)
    const isSelected = selectedNodeId === user.id

    const totalReferrals = user.referral?.referrals?.length || 0
    const referralPoints = user.membership?.referralPoints || 0

    return (
      <div key={user.id} style={{ position: 'relative', marginLeft: isRoot ? 0 : 24 }}>
        {/* 连接线 */}
        {!isRoot && (
          <div style={{
            position: 'absolute',
            left: -20,
            top: 0,
            width: 16,
            height: 20,
            borderLeft: '2px solid rgba(255, 215, 0, 0.3)',
            borderBottom: '2px solid rgba(255, 215, 0, 0.3)',
          }} />
        )}

        {/* 节点卡片 */}
        <Card
          size="small"
          style={{
            background: isSelected
              ? 'rgba(255, 215, 0, 0.15)'
              : 'rgba(255, 255, 255, 0.05)',
            border: isSelected
              ? '1px solid rgba(255, 215, 0, 0.5)'
              : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            marginBottom: 12,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: isSelected
              ? '0 4px 12px rgba(255, 215, 0, 0.2)'
              : '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
          onClick={() => setSelectedNodeId(isSelected ? null : user.id)}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.background = 'rgba(255, 215, 0, 0.08)'
              e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)'
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <UserOutlined style={{ color: '#FFD700', fontSize: 16 }} />
                <Text strong style={{ color: '#FFFFFF', fontSize: 14 }}>
                  {user.displayName || t('profile.unknownUser')}
                </Text>
                {user.memberId && (
                  <Tag color="default" style={{ fontSize: 10, padding: '0 6px', margin: 0 }}>
                    {user.memberId}
                  </Tag>
                )}
              </div>

              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, display: 'block', marginBottom: 8 }}>
                {user.email}
              </Text>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 11 }}>
                  {t('profile.totalReferred')}: {totalReferrals}
                </Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 11 }}>
                  💰 {t('profile.referralPoints')}: {referralPoints}
                </Text>
              </div>
            </div>

            {hasChildren && (
              <Button
                type="text"
                size="small"
                icon={isExpanded ? <ShrinkOutlined /> : <ExpandOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleNode(user.id)
                }}
                style={{ color: '#FFD700' }}
              />
            )}
          </div>
        </Card>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div style={{ marginTop: 8 }}>
            {node.children.map(child => renderNode(child, false))}
          </div>
        )}
      </div>
    )
  }

  // 统计信息
  const stats = useMemo(() => {
    const totalUsers = users.length
    const hasReferral = users.filter(u => u.referral?.referredByUserId).length
    const hasReferrals = users.filter(u => (u.referral?.referrals?.length || 0) > 0).length
    const maxDepth = Math.max(...referralTree.map(node => {
      const getDepth = (n: ReferralNode): number => {
        if (n.children.length === 0) return n.level
        return Math.max(n.level, ...n.children.map(getDepth))
      }
      return getDepth(node)
    }), 0)
    const totalReferralPoints = users.reduce((sum, u) => sum + (u.membership?.referralPoints || 0), 0)

    return {
      totalUsers,
      hasReferral,
      hasReferrals,
      maxDepth: maxDepth + 1,
      totalReferralPoints
    }
  }, [users, referralTree])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      {/* 统计面板 */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        padding: 12,
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        border: '1px solid rgba(244, 175, 37, 0.6)'
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#FFD700' }}>{stats.totalUsers}</div>
          <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.2 }}>{t('usersAdmin.totalUsers')}</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#FFD700' }}>{stats.hasReferral}</div>
          <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.2 }}>{t('usersAdmin.hasReferrer')}</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#FFD700' }}>{stats.hasReferrals}</div>
          <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.2 }}>{t('usersAdmin.hasReferrals')}</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#FFD700' }}>{stats.maxDepth}</div>
          <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.2 }}>{t('usersAdmin.maxDepth')}</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#FFD700' }}>{stats.totalReferralPoints}</div>
          <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.2 }}>{t('usersAdmin.totalReferralPoints')}</div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div style={{ marginBottom: 16 }}>
        {/* 搜索框 */}
        <Search
          placeholder={t('usersAdmin.searchByNameOrEmail')}
          allowClear
          style={{ width: '100%', marginBottom: 12 }}
          prefix={<SearchOutlined />}
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />

        {/* 筛选和操作按钮 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Select
            value={filterType}
            style={{ flex: '1 1 150px', minWidth: 120 }}
            onChange={setFilterType}
          >
            <Option value="all">{t('common.all')}</Option>
            <Option value="hasReferrer">{t('usersAdmin.hasReferrer')}</Option>
            <Option value="hasReferrals">{t('usersAdmin.hasReferrals')}</Option>
          </Select>
          <Button
            icon={<ExpandOutlined />}
            onClick={expandAll}
            style={{ flex: '1 1 auto' }}
          >
            {t('usersAdmin.expandAll')}
          </Button>
          <Button
            icon={<ShrinkOutlined />}
            onClick={collapseAll}
            style={{ flex: '1 1 auto' }}
          >
            {t('usersAdmin.collapseAll')}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => window.location.reload()}
            style={{ flex: '1 1 auto' }}
          >
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* 关系图 */}
      <div style={{
        minHeight: 400,
        maxHeight: 'calc(100vh - 400px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        paddingRight: 4
      }}>
        {filteredTree.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255, 255, 255, 0.6)' }}>
            {t('usersAdmin.noReferralData')}
          </div>
        ) : (
          <div>
            {filteredTree.map(node => renderNode(node, true))}
          </div>
        )}
      </div>
    </div>
  )
}

