// 品牌导航页面
import React, { useEffect, useState } from 'react'
import { Input, Button, Card, Row, Col, Typography, Spin } from 'antd'
import { SearchOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import type { Brand } from '../../../types'
import { getBrands } from '../../../services/firebase/firestore'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

const Shop: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const list = await getBrands()
        setBrands(list)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // 过滤品牌
  const filteredBrands = brands.filter(brand => 
    brand.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    brand.country.toLowerCase().includes(searchKeyword.toLowerCase())
  )

  return (
    <div style={{ padding: '24px' }}>
      {/* 顶部标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ color: '#FFD700', marginRight: '16px' }}
          />
          <Title level={3} style={{ margin: 0, color: '#f8f8f8' }}>{t('shop.title')}</Title>
        </div>
      </div>

      {/* 搜索栏 */}
      <div style={{ marginBottom: 24 }}>
        <Input
          placeholder={t('shop.searchBrand')}
          prefix={<SearchOutlined style={{ color: '#FFD700' }} />}
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          style={{
            background: 'rgba(30,30,30,0.8)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: '8px',
            color: '#f8f8f8'
          }}
        />
      </div>

      {/* 品牌列表 */}
      <div>
        <Title level={4} style={{ color: '#f8f8f8', marginBottom: 16 }}>
          品牌列表
        </Title>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Spin />
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {filteredBrands.map((brand) => (
              <Col xs={12} sm={8} md={6} lg={4} key={brand.id}>
                <Card
                  hoverable
                  onClick={() => navigate(`/brand/${brand.id}`)}
                  style={{
                    background: 'rgba(30,30,30,0.6)',
                    border: '1px solid rgba(255,215,0,0.2)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  bodyStyle={{
                    padding: '16px',
                    textAlign: 'center'
                  }}
                  cover={
                    <div style={{ padding: '16px' }}>
                      <img 
                        src={brand.logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QnJhbmQ8L3RleHQ+Cjwvc3ZnPgo='} 
                        alt={brand.name} 
                        style={{ 
                          width: '100%', 
                          height: '100px', 
                          objectFit: 'contain',
                          borderRadius: '8px'
                        }} 
                      />
                    </div>
                  }
                >
                  <Title level={5} style={{ color: '#f8f8f8', margin: '0 0 8px 0' }}>
                    {brand.name}
                  </Title>
                  <Text style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                    {brand.country}
                  </Text>
                  {brand.foundedYear && (
                    <Text style={{ color: '#9ca3af', fontSize: '12px', display: 'block' }}>
                      成立于 {brand.foundedYear}
                    </Text>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  )
}

export default Shop