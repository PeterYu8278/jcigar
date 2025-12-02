// 通用购物车弹窗组件
import React, { useState } from 'react'
import { Modal, Button, List, Typography } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import { getModalThemeStyles, getModalWidth } from '../../config/modalTheme'
import type { Cigar } from '../../types'
import { CigarRatingBadge } from './CigarRatingBadge'

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
  isMobile,
  t,
  onCheckout
}) => {
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
    onClose()
    if (onCheckout) {
      onCheckout()
    }
    // TODO: 跳转到结账页面
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
            color: '#F4AF25'
          }}>
            <ShoppingCartOutlined style={{ marginRight: '8px' }} />
            购物车 ({cartItemCount} 件商品)
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
          padding: '8px 0',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
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
        </div>

        {/* 底部操作栏 */}
        {cartItems.length > 0 && (
          <div style={{
            padding: '8px',
            borderTop: '1px solid rgba(255, 215, 0, 0.2)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {/* 总计 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              width: '100%',
              maxWidth: '300px'
            }}>
              <span style={{ fontSize: '16px', color: '#c0c0c0' }}>总计：</span>
              <span style={{ fontSize: '24px', color: '#F4AF25', fontWeight: 'bold' }}>
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
                  minWidth: '120px'
                }}
              >
                去结算
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

