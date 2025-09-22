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
    <div style={{ padding: '24px' }}>
      <Title level={2}>雪茄商店</Title>
      <Paragraph type="secondary">
        精选世界顶级雪茄，品质保证，专业存储
      </Paragraph>

      <Row gutter={[16, 16]}>
        {cigars.map((cigar) => (
          <Col span={6} key={cigar.id}>
            <Card
              hoverable
              cover={
                <div style={{ height: 200, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingCartOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                </div>
              }
              actions={[
                <Space>
                  <InputNumber
                    min={1}
                    max={(cigar as any)?.inventory?.stock || 99}
                    value={quantities[cigar.id] || 1}
                    onChange={(v) => setQuantity(cigar.id, Number(v) || 1)}
                    size="small"
                  />
                  <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => {
                    addToCart(cigar.id, quantities[cigar.id] || 1)
                    // eslint-disable-next-line no-alert
                    alert(`已加入购物车：${cigar.name} x ${quantities[cigar.id] || 1}`)
                  }}>
                    加入购物车
                  </Button>
                </Space>,
                <Button icon={<HeartOutlined />} type={wishlist[cigar.id] ? 'primary' : 'default'} onClick={() => toggleWishlist(cigar.id)}>
                  收藏
                </Button>
              ]}
            >
              <Card.Meta
                title={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <Text strong style={{ fontSize: '16px' }}>{cigar.name}</Text>
                    </div>
                    <div>
                      <Tag color="blue">{cigar.brand}</Tag>
                      <Tag color={getStrengthColor(cigar.strength)}>
                        {getStrengthText(cigar.strength)}
                      </Tag>
                    </div>
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                      {cigar.description}
                    </Paragraph>
                    
                    <div>
                      <Text>产地：{cigar.origin}</Text>
                    </div>
                    
                    <div>
                      <Text>尺寸：{cigar.size}</Text>
                    </div>
                    
                    <div>
                      <Text>库存：{(cigar as any)?.inventory?.stock ?? 0} 支</Text>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong style={{ fontSize: '18px', color: '#f5222d' }}>
                          ¥{cigar.price}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary">
                          ★ {(cigar as any)?.metadata?.rating ?? '-'} ({(cigar as any)?.metadata?.reviews ?? 0}评价)
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
