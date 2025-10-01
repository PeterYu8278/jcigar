import React from 'react'
import { Tag } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import ActionButtons from '../../../components/common/ActionButtons'
import type { Order, User, Cigar } from '../../../types'
import { getStatusColor, getStatusText, getPaymentText, getUserName, getUserPhone, getCigarInfo } from './helpers'

interface UseOrderColumnsProps {
  users: User[]
  cigars: Cigar[]
  onViewOrder: (order: Order) => void
  onDeleteOrder: (id: string) => Promise<{ success: boolean; error?: string | Error }>
  onOrderUpdate: () => void
}

export const useOrderColumns = ({
  users,
  cigars,
  onViewOrder,
  onDeleteOrder,
  onOrderUpdate
}: UseOrderColumnsProps) => {
  const { t } = useTranslation()

  return [
    {
      title: t('ordersAdmin.orderId'),
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', whiteSpace: 'normal' }}>
          {id.substring(0, 8)}...
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
      render: (total: number) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          RM{total.toFixed(2)}
        </span>
      ),
    },
    {
      title: t('ordersAdmin.status.title'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status, t)}
        </Tag>
      ),
    },
    {
      title: t('ordersAdmin.payment.title'),
      dataIndex: ['payment', 'method'],
      key: 'payment',
      render: (method: string) => getPaymentText(method, t),
    },
    {
      title: t('ordersAdmin.address'),
      dataIndex: ['shipping', 'address'],
      key: 'shipping',
      render: (address: string) => (
        <span style={{ fontSize: '12px' }}>
          {address ? (address.length > 20 ? `${address.substring(0, 20)}...` : address) : '-'}
        </span>
      ),
    },
    {
      title: t('ordersAdmin.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
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
