import React from 'react'
import dayjs from 'dayjs'
import { Button, Tag, Input, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { Order, User, Cigar } from '../../../types'
import { updateDocument, COLLECTIONS } from '../../../services/firebase/firestore'
import { getStatusColor, getStatusText, getPaymentText, getUserName, getUserPhone } from './helpers'

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 商品列表 */}
          <section style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(39, 35, 27, 0.5)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(57, 51, 40, 0.7)'
          }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#FFFFFF', 
              marginBottom: '16px',
              margin: '0 0 16px 0'
            }}>
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
                      <p style={{ 
                        fontWeight: 'bold', 
                        color: '#FFFFFF', 
                        margin: '0 0 4px 0',
                        fontSize: '14px'
                      }}>
                        {cigar?.name || item.cigarId}
                      </p>
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#bab09c',
                        margin: 0
                      }}>
                        {t('ordersAdmin.item.quantity')}: {item.quantity}
                      </p>
                    </div>
                    <p style={{ 
                      fontWeight: '600', 
                      color: '#FFFFFF',
                      margin: 0,
                      fontSize: '14px'
                    }}>
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
              <p style={{ color: '#bab09c', margin: 0, fontSize: '14px' }}>
                {t('ordersAdmin.totalAmount')}:
              </p>
              <p style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: '#f4af25',
                margin: 0
              }}>
                RM{order.total.toFixed(2)}
              </p>
            </div>
          </section>

          {/* 订单信息 */}
          <section style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(39, 35, 27, 0.5)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(57, 51, 40, 0.7)'
          }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#FFFFFF', 
              marginBottom: '16px',
              margin: '0 0 16px 0'
            }}>
              {t('ordersAdmin.orderInfo')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <p style={{ color: '#bab09c', margin: 0 }}>{t('ordersAdmin.orderId')}</p>
                <p style={{ color: '#FFFFFF', margin: 0, wordBreak: 'break-all', whiteSpace: 'normal' }}>{order.id}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <p style={{ color: '#bab09c', margin: 0 }}>{t('ordersAdmin.status.title')}</p>
                <Tag color={getStatusColor(order.status)} style={{ margin: 0 }}>
                  {getStatusText(order.status, t)}
                </Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <p style={{ color: '#bab09c', margin: 0, whiteSpace: 'nowrap' }}>{t('ordersAdmin.createdAt')}</p>
                <p style={{ color: '#FFFFFF', margin: 0 }}>{dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <p style={{ color: '#bab09c', margin: 0, whiteSpace: 'nowrap' }}>{t('ordersAdmin.payment.title')}</p>
                <p style={{ color: '#FFFFFF', margin: 0 }}>{getPaymentText(order.payment.method, t)}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <p style={{ color: '#bab09c', margin: 0, whiteSpace: 'nowrap' }}>{t('ordersAdmin.transactionId')}</p>
                <p style={{ color: '#FFFFFF', margin: 0, wordBreak: 'break-all', whiteSpace: 'normal', textAlign: 'right' }}>{order.payment.transactionId}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <p style={{ color: '#bab09c', margin: 0, whiteSpace: 'nowrap' }}>{t('ordersAdmin.paidAt')}</p>
                <p style={{ color: '#FFFFFF', margin: 0 }}>{dayjs(order.payment.paidAt).format('YYYY-MM-DD HH:mm')}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <p style={{ color: '#bab09c', margin: 0, whiteSpace: 'nowrap' }}>{t('ordersAdmin.trackingNumber')}</p>
                {isEditingInView ? (
                  <Input
                    defaultValue={order.shipping.trackingNumber || ''}
                    placeholder={t('ordersAdmin.enterTrackingNo')}
                    style={{ 
                      width: '200px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(244, 175, 37, 0.3)',
                      color: '#FFFFFF',
                      borderRadius: '4px'
                    }}
                    onBlur={(e) => handleTrackingNumberUpdate(e.target.value)}
                    onPressEnter={(e) => handleTrackingNumberUpdate(e.currentTarget.value)}
                  />
                ) : (
                  <p style={{ color: '#FFFFFF', margin: 0, wordBreak: 'break-all', whiteSpace: 'normal' }}>{order.shipping.trackingNumber || '-'}</p>
                )}
              </div>
            </div>
          </section>

          {/* 收货信息 */}
          <section style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(39, 35, 27, 0.5)',
            backdropFilter: 'blur(10px)',
            marginBottom: '50px',
            border: '1px solid rgba(57, 51, 40, 0.7)'
          }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#FFFFFF', 
              marginBottom: '16px',
              margin: '0 0 16px 0'
            }}>
              {t('ordersAdmin.shippingInfo')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <p style={{ color: '#bab09c', margin: 0 }}>{t('ordersAdmin.user')}</p>
                <p style={{ color: '#FFFFFF', margin: 0 }}>{getUserName(order.userId, users)}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <p style={{ color: '#bab09c', margin: 0 }}>{t('ordersAdmin.phone')}</p>
                <p style={{ color: '#FFFFFF', margin: 0 }}>{getUserPhone(order.userId, users) || '-'}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '14px' }}>
                <p style={{ color: '#bab09c', margin: 0, whiteSpace: 'nowrap', marginRight: '16px' }}>{t('ordersAdmin.address')}</p>
                <p style={{ color: '#FFFFFF', margin: 0, textAlign: 'right' }}>{order.shipping.address || '-'}</p>
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
        padding: '12px 16px',
        borderTop: '1px solid #393328',
        marginTop: 'auto'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '8px',
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          {!isEditingInView && (
            <>
              <button 
                onClick={() => handleStatusUpdate('confirmed')}
                style={{ 
                  flex: 1, 
                  height: '40px',
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  color: '#111',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {t('ordersAdmin.confirmOrder')}
              </button>
              <button 
                onClick={() => handleStatusUpdate('shipped')}
                style={{ 
                  flex: 1, 
                  height: '40px',
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  color: '#111',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {t('ordersAdmin.markShipped')}
              </button>
              <button 
                onClick={() => handleStatusUpdate('delivered')}
                style={{ 
                  flex: 1, 
                  height: '40px',
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  color: '#111',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {t('ordersAdmin.markDelivered')}
              </button>
            </>
          )}
          <button 
            onClick={onEditToggle}
            style={{ 
              height: '40px',
              background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
              color: '#111',
              fontWeight: 'bold',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {isEditingInView ? t('common.save') : t('common.edit')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderDetails
