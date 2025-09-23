// 购买页面
import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Typography, Button, Tag, Space, InputNumber } from 'antd'
import { ShoppingCartOutlined, HeartOutlined } from '@ant-design/icons'
import type { Cigar } from '../../../types'
import { getCigars } from '../../../services/firebase/firestore'
import { useCartStore } from '../../../store/modules'

const { Title, Paragraph, Text } = Typography

const Shop: React.FC = () => {
  const [cigars, setCigars] = useState<Cigar[]>([])
  const [loading, setLoading] = useState(false)
  const { quantities, setQuantity, addToCart, toggleWishlist, wishlist } = useCartStore()

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const list = await getCigars()
        setCigars(list)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'mild': return 'green'
      case 'medium': return 'orange'
      case 'full': return 'red'
      default: return 'default'
    }
  }

  const getStrengthText = (strength: string) => {
    switch (strength) {
      case 'mild': return '温和'
      case 'medium': return '中等'
      case 'full': return '浓郁'
      default: return '未知'
    }
  }

  return (
    <div style={{ padding: '0' }}>
      <div style={{ marginBottom: 20, padding: '0 4px' }}>
        <Title level={2} style={{ marginBottom: 8 }}>雪茄商店</Title>
        <Paragraph type="secondary" style={{ fontSize: 'clamp(13px, 3vw, 15px)', marginBottom: 0 }}>
          精选世界顶级雪茄，品质保证，专业存储
        </Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        {cigars.map((cigar) => (
          <Col xs={24} sm={12} lg={6} key={cigar.id}>
            <Card
              className="cigar-card"
              hoverable
              cover={
                <div style={{ 
                  height: 'clamp(150px, 25vw, 200px)', 
                  background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.9) 0%, rgba(45, 45, 45, 0.8) 100%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 215, 0, 0.2)'
                }}>
                  <ShoppingCartOutlined style={{ 
                    fontSize: 'clamp(36px, 8vw, 48px)', 
                    color: 'rgba(255, 215, 0, 0.6)',
                    filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.3))'
                  }} />
                </div>
              }
              actions={[
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <InputNumber
                      min={1}
                      max={(cigar as any)?.inventory?.stock || 99}
                      value={quantities[cigar.id] || 1}
                      onChange={(v) => setQuantity(cigar.id, Number(v) || 1)}
                      size="small"
                      style={{ width: '60px', height: '32px' }}
                    />
                    <Button 
                      type="primary" 
                      icon={<ShoppingCartOutlined />}
                      style={{
                        height: '36px',
                        background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#0a0a0a',
                        fontWeight: 600,
                        fontSize: '12px',
                        flex: 1
                      }}
                      onClick={() => {
                        addToCart(cigar.id, quantities[cigar.id] || 1)
                        // eslint-disable-next-line no-alert
                        alert(`已加入购物车：${cigar.name} x ${quantities[cigar.id] || 1}`)
                      }}
                    >
                      加入购物车
                    </Button>
                  </div>
                  <Button 
                    icon={<HeartOutlined />} 
                    type={wishlist[cigar.id] ? 'primary' : 'default'}
                    block
                    style={{
                      height: '32px',
                      fontSize: '12px',
                      ...(wishlist[cigar.id] ? {
                        background: 'rgba(255, 215, 0, 0.1)',
                        borderColor: '#ffd700',
                        color: '#ffd700'
                      } : {
                        borderColor: '#666',
                        color: '#c0c0c0'
                      })
                    }}
                    onClick={() => toggleWishlist(cigar.id)}
                  >
                    {wishlist[cigar.id] ? '已收藏' : '收藏'}
                  </Button>
                </div>
              ]}
            >
              <Card.Meta
                title={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Text strong style={{ fontSize: 'clamp(14px, 3.5vw, 16px)', lineHeight: 1.3 }}>
                      {cigar.name}
                    </Text>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <Tag color="blue" style={{ fontSize: '10px', padding: '2px 6px', margin: 0 }}>
                        {cigar.brand}
                      </Tag>
                      <Tag 
                        color={getStrengthColor(cigar.strength)} 
                        style={{ fontSize: '10px', padding: '2px 6px', margin: 0 }}
                      >
                        {getStrengthText(cigar.strength)}
                      </Tag>
                    </div>
                  </div>
                }
                description={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Paragraph 
                      ellipsis={{ rows: 2 }} 
                      style={{ 
                        margin: 0, 
                        fontSize: 'clamp(12px, 2.8vw, 14px)', 
                        lineHeight: 1.4,
                        marginBottom: 12
                      }}
                    >
                      {cigar.description}
                    </Paragraph>
                    
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Text style={{ fontSize: '12px', color: '#999', minWidth: '40px' }}>产地：</Text>
                        <Text style={{ fontSize: '12px', color: '#c0c0c0' }}>{cigar.origin}</Text>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Text style={{ fontSize: '12px', color: '#999', minWidth: '40px' }}>尺寸：</Text>
                        <Text style={{ fontSize: '12px', color: '#c0c0c0' }}>{cigar.size}</Text>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Text style={{ fontSize: '12px', color: '#999', minWidth: '40px' }}>库存：</Text>
                        <Text style={{ fontSize: '12px', color: (cigar as any)?.inventory?.stock > 0 ? '#52c41a' : '#ff4d4f' }}>
                          {(cigar as any)?.inventory?.stock ?? 0} 支
                        </Text>
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginTop: 12,
                      paddingTop: 8,
                      borderTop: '1px solid rgba(255, 215, 0, 0.1)'
                    }}>
                      <div>
                        <Text strong style={{ fontSize: 'clamp(16px, 4vw, 20px)', color: '#ffd700' }}>
                          ¥{cigar.price}
                        </Text>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Text type="secondary" style={{ fontSize: '10px' }}>
                          ★ {(cigar as any)?.metadata?.rating ?? '-'}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '9px' }}>
                          ({(cigar as any)?.metadata?.reviews ?? 0}评价)
                        </Text>
                      </div>
                    </div>
                  </Space>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default Shop
