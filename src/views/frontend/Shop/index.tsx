// 商品导航页面
import React, { useEffect, useState } from 'react'
import { Input, Slider, Button } from 'antd'
import { SearchOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import type { Cigar, Brand } from '../../../types'
import { getCigars, getBrands } from '../../../services/firebase/firestore'
import { useCartStore } from '../../../store/modules'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const Shop: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [cigars, setCigars] = useState<Cigar[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedOrigin, setSelectedOrigin] = useState<string>('all')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000])
  const { addToCart, toggleWishlist, wishlist } = useCartStore()


  const origins = ['all', '古巴', '新世界']

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [cigarsData, brandsData] = await Promise.all([
          getCigars(),
          getBrands()
        ])
        setCigars(cigarsData)
        setBrands(brandsData)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div style={{ padding: '24px' }}>
      {/* 顶部标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ 
          fontSize: '22px', 
          fontWeight: 800, 
          background: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
          WebkitBackgroundClip: 'text', 
          color: 'transparent',
          margin: 0
        }}>
          商品导航
        </h1>
        
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '16px',
            transform: 'translateY(-50%)',
            color: '#999999',
            pointerEvents: 'none'
          }}>
            <SearchOutlined />
                </div>
          <Input
            placeholder={t('shop.searchBrand')}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{
              width: '100%',
              height: '48px',
              paddingLeft: '48px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              color: '#fff',
              fontSize: '16px'
            }}
          />
                    </div>
                    </div>

      {/* Filter Pills */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          overflowX: 'auto', 
          paddingBottom: '8px',
          marginBottom: '-8px'
        }}>
          {origins.map((origin) => (
            <button
              key={origin}
              onClick={() => setSelectedOrigin(origin)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '20px',
                whiteSpace: 'nowrap',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: selectedOrigin === origin 
                  ? 'linear-gradient(to right,#FDE08D,#C48D3A)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: selectedOrigin === origin ? '#111' : '#ccc'
              }}
            >
              {origin === 'all' ? '全部' : origin}
            </button>
          ))}
        </div>
                    </div>
                    
      {/* Price Range */}
      <div style={{ 
        padding: '16px', 
        background: 'rgba(255, 255, 255, 0.05)', 
        borderRadius: '12px', 
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ 
            fontWeight: 'bold', 
            color: '#fff', 
            margin: 0,
            fontSize: '16px'
          }}>
            价格范围
          </h3>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#F4AF25'
          }}>
            RM{priceRange[0]} - RM{priceRange[1]}
          </span>
                    </div>
                    
        <div style={{ marginBottom: '16px' }}>
          <Slider
            range
            min={0}
            max={2000}
            value={priceRange}
            onChange={(value) => setPriceRange(value as [number, number])}
            trackStyle={[{ background: '#F4AF25' }]}
            handleStyle={[{ 
              borderColor: '#F4AF25',
              background: '#F4AF25'
            }]}
            railStyle={{ background: '#4a4a4a' }}
          />
        </div>
                    </div>
                    
      {/* Recommended Brands */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          color: '#fff', 
          marginBottom: '16px'
        }}>
          推荐品牌
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '16px'
        }}>
          {loading ? (
            <div style={{ 
              gridColumn: '1 / -1', 
              textAlign: 'center', 
              padding: '24px', 
              color: '#9ca3af' 
            }}>
              加载中...
            </div>
          ) : brands.length > 0 ? (
            brands
              .filter(brand => brand.status === 'active')
              .slice(0, 8)
              .map((brand) => (
            <div key={brand.id} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '8px'
            }}>
              <div 
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  backgroundImage: `url(${brand.logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QnJhbmQ8L3RleHQ+Cjwvc3ZnPgo='})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                onClick={() => navigate(`/brand/${brand.id}`)}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
              <p style={{ 
                fontSize: '12px', 
                fontWeight: '500', 
                textAlign: 'center', 
                color: '#fff',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>
                {brand.name}
              </p>
            </div>
            ))
          ) : (
            <div style={{ 
              gridColumn: '1 / -1', 
              textAlign: 'center', 
              padding: '24px', 
              color: '#9ca3af' 
            }}>
              暂无品牌数据
            </div>
          )}
        </div>
                    </div>

      {/* Popular Brands */}
      <div>
        <h2 style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          color: '#fff', 
          marginBottom: '16px'
        }}>
          热门品牌
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '16px'
        }}>
          {loading ? (
            <div style={{ 
              gridColumn: '1 / -1', 
              textAlign: 'center', 
              padding: '24px', 
              color: '#9ca3af' 
            }}>
              加载中...
            </div>
          ) : brands.length > 8 ? (
            brands
              .filter(brand => brand.status === 'active')
              .slice(8, 16)
              .map((brand) => (
            <div key={brand.id} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '8px'
            }}>
              <div 
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  backgroundImage: `url(${brand.logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QnJhbmQ8L3RleHQ+Cjwvc3ZnPgo='})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                onClick={() => navigate(`/brand/${brand.id}`)}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
              <p style={{ 
                fontSize: '12px', 
                fontWeight: '500', 
                textAlign: 'center', 
                color: '#fff',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>
                {brand.name}
              </p>
            </div>
            ))
          ) : (
            <div style={{ 
              gridColumn: '1 / -1', 
              textAlign: 'center', 
              padding: '24px', 
              color: '#9ca3af' 
            }}>
              暂无更多品牌
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Shop