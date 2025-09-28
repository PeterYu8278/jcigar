// 商品导航页面
import React, { useEffect, useState } from 'react'
import { Input, Slider, Button } from 'antd'
import { SearchOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import type { Cigar } from '../../../types'
import { getCigars } from '../../../services/firebase/firestore'
import { useCartStore } from '../../../store/modules'
import { useTranslation } from 'react-i18next'

const Shop: React.FC = () => {
  const { t } = useTranslation()
  const [cigars, setCigars] = useState<Cigar[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedOrigin, setSelectedOrigin] = useState<string>('all')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000])
  const { addToCart, toggleWishlist, wishlist } = useCartStore()

  // 品牌数据 - 从实际雪茄数据中提取
  const brands = cigars.reduce((acc, cigar) => {
    const existingBrand = acc.find(brand => brand.name === cigar.brand)
    if (!existingBrand) {
      acc.push({
        name: cigar.brand,
        image: cigar.images?.[0] || 'https://via.placeholder.com/100x100?text=Brand'
      })
    }
    return acc
  }, [] as Array<{ name: string; image: string }>)

  const popularBrands = brands.slice(0, 8) // 取前8个品牌作为热门品牌

  const origins = ['all', '古巴', '新世界']

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

  return (
    <div style={{ padding: '24px' }}>
      {/* 顶部标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ 
          fontSize: '22px', 
          fontWeight: 800, 
          backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', 
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
          {brands.map((brand, index) => (
            <div key={index} style={{ 
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
                  backgroundImage: `url(${brand.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
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
          ))}
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
          {popularBrands.map((brand, index) => (
            <div key={index} style={{ 
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
                  backgroundImage: `url(${brand.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
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
          ))}
        </div>
      </div>
    </div>
  )
}

export default Shop
