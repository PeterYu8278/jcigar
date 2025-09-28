// 品牌详情页面组件
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Typography, Button, Space, Rate, Avatar, Spin, message } from 'antd'
import { 
  ArrowLeftOutlined, 
  PlusOutlined, 
  MinusOutlined,
  ShoppingCartOutlined,
  StarFilled
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { getBrandById, getCigarsByBrand } from '../../../services/firebase/firestore'
import type { Brand, Cigar } from '../../../types'

const { Title, Paragraph, Text } = Typography


const BrandDetail: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { brandId } = useParams<{ brandId: string }>()
  
  const [brand, setBrand] = useState<Brand | null>(null)
  const [products, setProducts] = useState<Cigar[]>([])
  const [loading, setLoading] = useState(true)
  const [cartItems, setCartItems] = useState<Record<string, number>>({})
  


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
        console.error('加载品牌数据失败:', error)
        message.error('加载品牌信息失败')
        setBrand(null)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    loadBrandData()
  }, [brandId])

  const handleQuantityChange = (productId: string, delta: number) => {
    setCartItems(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + delta)
    }))
  }

  const getTotalCartItems = () => {
    return Object.values(cartItems).reduce((sum, qty) => sum + qty, 0)
  }

  const handleAddToCart = () => {
    const totalItems = getTotalCartItems()
    if (totalItems === 0) {
      message.warning(t('inventory.pleaseSelectQuantity'))
      return
    }
    
    message.success(t('inventory.addedToCart', { count: totalItems }))
    // 这里可以添加实际的购物车逻辑
  }

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
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
      color: '#ffffff'
    }}>
      {/* 顶部导航栏 */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        padding: '16px',
        display: 'flex',
        alignItems: 'center'
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

      {/* 主要内容 */}
      <div style={{ padding: '16px', paddingBottom: '100px' }}>
        {/* 品牌横幅 */}
        <div style={{
          position: 'relative',
          height: '256px',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '24px'
        }}>
          <img 
            alt={`${brand?.name || '高希霸'}雪茄`}
            src={brand?.logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiBmaWxsPSIjMzMzMzMzIi8+CjxjaXJjbGUgY3g9IjEyOCIgY3k9IjEyOCIgcj0iODAiIGZpbGw9IiM2NjY2NjYiLz4KPHN2ZyB4PSI4OCIgeT0iODgiIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjOTk5OTk5Ij4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIi8+Cjwvc3ZnPgo8L3N2Zz4K'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px'
          }}>
            <Title level={2} style={{ color: '#ffffff', margin: 0 }}>
              {brand?.name?.toUpperCase() || 'COHIBA'}
            </Title>
            <Text style={{ color: '#f0e68c', fontSize: '14px' }}>
              {brand?.description || '古巴雪茄的巅峰之作'}
            </Text>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 品牌历史 */}
          <Card style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <Title level={4} style={{
              marginBottom: '12px',
              background: 'linear-gradient(to right, #FFD700, #B8860B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {t('inventory.brandHistory')}
            </Title>
            <Paragraph style={{ color: '#d1d5db', lineHeight: 1.6, margin: 0 }}>
              {brand?.description || '高希霸（Cohiba）是古巴最著名的雪茄品牌，成立于1966年。最初，它只为菲德尔·卡斯特罗和古巴政府高层官员秘密生产。直到1982年，高希霸才向公众市场推出，并迅速成为全球雪茄爱好者的终极追求。'}
            </Paragraph>
          </Card>

          {/* 品牌理念 */}
          <Card style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <Title level={4} style={{
              marginBottom: '12px',
              background: 'linear-gradient(to right, #FFD700, #B8860B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {t('inventory.brandPhilosophy')}
            </Title>
            <Paragraph style={{ color: '#d1d5db', lineHeight: 1.6, margin: 0 }}>
              高希霸代表着卓越与奢华。其烟叶均选自古巴比那尔德里奥省（Pinar del Río）的顶级烟草田，并经过独特的第三次发酵过程，这赋予了高希霸雪茄无与伦比的顺滑和复杂的风味。每一支高希霸雪茄都是由技艺最高超的卷烟师手工制作而成。
            </Paragraph>
          </Card>

          {/* 代表性产品 */}
          <Card style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <Title level={4} style={{
              marginBottom: '16px',
              background: 'linear-gradient(to right, #FFD700, #B8860B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {t('inventory.representativeProducts')}
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {products.length > 0 ? (
                products.map(cigar => ({
                  id: cigar.id,
                  name: cigar.name,
                  description: cigar.description || '优质雪茄产品',
                  image: cigar.images?.[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjQwIiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2lnYXI8L3RleHQ+Cjwvc3ZnPgo=',
                  price: cigar.price || 1000,
                  quantity: 0
                })).map((product) => (
                <div key={product.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <img 
                    alt={product.name}
                    src={product.image}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '2px solid #B8860B'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <Title level={5} style={{ color: '#ffffff', margin: 0 }}>
                      {product.name}
                    </Title>
                    <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                      {product.description}
                    </Text>
                    <div style={{ color: '#FFD700', fontWeight: 'bold', marginTop: '4px' }}>
                      RM{product.price}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Button
                      type="text"
                      icon={<MinusOutlined />}
                      onClick={() => handleQuantityChange(product.id, -1)}
                      style={{
                        background: 'linear-gradient(to right, #FFD700, #B8860B)',
                        color: '#000000',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    />
                    <span style={{ color: '#ffffff', fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>
                      {cartItems[product.id] || 0}
                    </span>
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      onClick={() => handleQuantityChange(product.id, 1)}
                      style={{
                        background: 'linear-gradient(to right, #FFD700, #B8860B)',
                        color: '#000000',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    />
                  </div>
                </div>
                ))
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

          {/* 客户评价 */}
          <Card style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <Title level={4} style={{
              marginBottom: '16px',
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
                value={4.9} 
                style={{ color: '#fbbf24' }}
              />
              <Text style={{ marginLeft: '8px', color: '#f0e68c', fontWeight: 'bold' }}>
                4.9
              </Text>
              <Text style={{ marginLeft: '4px', color: '#9ca3af', fontSize: '14px' }}>
                (1,288 条评价)
              </Text>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ 
                textAlign: 'center', 
                padding: '24px', 
                color: '#9ca3af' 
              }}>
                <Text style={{ color: '#9ca3af' }}>
                  暂无客户评价
                </Text>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 底部购物车按钮 */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.5), transparent)',
        zIndex: 10
      }}>
        <Button
          type="primary"
          size="large"
          onClick={handleAddToCart}
          style={{
            width: '100%',
            height: '48px',
            background: 'linear-gradient(to right, #FFD700, #B8860B)',
            border: 'none',
            borderRadius: '24px',
            color: '#000000',
            fontWeight: 'bold',
            fontSize: '16px',
            boxShadow: '0 4px 15px 0 rgba(255, 215, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>{t('inventory.addToCart')}</span>
          <div style={{ position: 'relative' }}>
            <ShoppingCartOutlined />
            {getTotalCartItems() > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '12px',
                borderRadius: '50%',
                height: '20px',
                width: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #000000'
              }}>
                {getTotalCartItems()}
              </span>
            )}
          </div>
        </Button>
      </div>
    </div>
  )
}

export default BrandDetail
