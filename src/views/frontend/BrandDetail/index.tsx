// 品牌详情页面组件
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Typography, Button, Space, Rate, Avatar, Spin, message, Modal } from 'antd'
import { 
  ArrowLeftOutlined, 
  ShoppingCartOutlined,
  StarFilled
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { getBrandById, getCigarsByBrand } from '../../../services/firebase/firestore'
import { useCartStore } from '../../../store/modules'
import { CartModal } from '../../../components/common/CartModal'
import { getModalThemeStyles } from '../../../config/modalTheme'
import type { Brand, Cigar } from '../../../types'

const { Title, Paragraph, Text } = Typography

const DEFAULT_CIGAR_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjQwIiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2lnYXI8L3RleHQ+Cjwvc3ZnPgo='

const BrandDetail: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { brandId } = useParams<{ brandId: string }>()
  
  const [brand, setBrand] = useState<Brand | null>(null)
  const [products, setProducts] = useState<Cigar[]>([])
  const [loading, setLoading] = useState(true)
  const [cartModalVisible, setCartModalVisible] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<{
    visible: boolean
    itemId: string | null
    itemName: string | null
  }>({
    visible: false,
    itemId: null,
    itemName: null
  })
  const { addToCart, quantities, setQuantity, removeFromCart, clearCart } = useCartStore()
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  


  useEffect(() => {
    const loadBrandData = async () => {
      if (!brandId) return
      
      setLoading(true)
      try {
        const brandData = await getBrandById(brandId)
        
        if (brandData) {
          setBrand(brandData)
          // 如果获取到品牌数据，使用品牌名称查询产品
          const cigarsData = await getCigarsByBrand(brandData.name)
          setProducts(cigarsData)
        } else {
          // 如果品牌不存在，设置为null以显示错误页面
          setBrand(null)
          setProducts([])
        }
      } catch (error) {
        message.error(t('brand.loadFailed'))
        setBrand(null)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    loadBrandData()
  }, [brandId])

  // 计算购物车总数量和总价
  const cartItemCount = Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
  const cartTotal = Object.entries(quantities).reduce((sum, [id, qty]) => {
    const cigar = products.find(c => c.id === id)
    return sum + (cigar ? cigar.price * qty : 0)
  }, 0)

  // 购物车商品列表
  const cartItems = Object.entries(quantities)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => {
      const cigar = products.find(c => c.id === id)
      return cigar ? { ...cigar, quantity: qty } : null
    })
    .filter(Boolean) as (Cigar & { quantity: number })[]

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)'
      }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!brand) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Title level={2} style={{ color: '#FFD700', marginBottom: '16px' }}>
            品牌未找到
          </Title>
          <Paragraph style={{ color: '#d1d5db', marginBottom: '24px' }}>
            抱歉，您访问的品牌不存在或已被删除。
          </Paragraph>
          <Button 
            type="primary"
            onClick={() => navigate('/shop')}
            style={{
              background: 'linear-gradient(to right, #FFD700, #B8860B)',
              border: 'none',
              color: '#000000',
              fontWeight: 'bold'
            }}
          >
            返回商城
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      height: '85vh',
      overflow: 'hidden'
    }}>
      {/* 顶部导航栏 */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backdropFilter: 'blur(10px)',
        paddingBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ color: '#FFD700', marginRight: '16px' }}
        />
        <Title 
          level={3} 
          style={{ 
            margin: 0, 
            flex: 1, 
            textAlign: 'center',
            background: 'linear-gradient(to right, #FFD700, #B8860B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          {brand?.name || '高希霸'}
        </Title>
        <div style={{ width: '32px' }} />
      </div>

      {/* 主要内容 - 可滚动区域 */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: '140px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 品牌Logo和历史信息合并卡片 */}
          <Card style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}
          bodyStyle={{ padding: '16px' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '20px',
              alignItems: 'flex-start'
            }}>
              {/* 左侧：品牌Logo */}
              <div style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: isMobile ? '60px' : '160px',
                  height: isMobile ? '60px' : '160px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img 
                    alt={`${brand?.name || '品牌'} Logo`}
                    src={brand?.logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgdmlld0JveD0iMCAwIDE2MCAxNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIiBmaWxsPSIjMzMzMzMzIi8+CjxjaXJjbGUgY3g9IjgwIiBjeT0iODAiIHI9IjUwIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjgwIiB5PSI4NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TG9nbzwvdGV4dD4KPC9zdmc+'}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>

              {/* 右侧：品牌历史信息 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Paragraph style={{ 
                  color: '#d1d5db', 
                  lineHeight: 1.6, 
                  margin: 0,
                  fontSize: '14px'
                }}>
                  {brand?.description || `${brand?.name || '该品牌'}成立于${brand?.foundedYear || '未知年份'}，来自${brand?.country || '未知国家'}。${brand?.metadata?.tags?.length ? `标签：${brand.metadata.tags.join('、')}` : ''}`}
                </Paragraph>
              </div>
            </div>
          </Card>

          {/* 代表性产品 */}
          <Card style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}
          bodyStyle={{ padding: '12px 16px' }}>
            <Title level={4} style={{
              marginTop: 0,
              marginBottom: '12px',
              background: 'linear-gradient(to right, #FFD700, #B8860B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {t('inventory.representativeProducts')}
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {products.length > 0 ? (
                products.map((cigar) => {
                  // 获取风味特征（合并所有品吸笔记）
                  const flavorNotes = cigar.tastingNotes 
                    ? [
                        ...(cigar.tastingNotes.foot || []),
                        ...(cigar.tastingNotes.body || []),
                        ...(cigar.tastingNotes.head || [])
                      ].filter(Boolean)
                    : [];
                  
                  // 强度翻译
                  const strengthMap: Record<string, string> = {
                    'mild': t('inventory.mild') || '温和',
                    'mild-medium': t('inventory.mildMedium') || '温和-中等',
                    'medium': t('inventory.medium') || '中等',
                    'medium-full': t('inventory.mediumFull') || '中等-浓郁',
                    'full': t('inventory.full') || '浓郁'
                  };
                  
                  return (
                    <div key={cigar.id} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <Title level={5} style={{ color: '#ffffff', margin: 0 }}>
                        {cigar.name}
                      </Title>
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '16px'
                      }}>
                        <img 
                          alt={cigar.name}
                          src={cigar.images?.[0] || DEFAULT_CIGAR_IMAGE}
                          style={{
                            width: '60px',
                            height: '100px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '2px solid #B8860B',
                            flexShrink: 0
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {/* 产地 */}
                          {cigar.origin && (
                            <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                              {cigar.origin}
                            </Text>
                          )}
                          {/* 规格和强度同排 */}
                          {(cigar.size || cigar.strength) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {cigar.size && (
                                <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                                  {cigar.size}
                                </Text>
                              )}
                              {cigar.size && cigar.strength && (
                                <Text style={{ color: '#9ca3af', fontSize: '12px' }}>•</Text>
                              )}
                              {cigar.strength && (
                                <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                                  {strengthMap[cigar.strength] || cigar.strength}
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
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          marginTop: '8px'
                        }}>
                          <div style={{ color: '#FFD700', fontWeight: 'bold' }}>
                            RM{cigar.price || 0}
                          </div>
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
                                const currentQty = quantities[cigar.id] || 0
                                if (currentQty > 1) {
                                  setQuantity(cigar.id, currentQty - 1)
                                } else if (currentQty === 1) {
                                  // 当数量为1时，点击减号提示确认移除
                                  setConfirmRemove({
                                    visible: true,
                                    itemId: cigar.id,
                                    itemName: cigar.name
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
                              {quantities[cigar.id] || 0}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                addToCart(cigar.id)
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
                              +
                            </button>
                          </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '24px', 
                  color: '#9ca3af' 
                }}>
                  <Text style={{ color: '#9ca3af' }}>
                    暂无产品信息
                  </Text>
                </div>
              )}
            </div>
          </Card>

          {/* 客户评价 - 已隐藏 */}
          {/* <Card style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}
          bodyStyle={{ padding: '12px 16px' }}>
            <Title level={4} style={{
              marginTop: 0,
              marginBottom: '12px',
              background: 'linear-gradient(to right, #FFD700, #B8860B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {t('inventory.customerReviews')}
            </Title>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <Rate 
                disabled 
                value={brand?.metadata?.rating || 0} 
                style={{ color: '#fbbf24' }}
              />
              <Text style={{ marginLeft: '8px', color: '#f0e68c', fontWeight: 'bold' }}>
                {brand?.metadata?.rating?.toFixed(1) || '0.0'}
              </Text>
              <Text style={{ marginLeft: '4px', color: '#9ca3af', fontSize: '14px' }}>
                ({brand?.metadata?.totalSales || 0} 条评价)
              </Text>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {brand?.metadata?.rating && brand.metadata.rating > 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '24px', 
                  color: '#d1d5db' 
                }}>
                  <Text style={{ color: '#d1d5db', lineHeight: 1.6 }}>
                    {brand.metadata.rating >= 4.5 ? 
                      `${brand.name}品牌获得了客户的高度认可，平均评分${brand.metadata.rating.toFixed(1)}分，共收到${brand.metadata.totalSales || 0}条评价。` :
                      brand.metadata.rating >= 3.5 ?
                      `${brand.name}品牌在客户中获得了良好评价，平均评分${brand.metadata.rating.toFixed(1)}分。` :
                      `${brand.name}品牌正在努力提升客户满意度，当前评分${brand.metadata.rating.toFixed(1)}分。`
                    }
                  </Text>
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '24px', 
                  color: '#9ca3af' 
                }}>
                  <Text style={{ color: '#9ca3af' }}>
                    暂无客户评价
                  </Text>
                </div>
              )}
            </div>
          </Card> */}
        </div>
      </div>

      {/* 底部购物车操作栏 - 仅手机端显示 */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: '60px',
          left: 0,
          right: 0,
          padding: '12px 16px',
          zIndex: 100,
          pointerEvents: 'none'
        }}>
          {cartItemCount === 0 ? (
            // 空状态：显示购物车图标按钮
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              pointerEvents: 'auto'
            }}>
              <Button
                style={{
                  background: 'rgba(100, 100, 100, 0.8)',
                  backdropFilter: 'blur(8px)',
                  border: 'none',
                  borderRadius: '24px',
                  padding: '12px 24px',
                  height: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                }}
                onClick={() => setCartModalVisible(true)}
              >
                <ShoppingCartOutlined style={{ fontSize: '18px', color: '#fff' }} />
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>
                  0 item
                </span>
              </Button>
            </div>
          ) : (
            // 有商品状态：显示完整购物车底栏
            <button
              onClick={() => setCartModalVisible(true)}
              style={{
                padding: '16px 20px',
                borderRadius: 16,
                background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
                color: '#221c10',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
                boxShadow: '0 8px 24px rgba(244, 175, 37, 0.6)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pointerEvents: 'auto',
                border: 'none'
              }}
            >
              {/* 左侧：购物车图标和数量 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <ShoppingCartOutlined style={{ fontSize: '24px' }} />
                <span style={{ fontSize: '16px', fontWeight: '600' }}>
                  {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* 右侧：总价 */}
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                RM {cartTotal.toFixed(2)}
              </div>
            </button>
          )}
        </div>
      )}

      {/* 购物车弹窗 */}
      <CartModal
        open={cartModalVisible}
        onClose={() => setCartModalVisible(false)}
        cartItems={cartItems}
        quantities={quantities}
        cartItemCount={cartItemCount}
        cartTotal={cartTotal}
        setQuantity={setQuantity}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        isMobile={isMobile}
        t={t}
      />

      {/* 确认移除对话框 */}
      <Modal
        title="确认移除商品？"
        open={confirmRemove.visible}
        onOk={() => {
          if (confirmRemove.itemId) {
            removeFromCart(confirmRemove.itemId)
          }
          setConfirmRemove({ visible: false, itemId: null, itemName: null })
        }}
        onCancel={() => {
          setConfirmRemove({ visible: false, itemId: null, itemName: null })
        }}
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
    </div>
  )
}

export default BrandDetail
