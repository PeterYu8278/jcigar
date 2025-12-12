// 通用购物车弹窗组件
import React, { useState, useEffect } from 'react'
import { Modal, Button, List, Typography, Radio, Divider, message, Select } from 'antd'
import { getModalThemeStyles, getModalWidth } from '../../config/modalTheme'
import type { Cigar, Event } from '../../types'
import { CigarRatingBadge } from './CigarRatingBadge'
import { AddressSelector } from './AddressSelector'
import { getEvents } from '../../services/firebase/firestore'

const { Title, Text } = Typography

const DEFAULT_CIGAR_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjQwIiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2lnYXI8L3RleHQ+Cjwvc3ZnPgo='

interface CartModalProps {
  open: boolean
  onClose: () => void
  cartItems: (Cigar & { quantity: number })[]
  quantities: Record<string, number>
  cartItemCount: number
  cartTotal: number
  setQuantity: (id: string, quantity: number) => void
  addToCart: (id: string) => void
  removeFromCart: (id: string) => void
  clearCart?: () => void
  isMobile: boolean
  t: (key: string) => string
  onCheckout?: () => void
}

export const CartModal: React.FC<CartModalProps> = ({
  open,
  onClose,
  cartItems,
  quantities,
  cartItemCount,
  cartTotal,
  setQuantity,
  addToCart,
  removeFromCart,
  clearCart,
  isMobile,
  t,
  onCheckout
}) => {
  // 模式状态：购物车或结算
  const [mode, setMode] = useState<'cart' | 'checkout'>('cart')
  // 支付方式
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  // 配送方式
  const [deliveryMethod, setDeliveryMethod] = useState<'address' | 'event'>('address')
  // 地址和活动选择
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [availableEvents, setAvailableEvents] = useState<Event[]>([])
  
  // 当弹窗关闭时重置模式
  useEffect(() => {
    if (!open) {
      setMode('cart')
      setPaymentMethod('cash')
      setDeliveryMethod('address')
      setSelectedAddressId(null)
      setSelectedEventId(null)
    }
  }, [open])

  // 加载可用活动
  useEffect(() => {
    if (mode === 'checkout') {
      ;(async () => {
        try {
          const events = await getEvents()
          // 筛选出状态为 upcoming 或 ongoing 的活动，且未过报名截止日期
          const now = new Date()
          const available = events.filter(event => {
            const isStatusValid = event.status === 'upcoming' || event.status === 'ongoing'
            const isDeadlineValid = new Date(event.schedule.registrationDeadline) >= now
            return isStatusValid && isDeadlineValid
          })
          setAvailableEvents(available)
        } catch (error) {
          console.error('加载活动失败:', error)
        }
      })()
    }
  }, [mode])

  // 确认删除对话框状态
  const [confirmRemove, setConfirmRemove] = useState<{
    visible: boolean
    itemId: string | null
    itemName: string | null
  }>({
    visible: false,
    itemId: null,
    itemName: null
  })

  // 强度翻译
  const strengthMap: Record<string, string> = {
    'mild': t('inventory.mild') || '温和',
    'medium': t('inventory.medium') || '中等',
    'full': t('inventory.full') || '浓郁'
  }

  const handleCheckout = () => {
    if (isMobile) {
      // 手机端：切换模式
      setMode('checkout')
    } else {
      // 电脑端：调用回调
    onClose()
    if (onCheckout) {
      onCheckout()
    }
    }
  }

  const handleConfirmCheckout = () => {
    // 验证配送方式
    if (deliveryMethod === 'address' && !selectedAddressId) {
      message.error('请选择收货地址')
      return
    }
    if (deliveryMethod === 'event' && !selectedEventId) {
      message.error('请选择活动')
      return
    }
    
    // TODO: 处理结算逻辑
    console.log('结算订单', {
      items: cartItems,
      total: cartTotal,
      paymentMethod,
      deliveryMethod,
      addressId: selectedAddressId,
      eventId: selectedEventId
    })
    // 清空购物车
    if (clearCart) {
      clearCart()
    }
    // 关闭弹窗
    onClose()
    // 显示成功消息
    message.success('订单已提交成功！')
  }

  // 处理确认移除
  const handleConfirmRemove = () => {
    if (confirmRemove.itemId) {
      removeFromCart(confirmRemove.itemId)
    }
    setConfirmRemove({ visible: false, itemId: null, itemName: null })
  }

  // 处理取消移除
  const handleCancelRemove = () => {
    setConfirmRemove({ visible: false, itemId: null, itemName: null })
  }

  return (
    <>
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={null}
      width={getModalWidth(isMobile)}
      style={{ 
        top: 0,
        paddingBottom: 0,
        maxWidth: '100%'
      }}
      styles={{
        ...getModalThemeStyles(isMobile, true),
        body: {
          ...(getModalThemeStyles(isMobile, true)?.body || {}),
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0
        }
      }}
      destroyOnHidden
      closable={false}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden'
      }}>
        {/* 弹窗标题栏 */}
        <div style={{
          padding: '8px',
          borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center'
          }}>
            {mode === 'cart' ? (
              <span style={{
                background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                backgroundClip: 'text'
              } as React.CSSProperties}>
                购物车 ({cartItemCount} 件商品)
              </span>
            ) : (
              <span style={{
                background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                backgroundClip: 'text'
              } as React.CSSProperties}>
                订单结算
              </span>
            )}
          </h2>
          <Button
            type="text"
            onClick={onClose}
            style={{ color: '#999' }}
          >
            ✕
          </Button>
        </div>

        {/* 购物车内容 */}
        <div style={{ 
          flex: 1,
          padding: mode === 'checkout' ? '16px' : '8px 0',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {mode === 'cart' ? (
            // 购物车模式
            <>
          {cartItems.length === 0 ? (
            // 空状态
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#999'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛒</div>
              <div style={{ fontSize: '16px', color: '#c0c0c0' }}>
                购物车是空的
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                快去添加商品吧！
              </div>
            </div>
          ) : (
            // 商品列表
            <List
              dataSource={cartItems}
              renderItem={(item) => {
                // 获取风味特征（合并所有品吸笔记）
                const flavorNotes = item.tastingNotes 
                  ? [
                      ...(item.tastingNotes.foot || []),
                      ...(item.tastingNotes.body || []),
                      ...(item.tastingNotes.head || [])
                    ].filter(Boolean)
                  : []

                return (
                  <List.Item
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '12px',
                      marginBottom: '12px',
                      padding: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                      {/* 产品名称 */}
                      <Title level={5} style={{ color: '#ffffff', margin: 0 }}>
                        {item.name}
                      </Title>
                      
                      {/* 图片和信息区域 */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '16px'
                      }}>
                        {/* 左侧图片 */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <img 
                            alt={item.name}
                            src={item.images?.[0] || DEFAULT_CIGAR_IMAGE}
                          style={{
                            width: '60px',
                            height: '100px',
                            objectFit: 'cover',
                              borderRadius: '8px',
                              border: '2px solid #B8860B'
                            }}
                          />
                          <CigarRatingBadge rating={item.metadata?.rating} size="small" />
                        </div>

                        {/* 右侧信息 */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                            {/* 产地 */}
                            {item.origin && (
                              <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                                {item.origin}
                              </Text>
                            )}
                            {/* 规格和强度同排 */}
                            {(item.size || item.strength) && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {item.size && (
                                  <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                                    {item.size}
                                  </Text>
                                )}
                                {item.size && item.strength && (
                                  <Text style={{ color: '#9ca3af', fontSize: '12px' }}>•</Text>
                                )}
                                {item.strength && (
                                  <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                                    {strengthMap[item.strength] || item.strength}
                                  </Text>
                                )}
                              </div>
                            )}
                            {/* 风味特征 */}
                            {flavorNotes.length > 0 && (
                              <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                                {flavorNotes.join('、')}
                              </Text>
                            )}
                          </div>

                          {/* 价格、数量控制器和删除 */}
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between'
                          }}>
                            <div style={{ color: '#FFD700', fontWeight: 'bold' }}>
                              RM {item.price}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {/* 数量调整 */}
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                border: '1px solid rgba(255, 215, 0, 0.3)',
                                borderRadius: '6px',
                                padding: '2px 4px'
                              }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const currentQty = quantities[item.id] || 0
                                    if (currentQty > 1) {
                                      setQuantity(item.id, currentQty - 1)
                                    } else if (currentQty === 1) {
                                      // 当数量为1时，点击减号提示确认移除
                                      setConfirmRemove({
                                        visible: true,
                                        itemId: item.id,
                                        itemName: item.name
                                      })
                                    }
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#FFD700',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    fontSize: '16px',
                                    lineHeight: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: '24px',
                                    height: '24px'
                                  }}
                                >
                                  −
                                </button>
                                <span style={{ 
                                  color: '#ffffff', 
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  minWidth: '24px', 
                                  textAlign: 'center',
                                  lineHeight: '24px'
                                }}>
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => addToCart(item.id)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#FFD700',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    fontSize: '16px',
                                    lineHeight: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: '24px',
                                    height: '24px'
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </List.Item>
                )
              }}
            />
              )}
            </>
          ) : (
            // 结算模式
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 订单摘要 */}
              <div>
                <h3 style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#fff' 
                }}>
                  订单摘要
                </h3>
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  borderRadius: '8px', 
                  padding: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {cartItems.map((item) => (
                    <div 
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
                          {item.name}
                        </div>
                        <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                          {item.size && `${item.size} • `}
                          {item.strength && (strengthMap[item.strength] || item.strength)}
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        marginLeft: '16px'
                      }}>
                        <span style={{ color: '#999', fontSize: '12px' }}>
                          ×{item.quantity}
                        </span>
                        <span style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '14px', minWidth: '60px', textAlign: 'right' }}>
                          RM {item.price * item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 配送方式选择 */}
              <div>
                <h3 style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#fff' 
                }}>
                  配送方式
                </h3>
                <Button.Group style={{ width: '100%', display: 'flex', marginBottom: '12px' }}>
                  <Button
                    type={deliveryMethod === 'address' ? 'primary' : 'default'}
                    onClick={() => {
                      setDeliveryMethod('address')
                      setSelectedEventId(null)
                    }}
                    style={{
                      flex: 1,
                      height: '44px',
                      fontSize: '14px',
                      background: deliveryMethod === 'address'
                        ? 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)' 
                        : 'rgba(255, 255, 255, 0.03)',
                      border: deliveryMethod === 'address'
                        ? 'none' 
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      color: deliveryMethod === 'address' ? '#000' : '#fff',
                      fontWeight: deliveryMethod === 'address' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      zIndex: 1
                    }}
                  >
                    送货上门
                  </Button>
                  <Button
                    type={deliveryMethod === 'event' ? 'primary' : 'default'}
                    onClick={() => {
                      setDeliveryMethod('event')
                      setSelectedAddressId(null)
                    }}
                    style={{
                      flex: 1,
                      height: '44px',
                      fontSize: '14px',
                      background: deliveryMethod === 'event'
                        ? 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)' 
                        : 'rgba(255, 255, 255, 0.03)',
                      border: deliveryMethod === 'event'
                        ? 'none' 
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      color: deliveryMethod === 'event' ? '#000' : '#fff',
                      fontWeight: deliveryMethod === 'event' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      zIndex: 1
                    }}
                  >
                    活动现场领取
                  </Button>
                </Button.Group>

                {/* 地址选择 */}
                {deliveryMethod === 'address' && (
                  <div style={{ marginBottom: '12px' }}>
                    <AddressSelector
                      value={selectedAddressId || undefined}
                      onChange={(addressId) => setSelectedAddressId(addressId)}
                      allowCreate={true}
                      showSelect={false}
                    />
                  </div>
                )}

                {/* 活动选择 */}
                {deliveryMethod === 'event' && (
                  <div style={{ marginBottom: '12px' }}>
                    <Select
                      value={selectedEventId || undefined}
                      onChange={(eventId) => setSelectedEventId(eventId)}
                      placeholder="请选择活动"
                      style={{ width: '100%' }}
                      loading={availableEvents.length === 0}
                      className="dark-theme-form"
                      dropdownClassName="dark-theme-form"
                    >
                      {availableEvents.map(event => (
                        <Select.Option key={event.id} value={event.id}>
                          {event.title} - {event.location.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>

              {/* 支付方式 */}
              <div>
                <h3 style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#fff' 
                }}>
                  支付方式
                </h3>
                <Button.Group style={{ width: '100%', display: 'flex' }}>
                  <Button
                    type={paymentMethod === 'cash' ? 'primary' : 'default'}
                    onClick={() => setPaymentMethod('cash')}
                    style={{
                      flex: 1,
                      height: '44px',
                      fontSize: '14px',
                      background: paymentMethod === 'cash' 
                        ? 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)' 
                        : 'rgba(255, 255, 255, 0.03)',
                      border: paymentMethod === 'cash' 
                        ? 'none' 
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      color: paymentMethod === 'cash' ? '#000' : '#fff',
                      fontWeight: paymentMethod === 'cash' ? 'bold' : 'normal'
                    }}
                  >
                    现金支付
                  </Button>
                  <Button
                    type={paymentMethod === 'online' ? 'primary' : 'default'}
                    onClick={() => setPaymentMethod('online')}
                    style={{
                      flex: 1,
                      height: '44px',
                      fontSize: '14px',
                      background: paymentMethod === 'online' 
                        ? 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)' 
                        : 'rgba(255, 255, 255, 0.03)',
                      border: paymentMethod === 'online' 
                        ? 'none' 
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      color: paymentMethod === 'online' ? '#000' : '#fff',
                      fontWeight: paymentMethod === 'online' ? 'bold' : 'normal'
                    }}
                  >
                    在线支付
                  </Button>
                </Button.Group>
              </div>

              <Divider style={{ margin: '8px 0', borderColor: 'rgba(255, 215, 0, 0.2)' }} />
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        {mode === 'cart' && cartItems.length > 0 && (
          <div style={{
            padding: '11px 14px',
            borderTop: '1px solid rgba(255, 215, 0, 0.2)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.3)'
          }}>
            {/* 总计 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '11px',
              width: '100%'
            }}>
              <span style={{ fontSize: '11px', color: '#c0c0c0' }}>总计：</span>
              <span style={{ fontSize: '17px', color: '#F4AF25', fontWeight: 'bold' }}>
                RM {cartTotal.toFixed(2)}
              </span>
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <Button
                type="primary"
                onClick={handleCheckout}
                style={{
                  background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
                  border: 'none',
                  color: '#000',
                  fontWeight: 'bold',
                  width: '100%',
                  height: '31px',
                  fontSize: '11px'
                }}
              >
                去结算
              </Button>
            </div>
          </div>
        )}

        {/* 结算模式底部操作栏 */}
        {mode === 'checkout' && cartItems.length > 0 && (
          <div style={{
            padding: '11px 14px',
            borderTop: '1px solid rgba(255, 215, 0, 0.2)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.3)'
          }}>
            {/* 总计 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '11px',
              width: '100%'
            }}>
              <span style={{ fontSize: '11px', color: '#c0c0c0' }}>总计：</span>
              <span style={{ fontSize: '17px', color: '#F4AF25', fontWeight: 'bold' }}>
                RM {cartTotal.toFixed(2)}
              </span>
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <Button
                onClick={() => setMode('cart')}
                style={{
                  flex: 1,
                  height: '31px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '500'
                }}
              >
                返回
              </Button>
              <Button
                type="primary"
                onClick={handleConfirmCheckout}
                style={{
                  flex: 2,
                  height: '31px',
                  background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
                  border: 'none',
                  color: '#000',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
              >
                确认结算
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>

    {/* 确认移除对话框 */}
    <Modal
      title="确认移除商品？"
      open={confirmRemove.visible}
      onOk={handleConfirmRemove}
      onCancel={handleCancelRemove}
      okText="确认"
      cancelText="取消"
      centered
      zIndex={3000}
      okButtonProps={{
        style: {
          background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
          border: 'none',
          color: '#000',
          fontWeight: 'bold'
        }
      }}
      cancelButtonProps={{
        style: {
          border: '1px solid rgba(244, 175, 37, 0.6)',
          background: 'rgba(255, 255, 255, 0.1)',
          color: '#ffffff'
        }
      }}
      styles={{
        ...getModalThemeStyles(isMobile, true),
        mask: {
          ...(getModalThemeStyles(isMobile, true)?.mask || {}),
          zIndex: 2999
        },
        wrapper: {
          zIndex: 3000
        }
      }}
      getContainer={document.body}
    >
      <p style={{ 
        color: '#FFFFFF', 
        fontSize: '14px',
        margin: 0,
        lineHeight: '1.6'
      }}>
        确定要从购物车中移除 <span style={{ color: '#F4AF25', fontWeight: '600' }}>"{confirmRemove.itemName}"</span> 吗？
      </p>
    </Modal>
    </>
  )
}

