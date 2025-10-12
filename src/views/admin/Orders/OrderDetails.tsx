import React from 'react'
import dayjs from 'dayjs'
import { Button, Tag, Input, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { Order, User, Cigar } from '../../../types'
import { updateDocument, COLLECTIONS } from '../../../services/firebase/firestore'
import { getStatusColor, getStatusText, getPaymentText, getUserName, getUserPhone } from './helpers'
import { getModalTheme } from '../../../config/modalTheme'

interface OrderDetailsProps {
  order: Order
  users: User[]
  cigars: Cigar[]
  isMobile: boolean
  isEditingInView: boolean
  onClose: () => void
  onEditToggle: () => void
  onOrderUpdate: () => void
}

const OrderDetails: React.FC<OrderDetailsProps> = ({
  order,
  users,
  cigars,
  isMobile,
  isEditingInView,
  onClose,
  onEditToggle,
  onOrderUpdate
}) => {
  const { t } = useTranslation()
  const theme = getModalTheme(true) // 使用暗色主题

  const handleStatusUpdate = async (status: string) => {
    try {
      await updateDocument(COLLECTIONS.ORDERS, order.id, { status } as any)
      message.success(t(`ordersAdmin.order${status.charAt(0).toUpperCase() + status.slice(1)}`))
      onOrderUpdate()
    } catch (error) {
      message.error(t('ordersAdmin.updateFailed'))
    }
  }

  const handleTrackingNumberUpdate = async (newTrackingNumber: string) => {
    if (newTrackingNumber !== order.shipping.trackingNumber) {
      try {
        await updateDocument(COLLECTIONS.ORDERS, order.id, {
          shipping: {
            ...order.shipping,
            trackingNumber: newTrackingNumber
          }
        } as any)
        message.success(t('ordersAdmin.trackingNumberUpdated'))
        onOrderUpdate()
      } catch (error) {
        message.error(t('ordersAdmin.updateFailed'))
      }
    }
  }

  return (
    <div style={{ 
      background: 'transparent', 
      minHeight: isMobile ? '100%' : 'auto',
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
          onClick={onClose}
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
          {t('ordersAdmin.orderDetails')}
        </h1>
      </div>

      {/* Content */}
      <div style={{ padding: '0 0 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '30px' }}>
          
          {/* 商品列表 */}
          <section style={theme.content.section}>
            <h2 style={theme.content.sectionTitle}>
              {t('ordersAdmin.itemDetails')}
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {order.items.map((item) => {
                const cigar = cigars.find(c => c.id === item.cigarId)
                return (
                  <li key={`${order.id}_${item.cigarId}`} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px' 
                  }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      background: 'rgba(244, 175, 37, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      color: '#f4af25'
                    }}>
                      🚬
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ ...theme.text.body, fontWeight: 'bold', margin: '0 0 4px 0' }}>
                        {cigar?.name || item.cigarId}
                      </p>
                      <p style={{ ...theme.text.hint, fontSize: '12px' }}>
                        {t('ordersAdmin.item.quantity')}: {item.quantity}
                      </p>
                    </div>
                    <p style={{ ...theme.text.body, fontWeight: '600' }}>
                      RM{item.price.toFixed(2)}
                    </p>
                  </li>
                )
              })}
            </ul>
            <div style={{ 
              marginTop: '16px', 
              paddingTop: '16px', 
              borderTop: '1px solid #393328',
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <p style={theme.text.secondary}>
                {t('ordersAdmin.totalAmount')}:
              </p>
              <p style={{ ...theme.text.primary, fontSize: '20px', fontWeight: 'bold' }}>
                RM{order.total.toFixed(2)}
              </p>
            </div>
          </section>

          {/* 订单信息 */}
          <section style={theme.content.section}>
            <h2 style={theme.content.sectionTitle}>
              {t('ordersAdmin.orderInfo')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={theme.content.row}>
                <p style={theme.text.secondary}>{t('ordersAdmin.orderId')}</p>
                <p style={{ ...theme.text.body, wordBreak: 'break-all', whiteSpace: 'normal' }}>{order.id}</p>
              </div>
              <div style={theme.content.row}>
                <p style={theme.text.secondary}>{t('ordersAdmin.status.title')}</p>
                <Tag color={getStatusColor(order.status)} style={{ margin: 0 }}>
                  {getStatusText(order.status, t)}
                </Tag>
              </div>
              <div style={theme.content.row}>
                <p style={{ ...theme.text.secondary, whiteSpace: 'nowrap' }}>{t('ordersAdmin.createdAt')}</p>
                <p style={theme.text.body}>{dayjs(order.createdAt).format('YYYY-MM-DD')}</p>
              </div>
              <div style={theme.content.row}>
                <p style={{ ...theme.text.secondary, whiteSpace: 'nowrap' }}>{t('ordersAdmin.payment.title')}</p>
                <p style={theme.text.body}>{getPaymentText(order.payment.method, t)}</p>
              </div>
              <div style={theme.content.row}>
                <p style={{ ...theme.text.secondary, whiteSpace: 'nowrap' }}>{t('ordersAdmin.transactionId')}</p>
                <p style={{ ...theme.text.body, wordBreak: 'break-all', whiteSpace: 'normal', textAlign: 'right' }}>{order.payment.transactionId}</p>
              </div>
              <div style={theme.content.row}>
                <p style={{ ...theme.text.secondary, whiteSpace: 'nowrap' }}>{t('ordersAdmin.paidAt')}</p>
                <p style={theme.text.body}>{dayjs(order.payment.paidAt).format('YYYY-MM-DD HH:mm')}</p>
              </div>
              <div style={theme.content.row}>
                <p style={{ ...theme.text.secondary, whiteSpace: 'nowrap' }}>{t('ordersAdmin.trackingNumber')}</p>
                {isEditingInView ? (
                  <Input
                    defaultValue={order.shipping.trackingNumber || ''}
                    placeholder={t('ordersAdmin.enterTrackingNo')}
                    style={{ ...(theme.input as any).base, width: '200px' }}
                    onBlur={(e) => handleTrackingNumberUpdate(e.target.value)}
                    onPressEnter={(e) => handleTrackingNumberUpdate(e.currentTarget.value)}
                  />
                ) : (
                  <p style={{ ...theme.text.body, wordBreak: 'break-all', whiteSpace: 'normal' }}>{order.shipping.trackingNumber || '-'}</p>
                )}
              </div>
            </div>
          </section>

          {/* 收货信息 */}
          <section style={theme.content.section}>
            <h2 style={theme.content.sectionTitle}>
              {t('ordersAdmin.shippingInfo')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={theme.content.row}>
                <p style={theme.text.secondary}>{t('ordersAdmin.user')}</p>
                <p style={theme.text.body}>{getUserName(order.userId, users)}</p>
              </div>
              <div style={theme.content.row}>
                <p style={theme.text.secondary}>{t('ordersAdmin.phone')}</p>
                <p style={theme.text.body}>{getUserPhone(order.userId, users) || '-'}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '14px' }}>
                <p style={{ ...theme.text.secondary, whiteSpace: 'nowrap', marginRight: '16px' }}>{t('ordersAdmin.address')}</p>
                <p style={{ ...theme.text.body, textAlign: 'right' }}>{order.shipping.address || '-'}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        background: 'rgba(24, 22, 17, 0.8)',
        backdropFilter: 'blur(10px)',
        padding: '12px 0px',
        borderTop: '1px solid #393328',
        marginTop: 'auto'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          {!isEditingInView && (
            <>
              <button 
                onClick={() => handleStatusUpdate('confirmed')}
                style={{ ...theme.button.primary, flex: 2, height: '40px', transition: 'all 0.2s ease' }}
              >
                {t('ordersAdmin.confirmOrder')}
              </button>
              <button 
                onClick={() => handleStatusUpdate('shipped')}
                style={{ ...theme.button.primary, flex: 2, height: '40px', transition: 'all 0.2s ease' }}
              >
                {t('ordersAdmin.markShipped')}
              </button>
              <button 
                onClick={() => handleStatusUpdate('delivered')}
                style={{ ...theme.button.primary, flex: 2, height: '40px', transition: 'all 0.2s ease' }}
              >
                {t('ordersAdmin.markDelivered')}
              </button>
            </>
          )}
          <button 
            onClick={onEditToggle}
            style={{ ...theme.button.primary, flex: 1, height: '40px', transition: 'all 0.2s ease' }}
          >
            {isEditingInView ? t('common.save') : t('common.edit')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderDetails
