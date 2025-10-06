import React from 'react'
import { Tag } from 'antd'
import { CheckOutlined, ClockCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import ActionButtons from '../../../components/common/ActionButtons'
import type { Order, User, Cigar, Transaction } from '../../../types'
import { getStatusColor, getStatusText, getPaymentText, getUserName, getUserPhone, getCigarInfo } from './helpers'

interface UseOrderColumnsProps {
  users: User[]
  cigars: Cigar[]
  transactions: Transaction[]
  orders: Order[]
  onViewOrder: (order: Order) => void
  onDeleteOrder: (id: string) => Promise<{ success: boolean; error?: string | Error }>
  onOrderUpdate: () => void
}

export const useOrderColumns = ({
  users,
  cigars,
  transactions,
  orders,
  onViewOrder,
  onDeleteOrder,
  onOrderUpdate
}: UseOrderColumnsProps) => {
  const { t } = useTranslation()

  // 计算订单匹配状态
  const getOrderMatchStatus = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return { matched: 0, total: 0, status: 'none' }
    
    const orderTotal = Number(order.total || 0)
    const matchedAmount = transactions
      .filter(t => {
        const relatedOrders = (t as any)?.relatedOrders || []
        return relatedOrders.some((ro: any) => ro.orderId === orderId)
      })
      .reduce((sum, t) => {
        const relatedOrders = (t as any)?.relatedOrders || []
        const orderMatch = relatedOrders.find((ro: any) => ro.orderId === orderId)
        return sum + (orderMatch ? Number(orderMatch.amount || 0) : 0)
      }, 0)
    
    if (matchedAmount >= orderTotal) {
      return { matched: matchedAmount, total: orderTotal, status: 'fully' }
    } else if (matchedAmount > 0) {
      return { matched: matchedAmount, total: orderTotal, status: 'partial' }
    } else {
      return { matched: matchedAmount, total: orderTotal, status: 'none' }
    }
  }

  return [
    {
      title: t('ordersAdmin.orderId'),
      dataIndex: 'id',
      key: 'id',
      width: 150,
      render: (id: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', whiteSpace: 'normal' }}>
          {id}
        </span>
      ),
    },
    {
      title: t('ordersAdmin.user'),
      dataIndex: 'userId',
      key: 'userId',
      render: (userId: string) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{getUserName(userId, users)}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{getUserPhone(userId, users) || '-'}</div>
        </div>
      ),
    },
    {
      title: t('ordersAdmin.items'),
      key: 'items',
      render: (_: any, record: Order) => (
        <div>
          {record.items.slice(0, 2).map((item) => (
            <div key={`${record.id}_${item.cigarId}`} style={{ fontSize: '12px', marginBottom: 2 }}>
              {getCigarInfo(item.cigarId, cigars)} × {item.quantity}
            </div>
          ))}
          {record.items.length > 2 && (
            <div style={{ fontSize: '11px', color: '#666' }}>
              +{record.items.length - 2} {t('common.more')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('ordersAdmin.totalAmount'),
      dataIndex: 'total',
      key: 'total',
      render: (_: number, record: Order) => {
        const matchStatus = getOrderMatchStatus(record.id)
        return (
          <div>
            <div style={{ fontWeight: 'bold', color: '#1890ff', display: 'flex', alignItems: 'center', gap: 8 }}>
              RM{Number(record.total || 0).toFixed(2)}
              {matchStatus.status === 'fully' && (
                <CheckOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
              )}
              {matchStatus.status === 'partial' && (
                <ClockCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
              )}
            </div>
            <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Tag color="geekblue" style={{ marginInlineEnd: 0 }}>{getPaymentText((record as any)?.payment?.method, t)}</Tag>
              {matchStatus.status !== 'none' && (
                <Tag color={matchStatus.status === 'fully' ? 'green' : 'orange'} style={{ marginInlineEnd: 0 }}>
                  {matchStatus.status === 'fully' ? t('financeAdmin.fullyMatched') : `${t('financeAdmin.partialMatched')}: RM${matchStatus.matched.toFixed(2)}`}
                </Tag>
              )}
            </div>
          </div>
        )
      },
    },
    // 移除独立的状态与支付方式列（已合并至金额列下方）
    {
      title: t('ordersAdmin.address'),
      dataIndex: ['shipping', 'address'],
      key: 'shipping',
      render: (_: any, record: Order) => {
        const addr = (record as any)?.shipping?.address as string
        const display = addr ? (addr.length > 20 ? `${addr.substring(0, 20)}...` : addr) : '-'
        return (
          <div>
            <div style={{ fontSize: '12px' }}>{display}</div>
            <div style={{ marginTop: 4 }}>
              <Tag color={getStatusColor(record.status)}>{getStatusText(record.status, t)}</Tag>
            </div>
          </div>
        )
      },
    },
    {
      title: t('ordersAdmin.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: any) => {
        let d: any = date
        if (d && typeof d.toDate === 'function') {
          d = d.toDate()
        }
        const m = dayjs(d)
        return m.isValid() ? m.format('YYYY-MM-DD') : '-'
      },
    },
    {
      title: t('ordersAdmin.actions'),
      key: 'action',
      render: (_: any, record: Order) => (
        <ActionButtons
          itemId={record.id}
          itemName={`订单 ${record.id.substring(0, 8)}...`}
          onView={() => onViewOrder(record)}
          onDelete={onDeleteOrder}
          onDeleteSuccess={onOrderUpdate}
          deleteConfirmTitle={t('ordersAdmin.deleteConfirm')}
          deleteConfirmContent={t('ordersAdmin.deleteContent', { id: record.id.substring(0, 8) + '...' })}
          buttonSize="small"
          type="link"
          showEdit={false}
          showIcon={true}
        />
      ),
    },
  ]
}
