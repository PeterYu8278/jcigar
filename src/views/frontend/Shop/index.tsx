// 购买页面
import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Typography, Button, Tag, Space, InputNumber } from 'antd'
import { ShoppingCartOutlined, HeartOutlined } from '@ant-design/icons'
import type { Cigar } from '../../../types'
import { getCigars } from '../../../services/firebase/firestore'
import { useCartStore } from '../../../store/modules'
import { useTranslation } from 'react-i18next'

const { Title, Paragraph, Text } = Typography

const Shop: React.FC = () => {
  const { t } = useTranslation()
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
      case 'mild': return t('shop.mild')
      case 'medium': return t('shop.medium')
      case 'full': return t('shop.full')
      default: return t('shop.unknown')
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ margin: 10, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent'}}>{t('navigation.shop')}</Title>
      <Paragraph type="secondary">
        {t('shop.subtitle')}
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
                  }} style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#221c10' }}>
                    {t('shop.addToCart')}
                  </Button>
                </Space>,
                <Button icon={<HeartOutlined />} type={wishlist[cigar.id] ? 'primary' : 'default'} onClick={() => toggleWishlist(cigar.id)}>
                  {t('shop.wishlist')}
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
                      <Text>{t('shop.origin')}：{cigar.origin}</Text>
                    </div>
                    
                    <div>
                      <Text>{t('shop.size')}：{cigar.size}</Text>
                    </div>
                    
                    <div>
                      <Text>{t('shop.stock')}：{(cigar as any)?.inventory?.stock ?? 0} {t('shop.sticks')}</Text>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong style={{ fontSize: '18px', color: '#f5222d' }}>
                          RM{cigar.price}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary">
                          ★ {(cigar as any)?.metadata?.rating ?? '-'} ({(cigar as any)?.metadata?.reviews ?? 0}{t('shop.reviews')})
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
